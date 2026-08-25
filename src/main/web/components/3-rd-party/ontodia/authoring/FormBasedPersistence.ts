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
import * as Reactodia from '@reactodia/workspace';

import { Rdf } from 'platform/api/rdf';

import {
  CompositeValue,
  EmptyValue,
  FieldValue,
  LdpPersistence,
  computeValuePatch,
  TriplestorePersistence,
} from 'platform/components/forms';
import { SparqlPersistence } from 'platform/components/forms/persistence/SparqlPersistence';

import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';
import { OntodiaPersistence, OntodiaPersistenceParams, OntodiaPersistenceResult } from './OntodiaPersistence';
import {
  fetchInitialModel,
  getEntityMetadata,
  convertElementModelToCompositeValue,
  convertCompositeValueToElementModel,
  applyEventsToCompositeValue,
} from './OntodiaPersistenceCommon';


export type FormBasedPersistenceProps =
  LdpBasedPersistenceProps | SparqlPersistenceProps;

export interface LdpBasedPersistenceProps {
  readonly type: 'form';
  readonly debug?: boolean;
}

export interface SparqlPersistenceProps {
  readonly type: 'sparql';

  // target graph for delete and insert operations
  readonly targetGraphIri?: string;

  // target graph for insert operations only
  readonly targetInsertGraphIri?: string;
  readonly debug?: boolean;
}

export class FormBasedPersistence implements OntodiaPersistence {
  constructor(private props: FormBasedPersistenceProps) {}

  get supportsIriEditing() {
    return false;
  }

  persist(params: OntodiaPersistenceParams): Kefir.Property<OntodiaPersistenceResult> {
    let formPersistence: TriplestorePersistence;
    switch (this.props.type) {
      case 'form': formPersistence = new LdpPersistence(); break;
      case 'sparql':
        formPersistence =
          new SparqlPersistence({
            targetGraphIri: this.props.targetGraphIri,
            targetInsertGraphIri: this.props.targetInsertGraphIri
          });
        break;
      default: throw new Error('Undefined data persistence type.');
    }

    const { toFetch, changed } = collectEntitiesState(params);
    return fetchEntities(params, toFetch)
      .flatMap((initials) => {
        const { previousStates, currentStates, finalizedEntities } = diffAndFinalizeEntities(
          this.props,
          params,
          changed,
          initials
        );

        const batch: Kefir.Property<void>[] = [];
        previousStates.forEach((previousState) => {
          const currentState = currentStates.get(previousState.iri);
          batch.push(formPersistence.persist(previousState.value, currentState.value));
        });

        return Kefir.zip(batch)
          .map(() => ({ finalizedEntities }))
          .toProperty();
      })
      .toProperty();
  }
}

interface IntialEntityData {
  model: Reactodia.ElementModel;
  value: CompositeValue;
}

interface EntityState {
  iri: Reactodia.ElementIri;
  newIri?: Reactodia.ElementIri;
  metadata: EntityMetadata;
  value: CompositeValue | EmptyValue;
}

function collectEntitiesState(params: OntodiaPersistenceParams) {
  const { state } = params;

  const toFetch = new Set<Reactodia.ElementIri>();
  const changed = new Set<Reactodia.ElementIri>();

  state.elements.forEach((event) => {
    if (event.type === 'entityDelete') {
      changed.add(event.data.id);
      toFetch.add(event.data.id);
    } else if (event.type === 'entityChange') {
        if (event.newIri) {
          throw new Error(`Changing IRIs of existing entities is not supported via ldp`);
        }
        changed.add(event.data.id);
        toFetch.add(event.data.id);
    } else {
      changed.add(event.data.id);
    }
  });

  state.links.forEach((event) => {
    if (event.type === 'relationDelete') {
      changed.add(event.data.sourceId);
      toFetch.add(event.data.sourceId);
      toFetch.add(event.data.targetId);
    } else if (event.type === 'relationChange') {
      changed.add(event.before.sourceId);
      toFetch.add(event.before.sourceId);
      toFetch.add(event.before.targetId);
    } else {
      changed.add(event.data.sourceId);
      toFetch.add(event.data.sourceId);
      toFetch.add(event.data.targetId);
    }
  });

  return { toFetch, changed };
}

