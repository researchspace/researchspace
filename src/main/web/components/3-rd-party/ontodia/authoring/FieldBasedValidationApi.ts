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

import {
  ValidationApi,
  ElementError,
  LinkTypeIri,
  PropertyTypeIri,
  ElementIri,
  ElementTypeIri,
  LinkModel,
  LinkError,
  ValidationEvent,
  Element,
  DiagramModel,
  AuthoringState,
  DataProvider,
} from 'ontodia';

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

export class FieldBasedValidationApi implements ValidationApi {
  private dataProvider: DataProvider | undefined;

  constructor(
    private entityMetadata: Map<ElementTypeIri, EntityMetadata>,
    private enforceConstraints: boolean
  ) { }

  setDataProvider(dataProvider: DataProvider) {
    this.dataProvider = dataProvider;
  }

  shouldEnforceConstraints() {
    return this.enforceConstraints;
  }

  validate(e: ValidationEvent): Promise<Array<ElementError | LinkError>> {
    const { target, state } = e;
    const metadata = getEntityMetadata(target, this.entityMetadata);

    if (metadata === undefined && state.elements.has(target.id)) {
      const error: ElementError = {
        type: 'element',
        target: target.id,
        message: `Cannot find metadata for any of the entity types`,
      };
      return Promise.resolve([error]);
    }

    const combinedTask = Kefir.combine(
      {
        domainRangeErrors: this.checkDomainRangeCompatibility(e, metadata),
        relatedElementsErrors: this.checkRelatedElements(e, metadata),
      },
      ({ domainRangeErrors, relatedElementsErrors }) => {
        return [...domainRangeErrors, ...relatedElementsErrors];
      }
    ).flatMapErrors<Array<ElementError | LinkError>>((err) => {
      const error: ElementError = {
        type: 'element',
        target: target.id,
        message: `Unexpected error during the validation process: ${err.message}`,
      };
      return Kefir.constant([error]);
    });
    return observableToCancellablePromise(combinedTask, e.cancellation);
  }

  private checkDomainRangeCompatibility(e: ValidationEvent, metadata: EntityMetadata): Kefir.Property<LinkError[]> {
    const { target, outboundLinks, model } = e;

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(target.types);

    for (const link of outboundLinks) {
      const linkSource = findLinkSource(model, link);
      if (linkSource) {
        typeRequest.addAll(linkSource.data.types);
      }

      const linkTarget = findLinkTarget(model, link);
      if (linkTarget) {
        typeRequest.addAll(linkTarget.data.types);
      }
    }

    return typeRequest.query().map((typeClosure) => {
      const errors: LinkError[] = [];
      for (const link of outboundLinks) {
        const definition = metadata.fieldByIri.get(link.linkTypeId);
        if (!definition) {
          continue;
        }

        const linkSource = findLinkSource(model, link);
        const sourceTypes = linkSource ? linkSource.data.types : undefined;
        if (sourceTypes && !hasCompatibleType(definition.domain, sourceTypes, typeClosure)) {
          const domainStr = definition.domain.map(({ value }) => value).join(', ');
          errors.push({
            type: 'link',
            target: link,
            message: `The source element should have one of the types '${domainStr}'`,
          });
        }

        const linkTarget = findLinkTarget(model, link);
        const targetTypes = linkTarget ? linkTarget.data.types : undefined;
        if (targetTypes && !hasCompatibleType(definition.range, targetTypes, typeClosure)) {
          const rangeStr = definition.range.map(({ value }) => value).join(', ');
          errors.push({
            type: 'link',
            target: link,
            message: `The target element should have one of the types '${rangeStr}'`,
          });
        }
      }
      return errors;
    });
  }

  private checkRelatedElements(
    e: ValidationEvent,
    metadata: EntityMetadata
  ): Kefir.Property<Array<ElementError | LinkError>> {
    const { target, state } = e;

    if (!this.dataProvider) {
      return Kefir.constantError<any>(new Error('Missing data provider to fetch entity state'));
    }

    const initialModelTask = AuthoringState.isNewElement(state, target.id)
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
      .map<Array<ElementError | LinkError>>((composite) => {
        return extractValidationErrorsFromComposite(e, composite, metadata);
      })
      .toProperty();
  }
}

function findLinkSource(model: DiagramModel, data: LinkModel): Element | undefined {
  const foundLink = model.links.find((link) => link.data === data);
  return foundLink ? model.sourceOf(foundLink) : undefined;
}

function findLinkTarget(model: DiagramModel, data: LinkModel): Element | undefined {
  const foundLink = model.links.find((link) => link.data === data);
  return foundLink ? model.targetOf(foundLink) : undefined;
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
  e: ValidationEvent,
  composite: CompositeValue | EmptyValue,
  metadata: EntityMetadata
): Array<ElementError | LinkError> {
  const { target, outboundLinks } = e;

  if (FieldValue.isEmpty(composite)) {
    return [];
  }

  const collectedErrors: CollectedError[] = [];
  collectErrors([], composite, collectedErrors);

  const errors: Array<ElementError | LinkError> = [];
  collectedErrors.forEach(({ message, path }) => {
    errors.push({
      type: 'element',
      target: target.id,
      message: message,
      propertyType: path.join('/') as PropertyTypeIri,
    });
  });

  const linkByType = new Map<LinkTypeIri, LinkModel[]>();
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
        const links = linkByType.get(definition.iri as LinkTypeIri);
        if (links) {
          for (const link of links) {
            errors.push({
              type: 'link',
              target: link,
              message,
            });
          }
        }
      }
      errors.push({
        type: 'element',
        target: target.id,
        message,
        propertyType: definition.iri as PropertyTypeIri,
      });
    });
  });

  return errors;
}

function fetchExistingEnitityState(
  target: ElementIri,
  metadata: EntityMetadata,
  dataProvider: DataProvider
): Kefir.Property<CompositeValue> {
  return Kefir.fromPromise(dataProvider.linkTypesOf({ elementId: target }))
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
