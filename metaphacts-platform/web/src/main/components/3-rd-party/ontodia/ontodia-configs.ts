/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as SparqlJs from 'sparqljs';
import {
  RDFDataProvider,
  SparqlDataProvider,
  SparqlDataProviderSettings,
  DPDefinition,
  OWLStatsSettings,
  WikidataSettings,
  OWLRDFSSettings,
  DBPediaSettings,
  SparqlDataProviderOptions,
  LinkConfiguration,
  CompositeDataProvider,
  PropertyConfiguration
} from 'ontodia';

import { SparqlUtil } from 'platform/api/sparql';
import { getBaseUrl } from 'platform/api/http';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { FieldDefinition } from 'platform/components/forms';
import xsd from 'platform/api/rdf/vocabularies/xsd';

const ENDPOINT_URL = getBaseUrl() ? getBaseUrl() + '/sparql' : '/sparql';
export const RDF_DATA_PROVIDER_NAME = 'rdf';

/**
 * data provider defaults based on platform's UI configuration properties
 */
const platformDefaults: Partial<SparqlDataProviderSettings> = {
  dataLabelProperty: ConfigHolder.getUIConfig().labelPropertyPattern,
  schemaLabelProperty: ConfigHolder.getUIConfig().labelPropertyPattern,
};

function createDataProvider(
  params: {
    options: SparqlDataProviderOptions;
    repository: string;
    settings: SparqlDataProviderSettings;
  }
): SparqlDataProvider {
  const {repository, settings} = params;

  const options = {
    ...params.options,
    endpointUrl: `${ENDPOINT_URL}?repository=${repository}`,
  };

  return new OptimizingDataProvider(options, settings);
}


const SUPPORTED_CONFIGS = {
  'default': OWLStatsSettings,
  'nostats': OWLRDFSSettings,
  'wikidata': WikidataSettings,
  'dbpedia': DBPediaSettings,
};

export function getDataProvider(
  params: {
    configName: SupportedConfigName | undefined;
    options: SparqlDataProviderOptions;
    repositories: string[];
    settings: SparqlDataProviderSettings;
    createRDFStorage?: boolean;
    fields?: ReadonlyArray<FieldDefinition>;
    forceFields?: Map<string, FieldDefinition>;
  }
): SparqlDataProvider | CompositeDataProvider {
  const {
    configName, options, settings, repositories, createRDFStorage, fields, forceFields,
  } = params;

  let configSettings: SparqlDataProviderSettings;
  if (configName) {
    configSettings = SUPPORTED_CONFIGS[configName];
    if (!configSettings) {
      throw new Error(`Unknown Ontodia configuration '${configName}'`);
    }
  } else {
    configSettings = SUPPORTED_CONFIGS['default'];
  }

  // this is workaround for field-based navigation
  const fieldConfigDefaults = createFieldConfiguration(fields, forceFields);

  const effectiveSettings: SparqlDataProviderSettings = {
    ...configSettings,
    ...platformDefaults,
    ...fieldConfigDefaults,
    ...settings,
  };

  if (repositories.length === 1 && !createRDFStorage) {
    const repository = repositories[0];
    return createDataProvider({options, repository, settings: effectiveSettings});
  }

  const dataProviders: DPDefinition[] = repositories.map(repository => ({
    name: repository,
    dataProvider: createDataProvider({options, repository, settings: effectiveSettings}),
  }));

  if (createRDFStorage) {
    dataProviders.push({
      name: RDF_DATA_PROVIDER_NAME,
      dataProvider: new RDFDataProvider({data: [], parsers: {}}),
    });
  }

  return new CompositeDataProvider(dataProviders);
}

