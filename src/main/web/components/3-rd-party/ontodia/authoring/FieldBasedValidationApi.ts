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

import * as Reactodia from '@reactodia/workspace';

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';

import {
  FieldValue,
  FieldDefinition,
  checkCardinalityAndDuplicates,
  CompositeValue,
  EmptyValue,
} from 'platform/components/forms';
import { CollectedError, collectErrors } from 'platform/components/forms/static/FormErrors';
import { tryBeginValidation } from 'platform/components/forms/FormModel';

import { observableToCancellablePromise } from '../AsyncAdapters';
import { BaseTypeClosureRequest, hasCompatibleType } from './FieldBasedMetadataApi';
import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';
import { fetchInitialModel, getEntityMetadata, applyEventsToCompositeValue } from './OntodiaPersistenceCommon';

export class FieldBasedValidationApi implements Reactodia.ValidationProvider {
  private dataProvider: Reactodia.DataProvider | undefined;

  constructor(
    private entityMetadata: Map<Reactodia.ElementTypeIri, EntityMetadata>,
    private enforceConstraints: boolean
  ) { }

  setDataProvider(dataProvider: Reactodia.DataProvider) {
    this.dataProvider = dataProvider;
  }

  shouldEnforceConstraints() {
    return this.enforceConstraints;
  }

  validate(
    e: Reactodia.ValidationEvent
  ): Promise<Reactodia.ValidationResult> {
    const { target, state } = e;
    const metadata = getEntityMetadata(target, this.entityMetadata);

    if (metadata === undefined && state.elements.has(target.id)) {
      const error: Reactodia.ValidatedElement = {
        type: 'element',
        target: target.id,
        severity: 'error',
        message: `Cannot find metadata for any of the entity types`,
      };
      return Promise.resolve({ items: [error] });
    }

    const combinedTask = Kefir.combine(
      {
        domainRangeErrors: this.checkDomainRangeCompatibility(e, metadata),
        relatedElementsErrors: this.checkRelatedElements(e, metadata),
      },
      ({ domainRangeErrors, relatedElementsErrors }): Reactodia.ValidationResult => {
        return {
          items: [...domainRangeErrors, ...relatedElementsErrors],
        };
      }
    ).flatMapErrors<Reactodia.ValidationResult>((err) => {
      const error: Reactodia.ValidatedElement = {
        type: 'element',
        target: target.id,
        severity: 'error',
        message: `Unexpected error during the validation process: ${err.message}`,
      };
      return Kefir.constant({ items: [error] });
    });
    return observableToCancellablePromise(combinedTask, e.signal);
  }

  private checkDomainRangeCompatibility(
    e: Reactodia.ValidationEvent,
    metadata: EntityMetadata
  ): Kefir.Property<Reactodia.ValidatedLink[]> {
    const { target, outboundLinks, graph } = e;

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(target.types);

    for (const link of outboundLinks) {
      const linkSource = findLinkSource(graph, link);
      if (linkSource) {
        typeRequest.addAll(linkSource.data.types);
      }

      const linkTarget = findLinkTarget(graph, link);
      if (linkTarget) {
        typeRequest.addAll(linkTarget.data.types);
      }
    }

    return typeRequest.query().map((typeClosure) => {
      const errors: Reactodia.ValidatedLink[] = [];
      for (const link of outboundLinks) {
        const definition = metadata.fieldByIri.get(link.linkTypeId);
        if (!definition) {
          continue;
        }

        const linkSource = findLinkSource(graph, link);
        const sourceTypes = linkSource ? linkSource.data.types : undefined;
        if (sourceTypes && !hasCompatibleType(definition.domain, sourceTypes, typeClosure)) {
          const domainStr = definition.domain.map(({ value }) => value).join(', ');
          errors.push({
            type: 'link',
            target: link,
            severity: 'error',
            message: `The source element should have one of the types '${domainStr}'`,
          });
        }

        const linkTarget = findLinkTarget(graph, link);
        const targetTypes = linkTarget ? linkTarget.data.types : undefined;
        if (targetTypes && !hasCompatibleType(definition.range, targetTypes, typeClosure)) {
          const rangeStr = definition.range.map(({ value }) => value).join(', ');
          errors.push({
            type: 'link',
            target: link,
            severity: 'error',
            message: `The target element should have one of the types '${rangeStr}'`,
          });
        }
      }
      return errors;
    });
  }

