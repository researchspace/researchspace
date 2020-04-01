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

import * as Kefir from 'kefir';
import { ElementIri, ElementTypeIri, ElementModel, AuthoringState, ElementChange } from 'ontodia';

import { Rdf } from 'platform/api/rdf';

import {
  CompositeValue, EmptyValue, FieldState, FieldValue, LdpPersistence, computeValuePatch
} from 'platform/components/forms';

import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';
import {
  OntodiaPersistence, OntodiaPersistenceParams, OntodiaPersistenceResult
} from './OntodiaPersistence';
import {
  fetchInitialModel, getEntityMetadata, convertElementModelToCompositeValue,
  convertCompositeValueToElementModel, applyEventsToCompositeValue
} from './OntodiaPersistenceCommon';

export interface FormBasedPersistenceProps {
  readonly type: 'form';
  readonly debug?: boolean;
}

export class FormBasedPersistence implements OntodiaPersistence {
  constructor(private props: FormBasedPersistenceProps) {}

  get supportsIriEditing() {
    return false;
  }

  persist(params: OntodiaPersistenceParams): Kefir.Property<OntodiaPersistenceResult> {
    const formPersistence = new LdpPersistence();

    const {toFetch, changed} = collectEntitiesState(params);
    return fetchEntities(params, toFetch).flatMap(initials => {
      const {previousStates, currentStates, finalizedEntities} =
        diffAndFinalizeEntities(this.props, params, changed, initials);

      const batch: Kefir.Property<void>[] = [];
      previousStates.forEach(previousState => {
        const currentState = currentStates.get(previousState.iri);
        batch.push(formPersistence.persist(previousState.value, currentState.value));
      });

      return Kefir.zip(batch).map(() => ({finalizedEntities})).toProperty();
    }).toProperty();
  }
}

interface IntialEntityData {
  model: ElementModel;
  value: CompositeValue;
}

interface EntityState {
  iri: ElementIri;
  newIri?: ElementIri;
  metadata: EntityMetadata;
  value: CompositeValue | EmptyValue;
}

function collectEntitiesState(params: OntodiaPersistenceParams) {
  const {state} = params;

  const toFetch = new Set<ElementIri>();
  const changed = new Set<ElementIri>();

  state.elements.forEach(event => {
    if (event.deleted) {
      const {after} = event;
      changed.add(after.id);
      toFetch.add(after.id);
    } else {
      const {before, after} = event;
      if (before) {
        if (after.id !== before.id) {
          throw new Error(`Changing IRIs of existing entities is not supported via ldp`);
        }
        changed.add(after.id);
        toFetch.add(after.id);
      } else {
        changed.add(after.id);
      }
    }
  });

  state.links.forEach(event => {
    if (event.deleted) {
      const {after} = event;
      changed.add(after.sourceId);
      toFetch.add(after.sourceId);
      toFetch.add(after.targetId);
    } else {
      const {before, after} = event;
      if (before) {
        changed.add(before.sourceId);
        toFetch.add(before.sourceId);
        toFetch.add(before.targetId);
      }
      changed.add(after.sourceId);
      toFetch.add(after.sourceId);
      toFetch.add(after.targetId);
    }
  });

  return {toFetch, changed};
}