function createFieldConfiguration(
  fields?: ReadonlyArray<FieldDefinition>, forceFields?: Map<string, FieldDefinition>
): Partial<SparqlDataProviderSettings> {
  const linkConfigurations = createLinkConfigurations(fields);
  const propertyConfigurations = createPropertyConfiguration(fields, forceFields);

  let fieldConfigDefaults: Partial<SparqlDataProviderSettings> = {
    linkConfigurations, propertyConfigurations
  };
  if (linkConfigurations.length > 0) {
    fieldConfigDefaults = {
      ...fieldConfigDefaults, ...{
      linkTypesOfQuery: `
      SELECT DISTINCT ?link
        WHERE {
        \${linkConfigurations}
      }
      `,
      linkTypesStatisticsQuery: `
      SELECT ?link (count(distinct ?outObject) as ?outCount) (count(distinct ?inObject) as ?inCount)
        WHERE {
        \${linkConfigurations}
      } GROUP BY ?link
        `,
      linksInfoQuery: `SELECT ?source ?type ?target ?propType ?propValue
      WHERE {
        VALUES (?source) {\${ids}}
        VALUES (?target) {\${ids}}
        \${linkConfigurations}
      }
      `,
      elementInfoQuery: `
        CONSTRUCT {
            ?inst rdf:type ?class .
            ?inst rdfs:label ?label .
            ?inst ?propType ?propValue.
        } WHERE {
            VALUES (?inst) {\${ids}}
            OPTIONAL {?inst rdf:type ?class . }
            OPTIONAL {?inst \${dataLabelProperty} ?label}
            OPTIONAL {
              \${propertyConfigurations}
            }
        }
    `,
      }
    };
  }
  return fieldConfigDefaults;
}

export type SupportedConfigName = keyof typeof SUPPORTED_CONFIGS;

class OptimizingDataProvider extends SparqlDataProvider {
  executeSparqlQuery<Binding>(query: string) {
    const optimizedQuery = this.optimizeAndAddPrefixes(query);
    return super.executeSparqlQuery<Binding>(optimizedQuery);
  };

  executeSparqlConstruct(query: string) {
    const optimizedQuery = this.optimizeAndAddPrefixes(query);
    return super.executeSparqlConstruct(optimizedQuery);
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

function createLinkConfigurations(
  fields?: ReadonlyArray<FieldDefinition>
): LinkConfiguration[] {
  if (!fields || fields.length === 0) {
    return [];
  }
  return fields.filter(field => {
    // if it's non-literal field or at least have something in range
    return xsd.anyURI.equals(field.xsdDatatype);
  }).map(field => fieldToOntodiaConfig(field, '$source', '$target'));
}

function createPropertyConfiguration(
  fields?: ReadonlyArray<FieldDefinition>, forceFields?: Map<string, FieldDefinition>
): PropertyConfiguration[] {
  if (!fields || fields.length === 0) {
    return [];
  }
  return fields.filter(field => {
    // pass only literal values
    return (forceFields && forceFields.has(field.iri)) || !xsd.anyURI.equals(field.xsdDatatype);
  }).map(field => fieldToOntodiaConfig(field, '$subject', '$value'));
}

function fieldToOntodiaConfig(
  field: FieldDefinition,
  subjectReplacement: string,
  valueReplacement: string): {id: string, path: string} {
  const parsedQuery = SparqlUtil.parseQuery(field.selectPattern);
  if (parsedQuery.type === 'query' && parsedQuery.queryType === 'SELECT') {
    // 2. get where and construct new query
    const wherePart = parsedQuery.where;
    const simpleQuery: SparqlJs.SelectQuery = {
      type: 'query',
      queryType: 'SELECT',
      variables: ['*'],
      prefixes: {},
      where: wherePart
    };
    // 3. serialize query without prefixes
    const serializedQuery = SparqlUtil.serializeQuery(simpleQuery);

    // 4. rename vars
    let query = serializedQuery;
    query = query.replace(/\?subject/g, subjectReplacement);
    query = query.replace(/\?value/g, valueReplacement);

    // 5. extract just where
    const prefixLength = 'SELECT * WHERE { '.length;
    const path = query.substr(prefixLength, query.length - prefixLength - 2);
    return {
      id: field.iri,
      path,
    };
  }
}