  private checkRelatedElements(
    e: Reactodia.ValidationEvent,
    metadata: EntityMetadata
  ): Kefir.Property<Array<Reactodia.ValidatedElement | Reactodia.ValidatedLink>> {
    const { target, state } = e;

    if (!this.dataProvider) {
      return Kefir.constantError<any>(new Error('Missing data provider to fetch entity state'));
    }

    const initialModelTask = Reactodia.AuthoringState.isAddedEntity(state, target.id)
      ? Kefir.constant<CompositeValue>({
        type: CompositeValue.type,
        subject: Rdf.iri(target.id),
        definitions: metadata.fieldByIri,
        fields: Immutable.Map(),
        errors: Immutable.List(),
      })
      : fetchExistingEnitityState(target.id, metadata, this.dataProvider);

    return initialModelTask
      .flatMap<CompositeValue | EmptyValue>((initialModel) => {
        const composite = applyEventsToCompositeValue({
          elementIri: target.id,
          state,
          metadata,
          initialModel,
        });
        return FieldValue.isEmpty(composite) ? Kefir.constant(composite) : validateWholeComposite(composite);
      })
      .map<Array<Reactodia.ValidatedElement | Reactodia.ValidatedLink>>((composite) => {
        return extractValidationErrorsFromComposite(e, composite, metadata);
      })
      .toProperty();
  }
}

function findLinkSource(
  model: Reactodia.DataGraphStructure,
  data: Reactodia.LinkModel
): Reactodia.EntityElement | undefined {
  const foundLink = model.links.find((link): link is Reactodia.RelationLink =>
    link instanceof Reactodia.RelationLink && link.data === data
  );
  const source = foundLink ? model.sourceOf(foundLink) : undefined;
  return source instanceof Reactodia.EntityElement ? source : undefined;
}

function findLinkTarget(
  model: Reactodia.DataGraphStructure,
  data: Reactodia.LinkModel
): Reactodia.EntityElement | undefined {
  const foundLink = model.links.find((link): link is Reactodia.RelationLink =>
    link instanceof Reactodia.RelationLink && link.data === data
  );
  const target = foundLink ? model.targetOf(foundLink) : undefined;
  return target instanceof Reactodia.EntityElement ? target: undefined;
}

function validateWholeComposite(composite: CompositeValue): Kefir.Property<CompositeValue> {
  const emptyComposite = CompositeValue.set(composite, {
    fields: composite.fields.clear(),
    errors: composite.errors.clear(),
  });

  const validations: Array<ReturnType<typeof tryBeginValidation>> = [];

  composite.fields.forEach((fieldState, fieldId) => {
    const definition = composite.definitions.get(fieldId);
    if (definition) {
      const validationTask = tryBeginValidation(definition, emptyComposite, composite);
      if (validationTask) {
        validations.push(validationTask);
      }
    }
  });

  if (validations.length === 0) {
    return Kefir.constant(composite);
  } else {
    return Kefir.zip(validations)
      .map((changes) => {
        let validated = composite;
        for (const change of changes) {
          validated = change(composite);
        }
        return validated;
      })
      .toProperty();
  }
}

function extractValidationErrorsFromComposite(
  e: Reactodia.ValidationEvent,
  composite: CompositeValue | EmptyValue,
  metadata: EntityMetadata
): Array<Reactodia.ValidatedElement | Reactodia.ValidatedLink> {
  const { target, outboundLinks } = e;

  if (FieldValue.isEmpty(composite)) {
    return [];
  }

  const collectedErrors: CollectedError[] = [];
  collectErrors([], composite, collectedErrors);

  const errors: Array<Reactodia.ValidatedElement | Reactodia.ValidatedLink> = [];
  collectedErrors.forEach(({ message, path }) => {
    errors.push({
      type: 'element',
      target: target.id,
      message: message,
      severity: 'error',
      propertyType: path.join('/'),
    });
  });

  const linkByType = new Map<Reactodia.LinkTypeIri, Reactodia.LinkModel[]>();
  for (const link of outboundLinks) {
    if (!linkByType.has(link.linkTypeId)) {
      linkByType.set(link.linkTypeId, []);
    }
    linkByType.get(link.linkTypeId).push(link);
  }

  composite.fields.forEach((fieldState, fieldId) => {
    const definition = composite.definitions.get(fieldId);
    checkCardinalityAndDuplicates(fieldState.values, definition).forEach(({ message }) => {
      if (isObjectProperty(definition, metadata)) {
        const links = linkByType.get(definition.iri);
        if (links) {
          for (const link of links) {
            errors.push({
              type: 'link',
              target: link,
              severity: 'error',
              message,
            });
          }
        }
      }
      errors.push({
        type: 'element',
        target: target.id,
        message,
        severity: 'error',
        propertyType: definition.iri,
      });
    });
  });

  return errors;
}

function fetchExistingEnitityState(
  target: Reactodia.ElementIri,
  metadata: EntityMetadata,
  dataProvider: Reactodia.DataProvider
): Kefir.Property<CompositeValue> {
  return Kefir.fromPromise(dataProvider.connectedLinkStats({ elementId: target, inexactCount: true }))
    .flatMap((linkCounts) => {
      const foundFields = new Set<FieldDefinition>();
      for (const { id, outCount } of linkCounts) {
        const field = metadata.fieldByIri.get(id);
        if (field && outCount > 0) {
          foundFields.add(field);
        }
      }
      const fieldsToFetchById = metadata.fieldByIri.filter((field) => foundFields.has(field)).toMap();
      return fetchInitialModel(Rdf.iri(target), metadata, fieldsToFetchById);
    })
    .toProperty();
}
