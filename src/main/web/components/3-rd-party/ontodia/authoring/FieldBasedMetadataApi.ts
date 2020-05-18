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

import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';
import {
  CancellationToken,
  ElementModel,
  ElementTypeIri,
  LinkTypeIri,
  MetadataApi,
  PropertyTypeIri,
  LinkModel,
  ElementIri,
  LinkDirection,
  PLACEHOLDER_ELEMENT_TYPE,
} from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { getLabel } from 'platform/api/services/resource-label';

import { generateSubjectByTemplate } from 'platform/components/forms';

import { observableToCancellablePromise } from '../AsyncAdapters';
import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';
import { getEntityMetadata, convertElementModelToCompositeValue } from './OntodiaPersistenceCommon';

export class FieldBasedMetadataApi implements MetadataApi {
  constructor(private entityMetadata: Map<ElementTypeIri, EntityMetadata>) {}

  async generateNewElement(types: ReadonlyArray<ElementTypeIri>, ct: CancellationToken): Promise<ElementModel> {
    let typeIri: ElementTypeIri | undefined;
    if (types && types.length !== 0) {
      typeIri = types[0];
    }

    let typeLabel: string;
    if (typeIri && typeIri !== PLACEHOLDER_ELEMENT_TYPE) {
      typeLabel = await observableToCancellablePromise(getLabel(Rdf.iri(typeIri)), ct);
    } else {
      typeLabel = 'Entity';
    }

    const newModel: ElementModel = {
      id: '' as ElementIri,
      types: [...types],
      label: { values: [{ value: `New ${typeLabel}`, language: '' }] },
      properties: {},
    };
    return {
      ...newModel,
      id: this.generateIriForModel(newModel),
    };
  }

  generateIriForModel(model: ElementModel): ElementIri {
    let metadata: EntityMetadata | undefined;
    if (model.types.length > 0) {
      const firstType = model.types[0];
      if (firstType !== PLACEHOLDER_ELEMENT_TYPE) {
        metadata = this.entityMetadata.get(firstType);
      }
    }
    if (metadata) {
      const newComposite = convertElementModelToCompositeValue({ ...model, id: '' as ElementIri }, metadata);
      const generatedIri = generateSubjectByTemplate(metadata.newSubjectTemplate, undefined, newComposite);
      return generatedIri.value as ElementIri;
    } else {
      const uuid = () =>
        Math.floor((1 + Math.random()) * 0x100000000)
          .toString(16)
          .substring(1);
      return `http://researchspace.org/NewEntity-${uuid()}` as ElementIri;
    }
  }

  canDropOnCanvas(source: ElementModel, ct: CancellationToken): Promise<boolean> {
    return this.typesOfElementsDraggedFrom(source, ct).then((elementTypes) => elementTypes.length > 0);
  }

  canDropOnElement(source: ElementModel, target: ElementModel, ct: CancellationToken): Promise<boolean> {
    return this.possibleLinkTypes(source, target, ct).then((types) => types.length > 0);
  }

  possibleLinkTypes(
    source: ElementModel,
    target: ElementModel,
    ct: CancellationToken
  ): Promise<Array<{ linkTypeIri: LinkTypeIri; direction: LinkDirection }>> {
    const task = Kefir.combine(
      {
        outgoing: this.getPossibleLinkTypes(source, target),
        incoming: this.getPossibleLinkTypes(target, source),
      },
      ({ outgoing, incoming }) => {
        return [
          ...outgoing.map((linkTypeIri) => ({ linkTypeIri, direction: LinkDirection.out })),
          ...incoming.map((linkTypeIri) => ({ linkTypeIri, direction: LinkDirection.in })),
        ];
      }
    );
    return observableToCancellablePromise(task, ct);
  }

  private getPossibleLinkTypes(source: ElementModel, target: ElementModel): Kefir.Property<LinkTypeIri[]> {
    const sourceMetadata = getEntityMetadata(source, this.entityMetadata);
    const targetMetadata = getEntityMetadata(target, this.entityMetadata);
    if (!(sourceMetadata && targetMetadata)) {
      return Kefir.constant([]);
    }

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(source.types);
    typeRequest.addAll(target.types);

    return typeRequest.query().map((typeClosure) => {
      const possibleLinks = new Set<LinkTypeIri>();

      sourceMetadata.fieldByIri.forEach((field, fieldIri) => {
        const isCompatibleField =
          isObjectProperty(field, sourceMetadata) &&
          hasCompatibleType(field.domain, source.types, typeClosure) &&
          hasCompatibleType(field.range, target.types, typeClosure);
        if (isCompatibleField) {
          possibleLinks.add(fieldIri as LinkTypeIri);
        }
      });

      return Array.from(possibleLinks);
    });
  }

