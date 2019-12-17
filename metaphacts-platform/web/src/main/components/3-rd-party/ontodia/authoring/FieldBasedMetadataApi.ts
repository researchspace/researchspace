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
import * as Immutable from 'immutable';
import {
  CancellationToken, ElementModel, ElementTypeIri, LinkTypeIri, MetadataApi, PropertyTypeIri,
  LinkModel, ElementIri, LinkDirection,
} from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { xsd } from 'platform/api/rdf/vocabularies';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { FieldDefinition, generateSubjectByTemplate } from 'platform/components/forms';

import { EntityMetadata, isObjectProperty } from './OntodiaEntityMetadata';
import { getEntityMetadata } from './OntodiaPersistenceCommon';

export class FieldBasedMetadataApi implements MetadataApi {

  constructor(
    private entityMetadata: Map<string, EntityMetadata>
  ) {}

  generateNewElementIri(types: ElementTypeIri[]): Promise<ElementIri> {
    let subjectTemplate: string = undefined;
    if (types && types.length !== 0) {
      const typeIri = types[0];
      const metadata = this.entityMetadata.get(typeIri);
      if (metadata) {
        subjectTemplate = metadata.newSubjectTemplate;
      }
    }

    let newIri: ElementIri;
    const uuid = () => Math.floor((1 + Math.random()) * 0x100000000).toString(16).substring(1);
    if (subjectTemplate) {
      const filledTemplate = generateSubjectByTemplate(subjectTemplate, undefined, undefined).value;
      const postfix = subjectTemplate.toLocaleLowerCase().indexOf('{{uuid}}') === -1 ? uuid() : '';
      newIri = `${filledTemplate}${postfix}` as ElementIri;
    } else {
      newIri = `NewEntity-${uuid()}` as ElementIri;
    }

    return Promise.resolve(newIri);
  }

  canDropOnCanvas(source: ElementModel, ct: CancellationToken): Promise<boolean> {
    return this.typesOfElementsDraggedFrom(source, ct).then(elementTypes =>
      elementTypes.length > 0
    );
  }

  canDropOnElement(
    source: ElementModel, target: ElementModel, ct: CancellationToken
  ): Promise<boolean> {
    return this.possibleLinkTypes(source, target, ct).then(types => types.length > 0);
  }

  possibleLinkTypes(
    source: ElementModel, target: ElementModel, ct: CancellationToken
  ): Promise<Array<{ linkTypeIri: LinkTypeIri, direction: LinkDirection }>> {

    return Promise.all([
      this.getPossibleLinkTypes(source, target, ct),
      this.getPossibleLinkTypes(target, source, ct),
    ]).then(([outgoingPossibleLinks, incomingPossibleLinks]) => {
      return outgoingPossibleLinks.map(linkTypeIri => ({
        linkTypeIri, direction: LinkDirection.out,
      })).concat(incomingPossibleLinks.map(linkTypeIri => ({
        linkTypeIri, direction: LinkDirection.in,
      })));
    });
  }

  private getPossibleLinkTypes(
    source: ElementModel, target: ElementModel, ct: CancellationToken
  ): Promise<LinkTypeIri[]> {
    return Promise.resolve().then(() => {
      const metadata = getEntityMetadata(source, this.entityMetadata);
      if (!metadata) { return Promise.resolve([]); }
      const queryStr = `
      select distinct ?field where {
        {
          ?sourceType rdfs:subClassOf* ?domain.
          FILTER (BOUND(?domain))
        }
        {
          ?targetType rdfs:subClassOf* ?range.
          FILTER (BOUND(?range))
        }
      }`;

      let query: SparqlJs.SelectQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(queryStr);

      query = addResourceFieldValues(metadata, query);
      query = addSourceTypesValues(query, source.types);
      query = addTargetTypesValues(query, target.types);

      return SparqlClient.select(query).map(res =>
        res.results.bindings.map(row => row.field.value as LinkTypeIri)
      ).toPromise();
    });
  }

  getPossibleIncomingFields(
    subject: ElementModel, ct: CancellationToken
  ): Promise<FieldDefinition[]> {
    return Promise.resolve().then(() => {
      const queryStr = `
        SELECT DISTINCT ?type WHERE {
            ?type rdfs:subClassOf* ?range.
            VALUES (?range) {
              ${subject.types.map(type => `(<${type}>)`).join(' ')}
            }
        }`;

      const query: SparqlJs.SelectQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(queryStr);

      return SparqlClient.select(query).map(res =>
        res.results.bindings.map(row => row.type.value as ElementTypeIri)
      ).map(targetTypes => {
        const incomingFields: FieldDefinition[] = [];
        this.entityMetadata.forEach(metadata => {
          metadata.fieldById.forEach(field => {
            for (const range of field.range) {
              if (targetTypes.indexOf(range.value as ElementTypeIri) !== -1) {
                incomingFields.push(field);
                break;
              }
            }
          });
        });
        return incomingFields;
      }).toPromise();
    });
  }

