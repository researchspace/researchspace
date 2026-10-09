/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as SparqlJs from 'sparqljs';
import * as Reactodia from '@reactodia/workspace';

import { WrappingError } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlTypeGuards, VariableRenameBinder } from 'platform/api/sparql';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getBaseUrl } from 'platform/api/http';
import { FieldDefinition } from 'platform/components/forms';
import { xsd } from 'platform/api/rdf/vocabularies';

import { OwlStatsSettings, OwlNoStatsSettings, WikidataSettings } from './DataProviderProfiles';
import { RSOwlNoStatsSettings } from './RSOwlNoStatsSettings';

export const RDF_DATA_PROVIDER_NAME = 'rdf';

const LEGACY_ELEMENT_INFO_NAMESPACE = 'https://ontodia.org/context/v1.json/';
const REACTODIA_ELEMENT_INFO_NAMESPACE = 'urn:reactodia:sparql:';

const SUPPORTED_PROFILES = {
  default: OwlStatsSettings,
  nostats: OwlNoStatsSettings,
  rsnostats: RSOwlNoStatsSettings,
  wikidata: WikidataSettings,
};

export type SupportedConfigName = keyof typeof SUPPORTED_PROFILES;

export function createDataProvider(params: {
  configName?: SupportedConfigName;
  options: Reactodia.SparqlDataProviderOptions;
  settings: Reactodia.SparqlDataProviderSettings;
  repositories: string[];
  createRDFStorage?: boolean;
  fields?: ReadonlyArray<FieldDefinition>;
  forceFields?: ReadonlyMap<string, FieldDefinition>;
}): Reactodia.SparqlDataProvider | Reactodia.CompositeDataProvider {
  const { configName, options, settings, repositories, createRDFStorage, fields, forceFields } = params;

  let sparqlProfile: Reactodia.SparqlDataProviderSettings;
  if (configName) {
    sparqlProfile = SUPPORTED_PROFILES[configName];
    if (!sparqlProfile) {
      throw new Error(`Unknown Ontodia configuration '${configName}'`);
    }
  } else {
    sparqlProfile = SUPPORTED_PROFILES['default'];
  }

  sparqlProfile.dataLabelProperty = ConfigHolder.getUIConfig().labelPropertyPattern;

  const fieldConfigDefaults = createFieldConfiguration(fields, forceFields);

  const effectiveSettings = upgradeLegacyProviderSettings({
    ...sparqlProfile,
    ...fieldConfigDefaults,
    ...settings,
  });

  if (repositories.length === 1 && !createRDFStorage) {
    const [repository] = repositories;
    return new OptimizingDataProvider(
      {
        ...options,
        endpointUrl: getEndpointUrlForRepository(repository),
        factory: Rdf.DataFactory,
        // Prevent unbounded POST queries.
        chunk: options.chunk ?? { maxSize: 100, unit: 'itemCount' },
      },
      effectiveSettings
    );
  }

  const dataProviders = repositories.map((repository): Reactodia.DataProviderDefinition => ({
    name: repository,
    provider: new OptimizingDataProvider(
      {
        ...options,
        endpointUrl: getEndpointUrlForRepository(repository),
        chunk: options.chunk ?? { maxSize: 100, unit: 'itemCount' },
      },
      effectiveSettings
    ),
  }));

  if (createRDFStorage) {
    dataProviders.push({
      name: RDF_DATA_PROVIDER_NAME,
      provider: new Reactodia.RdfDataProvider({factory: Rdf.DataFactory}),
    });
  }

  return new Reactodia.CompositeDataProvider({providers: dataProviders});
}

/** Maps Ontodia's reserved query namespace to Reactodia's namespace. */
export function upgradeLegacyProviderSettings(
  settings: Reactodia.SparqlDataProviderSettings
): Reactodia.SparqlDataProviderSettings {
  const { elementInfoQuery } = settings;
  if (!elementInfoQuery || elementInfoQuery.indexOf(LEGACY_ELEMENT_INFO_NAMESPACE) < 0) {
    return settings;
  }
  return {
    ...settings,
    elementInfoQuery: elementInfoQuery.split(LEGACY_ELEMENT_INFO_NAMESPACE)
      .join(REACTODIA_ELEMENT_INFO_NAMESPACE),
  };
}

function getEndpointUrlForRepository(repository: string) {
  const baseEndpointUrl = getBaseUrl() ? getBaseUrl() + '/sparql' : '/sparql';
  return `${baseEndpointUrl}?repository=${repository}`;
}

function createFieldConfiguration(
  fields?: ReadonlyArray<FieldDefinition>,
  forceFields?: ReadonlyMap<string, FieldDefinition>
): Partial<Reactodia.SparqlDataProviderSettings> {
  const linkConfigurations = createLinkConfigurations(fields);
  const propertyConfigurations = createPropertyConfiguration(fields, forceFields);

  let fieldConfigDefaults: Partial<Reactodia.SparqlDataProviderSettings> = {
    linkConfigurations,
    propertyConfigurations,
  };
  if (linkConfigurations.length > 0) {
    fieldConfigDefaults = {
      ...fieldConfigDefaults,
      // Labels are supplied by prepareLabels.
      elementInfoQuery: `
        PREFIX ontodia: <urn:reactodia:sparql:>
        CONSTRUCT {
            ?inst ontodia:type ?class .
            ?inst ?propType ?propValue.
        } WHERE {
            VALUES (?inst) {\${ids}}
            OPTIONAL { ?inst a ?class }
            OPTIONAL {
              \${propertyConfigurations}
            }
        }
      `,
    };
  }
  return fieldConfigDefaults;
}

