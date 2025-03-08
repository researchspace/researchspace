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
import * as Reactodia from '@reactodia/workspace';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getLabel } from 'platform/api/services/resource-label';
import { rdfs } from 'platform/api/rdf/vocabularies';

import { generateSubjectByTemplate } from 'platform/components/forms';

import { observableToCancellablePromise } from '../AsyncAdapters';
import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';
import { getEntityMetadata, convertElementModelToCompositeValue } from './OntodiaPersistenceCommon';

export class FieldBasedMetadataApi implements Reactodia.MetadataProvider {
  constructor(private entityMetadata: Map<Reactodia.ElementTypeIri, EntityMetadata>) {}

  getLiteralLanguages(): ReadonlyArray<string> {
    const { preferredLanguages } = ConfigHolder.getUIConfig();
    return preferredLanguages.length === 0 ? ['en'] : preferredLanguages;
  }

  async createEntity(
    type: Reactodia.ElementTypeIri,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataCreatedEntity> {
    const { signal } = options;
    let typeLabel: string;
    if (type && type !== Reactodia.PlaceholderEntityType) {
      typeLabel = await observableToCancellablePromise(getLabel(Rdf.iri(type)), signal);
    } else {
      typeLabel = 'Entity';
    }

    let newModel: Reactodia.ElementModel = {
      id: '',
      types: [type],
      properties: {},
    };
    const metadata = getEntityMetadata(newModel, this.entityMetadata);
    newModel = {
      ...newModel,
      id: this.generateIriForModel(newModel),
      properties: {
        [metadata?.labelField.iri ?? rdfs.label.value]: [Rdf.literal(`New ${typeLabel}`)],
      }
    };
    return {data: newModel};
  }

  generateIriForModel(model: Reactodia.ElementModel): Reactodia.ElementIri {
    let metadata: EntityMetadata | undefined;
    if (model.types.length > 0) {
      const firstType = model.types[0];
      if (firstType !== Reactodia.PlaceholderEntityType) {
        metadata = this.entityMetadata.get(firstType);
      }
    }
    if (metadata) {
      const newComposite = convertElementModelToCompositeValue({ ...model, id: '' }, metadata);
      const generatedIri = generateSubjectByTemplate(metadata.newSubjectTemplate, undefined, newComposite);
      return generatedIri.value;
    } else {
      const uuid = () =>
        Math.floor((1 + Math.random()) * 0x100000000)
          .toString(16)
          .substring(1);
      return `http://researchspace.org/NewEntity-${uuid()}`;
    }
  }

  async createRelation(
    source: Reactodia.ElementModel,
    target: Reactodia.ElementModel,
    linkType: Reactodia.LinkTypeIri,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataCreatedRelation> {
    return {
      data: {
        sourceId: source.id,
        targetId: target.id,
        linkTypeId: linkType,
        properties: {},
      }
    };
  }

  async canConnect(
    source: Reactodia.ElementModel,
    target: Reactodia.ElementModel | undefined,
    linkType: Reactodia.LinkTypeIri | undefined,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataCanConnect[]> {
    const { signal } = options;
    const sourceMetadata = getEntityMetadata(source, this.entityMetadata);
    const targetMetadata = target ? getEntityMetadata(target, this.entityMetadata) : undefined;
    if (!sourceMetadata || (target && !targetMetadata)) {
      return [];
    }

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(source.types);
    if (target) {
      typeRequest.addAll(target.types);
    }

    const typeClosure = await observableToCancellablePromise(typeRequest.query(), signal);

    const targetOutLinks = new Map<Reactodia.ElementTypeIri, Set<Reactodia.LinkTypeIri>>();
    const targetInLinks = new Map<Reactodia.ElementTypeIri, Set<Reactodia.LinkTypeIri>>();
    const anyOutLinks = new Set<Reactodia.LinkTypeIri>();
    const anyInLinks = new Set<Reactodia.LinkTypeIri>();

    this.addLinkTypes(source, sourceMetadata, target, linkType, typeClosure, targetOutLinks, anyOutLinks);

    if (target && targetMetadata) {
      this.addLinkTypes(target, targetMetadata, source, linkType, typeClosure, targetInLinks, anyInLinks);
    } else {
      this.entityMetadata.forEach((metadata, targetType) => {
        this.addLinkTypes(undefined, metadata, source, linkType, typeClosure, targetInLinks, anyInLinks);
      });
    }

    const connections: Reactodia.MetadataCanConnect[] = [];

    this.entityMetadata.forEach((metadata, elementType) => {
      let specificOutLinks = targetOutLinks.get(elementType);
      if (specificOutLinks) {
        anyOutLinks.forEach(outLink => specificOutLinks.add(outLink));
      } else {
        specificOutLinks = anyOutLinks;
      }

      let specificInLinks = targetInLinks.get(elementType);
      if (specificInLinks) {
        anyInLinks.forEach(inLink => specificInLinks.add(inLink));
      } else {
        specificInLinks = anyOutLinks;
      }

      if (specificOutLinks.size > 0 || specificInLinks.size > 0) {
        connections.push({
          targetTypes: new Set([elementType]),
          outLinks: Array.from(specificOutLinks),
          inLinks: Array.from(specificInLinks),
        });
      }
    });

    return connections;
  }

  private addLinkTypes(
    source: Reactodia.ElementModel | undefined,
    sourceMetadata: EntityMetadata,
    target: Reactodia.ElementModel | undefined,
    linkType: Reactodia.LinkTypeIri | undefined,
    typeClosure: Map<Reactodia.ElementTypeIri, Set<Reactodia.ElementTypeIri>>,
    targetOutLinks: Map<Reactodia.ElementTypeIri, Set<Reactodia.LinkTypeIri>>,
    anyOutLinks: Set<Reactodia.LinkTypeIri>
  ): void {
    sourceMetadata.fieldByIri.forEach((field, fieldIri) => {
      const isCompatibleField =
        isObjectProperty(field, sourceMetadata) &&
        (!source || hasCompatibleType(field.domain, source.types, typeClosure)) &&
        (!target || hasCompatibleType(field.range, target.types, typeClosure)) &&
        (!linkType || fieldIri === linkType);

      if (isCompatibleField) {
        if (field.range && field.range.length > 0) {
          for (const iri of field.range) {
            let linkTypes = targetOutLinks.get(iri.value);
            if (!linkTypes) {
              linkTypes = new Set<Reactodia.LinkTypeIri>();
              targetOutLinks.set(iri.value, linkTypes);
            }
            linkTypes.add(fieldIri);
          }
        } else {
          anyOutLinks.add(fieldIri);
        }
      }
    });
  }

  async getEntityShape(
    types: ReadonlyArray<Reactodia.ElementTypeIri>,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataEntityShape> {
    const properties = new Map<Reactodia.PropertyTypeIri, Reactodia.MetadataPropertyShape>();
    for (const type of types) {
      const metadata = this.entityMetadata.get(type);
      if (metadata) {
        metadata.fieldByIri.forEach((field, fieldIri) => {
          if (!isObjectProperty(field, metadata)) {
            properties.set(fieldIri, {
              valueShape: {
                termType: 'Literal',
                datatype: field.xsdDatatype,
              }
            });
          }
        });
      }
    }
    return { properties };
  }

  async getRelationShape(
    linkType: Reactodia.LinkTypeIri,
    source: Reactodia.ElementModel,
    target: Reactodia.ElementModel,
    options: { readonly signal?: AbortSignal; }
  ): Promise<Reactodia.MetadataRelationShape> {
    const properties = new Map<Reactodia.PropertyTypeIri, Reactodia.MetadataPropertyShape>();
    return { properties };
  }

  async filterConstructibleTypes(
    types: ReadonlySet<Reactodia.ElementTypeIri>,
    options: { readonly signal?: AbortSignal }
  ): Promise<ReadonlySet<Reactodia.ElementTypeIri>> {
    const constructibleTypes = new Set<Reactodia.ElementTypeIri>();
    this.entityMetadata.forEach((metadata, key) => {
      if (types.has(key)) {
        constructibleTypes.add(key);
      }
    });
    return constructibleTypes;
  }

  async canModifyEntity(
    entity: Reactodia.ElementModel,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataCanModifyEntity> {
    const metadata = getEntityMetadata(entity, this.entityMetadata);
    const canModify = Boolean(metadata);
    return {
      canEdit: canModify,
      canDelete: canModify,
    };
  }

  async canModifyRelation(
    link: Reactodia.LinkModel,
    source: Reactodia.ElementModel,
    target: Reactodia.ElementModel,
    options: { readonly signal?: AbortSignal }
  ): Promise<Reactodia.MetadataCanModifyRelation> {
    const metadata = getEntityMetadata(source, this.entityMetadata);
    const canModify = Boolean(metadata) && metadata.fieldByIri.has(link.linkTypeId);
    return {
      canChangeType: canModify,
      canDelete: canModify,
    };
  }
}

export class BaseTypeClosureRequest {
  private static BASE_TYPES_QUERY = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(
    'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
      'SELECT REDUCED ?type ?base WHERE { ?type rdfs:subClassOf* ?base }'
  );

  readonly derivedTypes = new Set<Reactodia.ElementTypeIri>();

  addAll(types: ReadonlyArray<Reactodia.ElementTypeIri>) {
    for (const type of types) {
      this.derivedTypes.add(type);
    }
  }

  query(): Kefir.Property<Map<Reactodia.ElementTypeIri, Set<Reactodia.ElementTypeIri>>> {
    const values: Array<{ type: Rdf.Iri }> = [];
    this.derivedTypes.forEach((type) => {
      values.push({ type: Rdf.iri(type) });
    });
    const preparedQuery = SparqlClient.prepareParsedQuery(values)(BaseTypeClosureRequest.BASE_TYPES_QUERY);
    return SparqlClient.select(preparedQuery).map(({ results }) => {
      const baseTypes = new Map<Reactodia.ElementTypeIri, Set<Reactodia.ElementTypeIri>>();
      for (const binding of results.bindings) {
        const type: Reactodia.ElementTypeIri = binding.type.value;
        const base: Reactodia.ElementTypeIri = binding.base.value;
        let baseSet = baseTypes.get(type);
        if (!baseSet) {
          baseSet = new Set<Reactodia.ElementTypeIri>();
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
  targetTypes: ReadonlyArray<Reactodia.ElementTypeIri>,
  targetTypesClosure: Map<Reactodia.ElementTypeIri, Set<Reactodia.ElementTypeIri>>
) {
  for (const targetType of targetTypes) {
    const closure = targetTypesClosure.get(targetType);
    for (const requiredType of requiredTypes) {
      if (closure.has(requiredType.value)) {
        return true;
      }
    }
  }
  return false;
}