function diffAndFinalizeEntities(
  props: FormBasedPersistenceProps,
  params: OntodiaPersistenceParams,
  changed: Set<ElementIri>,
  initials: Map<ElementIri, IntialEntityData>
) {
  const {state, entityMetadata} = params;
  const previousStates = new Map<ElementIri, EntityState>();
  const currentStates = new Map<ElementIri, EntityState>();

  changed.forEach(elementIri => {
    const initial = initials.get(elementIri);
    const newElementModel = getNewElementModel(state, elementIri);
    let previousState: EntityState;
    let currentState: EntityState;

    if (newElementModel) {
      const metadata = getEntityMetadata(newElementModel, entityMetadata);
      let current: CompositeValue | EmptyValue =
        convertElementModelToCompositeValue(newElementModel, metadata);
      current = applyEventsToCompositeValue({
        elementIri, state, metadata, initialModel: current,
      });
      const iri = newElementModel.id;
      previousState = {iri, metadata, value: FieldValue.empty};
      currentState = {iri, metadata, value: current};
    } else if (initial) {
      const {model, value: initialModel} = initial;
      const metadata = getEntityMetadata(model, entityMetadata);
      const current = applyEventsToCompositeValue({
        elementIri, state, metadata, initialModel,
      });
      const iri = model.id;
      const newIri: ElementIri =
        FieldValue.isEmpty(current) ? model.id : current.subject.value as ElementIri;
      previousState = {iri, metadata, value: initialModel};
      currentState = {
        iri,
        newIri: newIri !== iri ? newIri : undefined,
        metadata,
        value: current
      };
    } else {
      throw new Error(`Failed to load intial state for entity <${elementIri}>`);
    }
    previousStates.set(elementIri, previousState);
    currentStates.set(elementIri, currentState);
  });

  if (props.debug) {
    if (previousStates.size !== currentStates.size) {
      console.error('Different diff lengths!');
    }
    previousStates.forEach((previous, iri) => {
      const current = currentStates.get(iri);
      console.log(`Diff for entity`, iri, computeValuePatch(previous.value, current.value));
      console.log(' where previous', computeValuePatch(FieldValue.empty, previous.value));
      console.log(' where current', computeValuePatch(FieldValue.empty, current.value));
    });
  }

  const finalizedEntities = new Map<ElementIri, ElementModel | null>();
  currentStates.forEach((current, elementIri) => {
    const {value, metadata} = current;
    let model: ElementModel | null = null;
    if (FieldValue.isComposite(value)) {
      const modelWithLinks = convertCompositeValueToElementModel(value, metadata);
      model = filterObjectProperties(modelWithLinks, metadata);
    }
    finalizedEntities.set(elementIri, model);
  });

  return {previousStates, currentStates, finalizedEntities};
}

function getNewElementModel(state: AuthoringState, elementIri: ElementIri) {
  const event = state.elements.get(elementIri);
  if (event) {
    const {before, after} = event as ElementChange;
    if (!before) {
      return after;
    }
  }
  return undefined;
}

function fetchEntities(
  params: OntodiaPersistenceParams,
  entities: ReadonlySet<ElementIri>
): Kefir.Property<Map<ElementIri, IntialEntityData>> {
  const {fetchModel, entityMetadata} = params;
  const tasks = Array.from(entities as Set<ElementIri>, iri => {
    return fetchModel(iri).flatMap((model): Kefir.Property<IntialEntityData | undefined> => {
        const metadata = getEntityMetadata(model, entityMetadata);
        if (!metadata) {
          return Kefir.constant(undefined);
        }
        return fetchInitialModel(Rdf.iri(iri), metadata)
          .map((value): IntialEntityData => ({model, value}));
    });
  });

  if (tasks.length === 0) {
    return Kefir.constant(new Map<ElementIri, IntialEntityData>());
  }

  return Kefir.zip(tasks).map(fetched => {
    const result = new Map<ElementIri, IntialEntityData>();
    fetched.forEach(entity => {
      if (entity) {
        result.set(entity.model.id, entity);
      }
    });
    return result;
  }).toProperty();
}

function filterObjectProperties(
  model: ElementModel, metadata: EntityMetadata
): ElementModel {
  const filteredProperties: ElementModel['properties'] = {};
  for (const propertyIri in model.properties) {
    if (Object.prototype.hasOwnProperty.call(model.properties, propertyIri)) {
      const field = metadata.fieldByIri.get(propertyIri);
      if (!(field && isObjectProperty(field, metadata))) {
        filteredProperties[propertyIri] = model.properties[propertyIri];
      }
    }
  }
  return {...model, properties: filteredProperties};
}