  typesOfElementsDraggedFrom(source: ElementModel, ct: CancellationToken): Promise<ElementTypeIri[]> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    if (!metadata) {
      return Promise.resolve([]);
    }

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(source.types);

    const task = typeRequest.query().map((typeClosure) => {
      const targetTypes = new Set<ElementTypeIri>();

      metadata.fieldByIri.forEach((field) => {
        const isCompatibleField =
          isObjectProperty(field, metadata) && hasCompatibleType(field.domain, source.types, typeClosure);
        if (isCompatibleField) {
          for (const rangeType of field.range) {
            const entityType = rangeType.value as ElementTypeIri;
            if (this.entityMetadata.has(entityType)) {
              targetTypes.add(entityType);
            }
          }
        }
      });

      this.entityMetadata.forEach((otherMetadata) => {
        otherMetadata.fieldByIri.forEach((field) => {
          const isCompatibleField =
            isObjectProperty(field, otherMetadata) && hasCompatibleType(field.range, source.types, typeClosure);
          if (isCompatibleField) {
            for (const domainType of field.domain) {
              const entityType = domainType.value as ElementTypeIri;
              if (this.entityMetadata.has(entityType)) {
                targetTypes.add(entityType);
              }
            }
          }
        });
      });

      return Array.from(targetTypes);
    });
    return observableToCancellablePromise(task, ct);
  }

  propertiesForType(type: ElementTypeIri, ct: CancellationToken): Promise<PropertyTypeIri[]> {
    return Promise.resolve([]);
  }

  canDeleteElement(element: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(element, this.entityMetadata);
    return Promise.resolve(Boolean(metadata));
  }

  filterConstructibleTypes(
    types: ReadonlySet<ElementTypeIri>,
    ct: CancellationToken
  ): Promise<ReadonlySet<ElementTypeIri>> {
    const constructibleTypes = new Set<ElementTypeIri>();
    this.entityMetadata.forEach((metadata, key: ElementTypeIri) => {
      if (types.has(key)) {
        constructibleTypes.add(key);
      }
    });
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

  canDeleteLink(link: LinkModel, source: ElementModel, target: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    return Promise.resolve(Boolean(metadata) && metadata.fieldByIri.has(link.linkTypeId));
  }

  canEditLink(link: LinkModel, source: ElementModel, target: ElementModel, ct: CancellationToken): Promise<boolean> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    return Promise.resolve(Boolean(metadata) && metadata.fieldByIri.has(link.linkTypeId));
  }
}

export class BaseTypeClosureRequest {
  private static BASE_TYPES_QUERY = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(
    'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
      'SELECT REDUCED ?type ?base WHERE { ?type rdfs:subClassOf* ?base }'
  );

  readonly derivedTypes = new Set<ElementTypeIri>();

  addAll(types: ReadonlyArray<ElementTypeIri>) {
    for (const type of types) {
      this.derivedTypes.add(type);
    }
  }

  query(): Kefir.Property<Map<ElementTypeIri, Set<ElementTypeIri>>> {
    const values: Array<{ type: Rdf.Iri }> = [];
    this.derivedTypes.forEach((type) => {
      values.push({ type: Rdf.iri(type) });
    });
    const preparedQuery = SparqlClient.prepareParsedQuery(values)(BaseTypeClosureRequest.BASE_TYPES_QUERY);
    return SparqlClient.select(preparedQuery).map(({ results }) => {
      const baseTypes = new Map<ElementTypeIri, Set<ElementTypeIri>>();
      for (const binding of results.bindings) {
        const type = binding.type.value as ElementTypeIri;
        const base = binding.base.value as ElementTypeIri;
        let baseSet = baseTypes.get(type);
        if (!baseSet) {
          baseSet = new Set<ElementTypeIri>();
          baseTypes.set(type, baseSet);
        }
        baseSet.add(base);
      }
      return baseTypes;
    });
  }
}

export function hasCompatibleType(
  requiredTypes: ReadonlyArray<Rdf.Iri>,
  targetTypes: ReadonlyArray<ElementTypeIri>,
  targetTypesClosure: Map<ElementTypeIri, Set<ElementTypeIri>>
) {
  for (const targetType of targetTypes) {
    const closure = targetTypesClosure.get(targetType);
    for (const requiredType of requiredTypes) {
      if (closure.has(requiredType.value as ElementTypeIri)) {
        return true;
      }
    }
  }
  return false;
}