function diffAndFinalizeEntities(
  props: FormBasedPersistenceProps,
  params: OntodiaPersistenceParams,
  changed: Set<Reactodia.ElementIri>,
  initials: Map<Reactodia.ElementIri, IntialEntityData>
) {
  const { state, entityMetadata } = params;
  const previousStates = new Map<Reactodia.ElementIri, EntityState>();
  const currentStates = new Map<Reactodia.ElementIri, EntityState>();

  changed.forEach((elementIri) => {
    const initial = initials.get(elementIri);
    const newElementModel = getNewElementModel(state, elementIri);
    let previousState: EntityState;
    let currentState: EntityState;

    if (newElementModel) {
      const metadata = getEntityMetadata(newElementModel, entityMetadata);
      let current: CompositeValue | EmptyValue = convertElementModelToCompositeValue(newElementModel, metadata);
      current = applyEventsToCompositeValue({
        elementIri,
        state,
        metadata,
        initialModel: current,
      });
      const iri = newElementModel.id;
      previousState = { iri, metadata, value: FieldValue.empty };
      currentState = { iri, metadata, value: current };
    } else if (initial) {
      const { model, value: initialModel } = initial;
      const metadata = getEntityMetadata(model, entityMetadata);
      const current = applyEventsToCompositeValue({
        elementIri,
        state,
        metadata,
        initialModel,
      });
      const iri = model.id;
      const newIri: Reactodia.ElementIri = FieldValue.isEmpty(current) ? model.id : current.subject.value;
      previousState = { iri, metadata, value: initialModel };
      currentState = {
        iri,
        newIri: newIri !== iri ? newIri : undefined,
        metadata,
        value: current,
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

  const finalizedEntities = new Map<Reactodia.ElementIri, Reactodia.ElementModel | null>();
  currentStates.forEach((current, elementIri) => {
    const { value, metadata } = current;
    let model: Reactodia.ElementModel | null = null;
    if (FieldValue.isComposite(value)) {
      const modelWithLinks = convertCompositeValueToElementModel(value, metadata);
      model = filterObjectProperties(modelWithLinks, metadata);
    }
    finalizedEntities.set(elementIri, model);
  });

  return { previousStates, currentStates, finalizedEntities };
}

function getNewElementModel(state: Reactodia.AuthoringState, elementIri: Reactodia.ElementIri) {
  const event = state.elements.get(elementIri);
  if (event && event.type === 'entityAdd') {
    return event.data;
  }
  return undefined;
}

function fetchEntities(
  params: OntodiaPersistenceParams,
  entities: ReadonlySet<Reactodia.ElementIri>
): Kefir.Property<Map<Reactodia.ElementIri, IntialEntityData>> {
  const { fetchModel, entityMetadata } = params;
  const tasks = Array.from(entities as Set<Reactodia.ElementIri>, (iri) => {
    return fetchModel(iri).flatMap(
      (model): Kefir.Property<IntialEntityData | undefined> => {
        const metadata = getEntityMetadata(model, entityMetadata);
        if (!metadata) {
          return Kefir.constant(undefined);
        }
        return fetchInitialModel(Rdf.iri(iri), metadata).map((value): IntialEntityData => ({ model, value }));
      }
    );
  });

  if (tasks.length === 0) {
    return Kefir.constant(new Map<Reactodia.ElementIri, IntialEntityData>());
  }

  return Kefir.zip(tasks)
    .map((fetched) => {
      const result = new Map<Reactodia.ElementIri, IntialEntityData>();
      fetched.forEach((entity) => {
        if (entity) {
          result.set(entity.model.id, entity);
        }
      });
      return result;
    })
    .toProperty();
}

function filterObjectProperties(
  model: Reactodia.ElementModel,
  metadata: EntityMetadata
): Reactodia.ElementModel {
  const filteredProperties: Record<
    Reactodia.PropertyTypeIri,
    ReadonlyArray<Reactodia.Rdf.NamedNode | Reactodia.Rdf.Literal>
  > = Object.create(null);

  for (const propertyIri in model.properties) {
    if (Object.prototype.hasOwnProperty.call(model.properties, propertyIri)) {
      const field = metadata.fieldByIri.get(propertyIri);
      if (!(field && isObjectProperty(field, metadata))) {
        filteredProperties[propertyIri] = model.properties[propertyIri];
      }
    }
  }
  return { ...model, properties: filteredProperties };
}
