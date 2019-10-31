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

import { xsd } from 'platform/api/rdf/vocabularies';
import { FieldDefinition } from 'platform/components/forms';

import { getEntityMetadata } from './AuthoringPersistence';
import { EntityMetadata } from './OntodiaEntityMetadata';
import {SparqlClient} from 'platform/api/sparql';
import { iri, Iri, Node } from 'platform/api/rdf/core/Rdf';
import {Dictionary, select} from 'platform/api/sparql/SparqlClient';
import {parseQuerySync} from 'platform/api/sparql/SparqlUtil';

export class FieldBasedMetadataApi implements MetadataApi {

  constructor(
    fields: ReadonlyArray<FieldDefinition>,
    private entityMetadata: Map<string, EntityMetadata>
  ) {
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
    return Promise.resolve().then(() => {
      const metadata = getEntityMetadata(source, this.entityMetadata);
      if (!metadata) { return Promise.resolve([]); }
      const queryStr = `
      select distinct ?field ?direction where {
        {
          ?sourceType rdfs:subClassOf* ?domain.
          FILTER (BOUND(?domain))
        }
        {
          ?targetType rdfs:subClassOf* ?range.
          FILTER (BOUND(?range))
        }
        BIND("out" as ?direction)
      }`;

      let query: SparqlJs.SelectQuery = parseQuerySync<SparqlJs.SelectQuery>(queryStr);

      query = addResourceFieldValues(metadata.fieldByIri, query);
      query = addSourceTypesValues(query, source.types);
      query = addTargetTypesValues(query, target.types);

      return select(query).map(res =>
        res.results.bindings.map(row => ({
          linkTypeIri: row.field.value as LinkTypeIri,
          direction: row.direction.value as LinkDirection,
        }))
      ).toPromise();
    });
  }

  typesOfElementsDraggedFrom(
    source: ElementModel, ct: CancellationToken
  ): Promise<ElementTypeIri[]> {
    return Promise.resolve().then(() => {
      const metadata = getEntityMetadata(source, this.entityMetadata);
      if (!metadata) { return Promise.resolve([]); }
      const queryStr = `
      select distinct ?creatableType ?field where {
        FILTER (BOUND(?range))
        ?creatableType rdfs:subClassOf* ?range .
      }`;

      let query: SparqlJs.SelectQuery = parseQuerySync<SparqlJs.SelectQuery>(queryStr);

      query = addResourceFieldValues(metadata.fieldByIri, query);
      query = addSourceTypesValues(query, source.types);
      const creatableTypes = Array.from(this.entityMetadata.keys());

      query = SparqlClient.prepareParsedQuery(
        creatableTypes.map(type => ({'creatableType': iri(type)}))
      )(query) as SparqlJs.SelectQuery;

      return select(query).map(res =>
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

  async generateNewElementIri() {
    function random32BitDigits() {
      return Math.floor((1 + Math.random()) * 0x100000000).toString(16).substring(1);
    }
    // generate by half because of restricted numerical precision
    const uuid = random32BitDigits() + random32BitDigits() + random32BitDigits() + random32BitDigits();
    return `http://ontodia.org/newEntity_${uuid}` as ElementIri;
  }
}

function addResourceFieldValues(
  fields: Immutable.Map<string, FieldDefinition>,
  query: SparqlJs.SelectQuery
) {
  const fieldValues: Dictionary<Node>[] = [];
  fields
    .filter(field => xsd.anyURI.equals(field.xsdDatatype))
    .forEach(field => {
      if (isNotNullOrEmpty(field.domain)) {
        field.domain.forEach( d => {
          if (isNotNullOrEmpty(field.range)) {
            field.range.forEach(  r => {
              fieldValues.push({ field: iri(field.iri), domain: d, range: r });
            });
          } else {
            fieldValues.push({ field: iri(field.iri), domain: d});
          }
        });
      } else if (isNotNullOrEmpty(field.range)) {
        field.range.forEach(  r => {
          fieldValues.push({ field: iri(field.iri), range: r });
        });
      } else {
        fieldValues.push({field: iri(field.iri)});
      }
  });
  const queryWithFields = SparqlClient.prepareParsedQuery(fieldValues)(query);
  return queryWithFields as SparqlJs.SelectQuery;
}

function addSourceTypesValues(query: SparqlJs.SelectQuery, types: ElementTypeIri[]) {
  return SparqlClient.prepareParsedQuery(
    types.map(type => ({'sourceType': iri(type)}))
  )(query) as SparqlJs.SelectQuery as SparqlJs.SelectQuery;
}

function addTargetTypesValues(query: SparqlJs.SelectQuery, types: ElementTypeIri[]) {
  return SparqlClient.prepareParsedQuery(
    types.map(type => ({'targetType': iri(type)}))
  )(query) as SparqlJs.SelectQuery;
}

function isNotNullOrEmpty (a: ReadonlyArray<Iri>) {
  return a && a.length > 0;
}