class OptimizingDataProvider extends Reactodia.SparqlDataProvider {
  executeSparqlSelect<Binding>(query: string, options?: { signal?: AbortSignal }) {
    const optimizedQuery = this.optimizeAndAddPrefixes(query);
    return super.executeSparqlSelect<Binding>(optimizedQuery, options);
  }

  executeSparqlConstruct(query: string, options?: { signal?: AbortSignal }) {
    const optimizedQuery = this.optimizeAndAddPrefixes(query);
    return super.executeSparqlConstruct(optimizedQuery, options);
  }

  private optimizeAndAddPrefixes(query: string): string {
    try {
      const parsedQuery = SparqlUtil.parseQuery(query);
      return SparqlUtil.serializeQuery(parsedQuery);
    } catch (err) {
      console.warn('Failed to optimize Ontodia query:');
      console.warn(query);
      console.warn(err);
      return query;
    }
  }
}

function createLinkConfigurations(fields?: ReadonlyArray<FieldDefinition>): Reactodia.LinkConfiguration[] {
  if (!fields || fields.length === 0) {
    return [];
  }
  return fields
    .filter((field) => {
      return xsd.anyURI.equals(field.xsdDatatype);
    })
    .map(fieldToLinkConfig);
}

function createPropertyConfiguration(
  fields?: ReadonlyArray<FieldDefinition>,
  forceFields?: ReadonlyMap<string, FieldDefinition>
): Reactodia.PropertyConfiguration[] {
  if (!fields || fields.length === 0) {
    return [];
  }
  return fields
    .filter((field) => {
      return (forceFields && forceFields.has(field.iri)) || !xsd.anyURI.equals(field.xsdDatatype);
    })
    .map(fieldToPropertyConfig);
}

function fieldToLinkConfig(field: FieldDefinition): Reactodia.LinkConfiguration {
  const parsedQuery = parseSelectPattern(field);
  const domain = field.domain ? field.domain.map((iri) => iri.value) : undefined;

  const directPredicate = parseDirectPredicate(parsedQuery.where);
  if (directPredicate) {
    return { id: field.iri, domain, path: directPredicate };
  }

  new VariableRenameBinder('subject', 'source').query(parsedQuery);
  new VariableRenameBinder('value', 'target').query(parsedQuery);

  return {
    id: field.iri,
    domain,
    path: serializePatterns(parsedQuery.where),
  };
}

function fieldToPropertyConfig(field: FieldDefinition): Reactodia.PropertyConfiguration {
  const parsedQuery = parseSelectPattern(field);
  const domain = field.domain ? field.domain.map((iri) => iri.value) : undefined;

  const directPredicate = parseDirectPredicate(parsedQuery.where);
  if (directPredicate) {
    return { id: field.iri, domain, path: directPredicate };
  }

  new VariableRenameBinder('subject', 'inst').query(parsedQuery);
  /* keep the same name for 'value' variable */

  return {
    id: field.iri,
    domain,
    path: serializePatterns(parsedQuery.where),
  };
}

function parseSelectPattern(field: FieldDefinition): SparqlJs.SelectQuery {
  if (!field.selectPattern) {
    throw new Error(`Expected a selectPattern for field: ${field.iri}`);
  }
  let parsedQuery: SparqlJs.SelectQuery;
  try {
    parsedQuery = SparqlUtil.parseQuery(field.selectPattern);
  } catch (err) {
    throw new WrappingError(`Failed to parse selectPattern for field: ${field.iri}`, err);
  }
  if (!(parsedQuery.type === 'query' && parsedQuery.queryType === 'SELECT')) {
    throw new Error(`Expected a SELECT query in selectPattern for field: ${field.iri}`);
  }
  return parsedQuery;
}

function serializePatterns(patterns: SparqlJs.Pattern[]): string {
  const simpleQuery: SparqlJs.SelectQuery = {
    type: 'query',
    queryType: 'SELECT',
    variables: ['*'],
    prefixes: {},
    where: patterns,
  };
  const query = SparqlUtil.serializeQuery(simpleQuery);
  const prefixLength = 'SELECT * WHERE { '.length;
  const serialized = query.substr(prefixLength, query.length - prefixLength - 2);
  return serialized;
}

function parseDirectPredicate(patterns: SparqlJs.Pattern[]): string | undefined {
  const { isIri } = SparqlTypeGuards;

  let predicate: SparqlJs.Term | undefined;
  for (const pattern of patterns) {
    switch (pattern.type) {
      case 'bgp':
        for (const t of pattern.triples) {
          const isPredicateTriple =
            /^[?$]subject$/.test(t.subject) && /^[?$]value$/.test(t.object) && isIri(t.predicate);
          const isLabelTriple = /^[?$]label$/.test(t.object);
          if (isPredicateTriple) {
            predicate = t.predicate as SparqlJs.Term;
          } else if (!isLabelTriple) {
            return undefined;
          }
        }
        break;
      case 'bind':
        break;
      default:
        return undefined;
    }
  }
  return predicate;
}