  typesOfElementsDraggedFrom(
    source: ElementModel, ct: CancellationToken
  ): Promise<ElementTypeIri[]> {
    return Promise.resolve().then(() => {
      const metadata = getEntityMetadata(source, this.entityMetadata);
      if (!metadata) { return Promise.resolve([]); }
      const queryStr = `
      select distinct ?creatableType where {
        {
          FILTER (BOUND(?range))
          ?creatableType rdfs:subClassOf* ?range .
        } UNION {
          FILTER (BOUND(?domain))
          ?creatableType rdfs:subClassOf* ?domain .
        }
      } group by ?creatableType`;

      let query: SparqlJs.SelectQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(queryStr);

      query = addResourceFieldValues(metadata, query);
      query = addSourceTypesValues(query, source.types);
      const creatableTypes = Array.from(this.entityMetadata.keys());

      query = SparqlClient.prepareParsedQuery(
        creatableTypes.map(type => ({'creatableType': Rdf.iri(type)}))
      )(query) as SparqlJs.SelectQuery;

      return SparqlClient.select(query).map(res =>
        res.results.bindings.map(row => row.creatableType.value as ElementTypeIri)
      ).toPromise();
    });
  }

  propertiesForType(type: ElementTypeIri, ct: CancellationToken): Promise<PropertyTypeIri[]> {
    return Promise.resolve([]);
  }

  canDeleteElement(element: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(element, this.entityMetadata);
    return Promise.resolve(Boolean(metadata));
  }

  filterConstructibleTypes(
    types: ReadonlySet<ElementTypeIri>, ct: CancellationToken
  ): Promise<ReadonlySet<ElementTypeIri>> {
    const constructibleTypes = new Set<ElementTypeIri>();
    this.entityMetadata.forEach((metadata, key: ElementTypeIri) => {
        if (types.has(key)) {
          constructibleTypes.add(key);
        }
      }
    );
    return Promise.resolve(constructibleTypes);
  }

  canEditElement(element: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(element, this.entityMetadata);
    return Promise.resolve(Boolean(metadata));
  }

  canLinkElement(element: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(element, this.entityMetadata);
    return Promise.resolve(Boolean(metadata));
  }

  canDeleteLink(
    link: LinkModel, source: ElementModel, target: ElementModel, ct: CancellationToken
  ): Promise<boolean> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    return Promise.resolve(Boolean(metadata) && metadata.fieldByIri.has(link.linkTypeId));
  }

  canEditLink(
    link: LinkModel, source: ElementModel, target: ElementModel, ct: CancellationToken
  ): Promise<boolean> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    return Promise.resolve(Boolean(metadata) && metadata.fieldByIri.has(link.linkTypeId));
  }
}

function addResourceFieldValues(
  metadata: EntityMetadata,
  query: SparqlJs.SelectQuery
) {
  const fieldValues: Array<{ [varName: string]: Rdf.Node }> = [];
  metadata.fieldByIri
    .filter(field => isObjectProperty(field, metadata))
    .forEach(field => {
      if (isNotNullOrEmpty(field.domain)) {
        field.domain.forEach( d => {
          if (isNotNullOrEmpty(field.range)) {
            field.range.forEach(  r => {
              fieldValues.push({ field: Rdf.iri(field.iri), domain: d, range: r });
            });
          } else {
            fieldValues.push({ field: Rdf.iri(field.iri), domain: d});
          }
        });
      } else if (isNotNullOrEmpty(field.range)) {
        field.range.forEach(  r => {
          fieldValues.push({ field: Rdf.iri(field.iri), range: r });
        });
      } else {
        fieldValues.push({field: Rdf.iri(field.iri)});
      }
  });
  const queryWithFields = SparqlClient.prepareParsedQuery(fieldValues)(query);
  return queryWithFields as SparqlJs.SelectQuery;
}

function addSourceTypesValues(query: SparqlJs.SelectQuery, types: ElementTypeIri[]) {
  return SparqlClient.prepareParsedQuery(
    types.map(type => ({'sourceType': Rdf.iri(type)}))
  )(query) as SparqlJs.SelectQuery as SparqlJs.SelectQuery;
}

function addTargetTypesValues(query: SparqlJs.SelectQuery, types: ElementTypeIri[]) {
  return SparqlClient.prepareParsedQuery(
    types.map(type => ({'targetType': Rdf.iri(type)}))
  )(query) as SparqlJs.SelectQuery;
}

function isNotNullOrEmpty(a: ReadonlyArray<Rdf.Iri>) {
  return a && a.length > 0;
}
