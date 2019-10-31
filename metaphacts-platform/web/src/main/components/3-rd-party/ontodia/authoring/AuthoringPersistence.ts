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
import * as Immutable from 'immutable';
import {
  ElementIri, ElementTypeIri, ElementModel, LinkModel, AuthoringState, AuthoringKind,
  ElementChange, LinkChange, LocalizedString, Property, ElementDeletion, LinkDeletion,
  isIriProperty, isLiteralProperty,
} from 'ontodia';

import { Rdf, vocabularies } from 'platform/api/rdf';

import {
  CompositeValue, EmptyValue, FieldDefinition, TriplestorePersistence, FieldState, FieldValue,
  FieldError, queryValues, generateSubjectByTemplate, normalizeFieldDefinition,
  computeValuePatch,
} from 'platform/components/forms';

import { EntityMetadata, EntityParent, isObjectProperty } from './OntodiaEntityMetadata';

export function persistAuthoringState(params: {
  persistence: TriplestorePersistence;
  allMetadata: ReadonlyMap<ElementTypeIri, EntityMetadata>;
  state: AuthoringState;
  existingModels: ReadonlyMap<ElementIri, ElementModel>;
  fetchModel: (iri: ElementIri) => Kefir.Property<ElementModel>;
}): Kefir.Property<Map<ElementIri, ElementModel | null>> {
  const {persistence, allMetadata, state, existingModels, fetchModel} = params;

  const generatedIris = new Map<ElementIri, Rdf.Iri>();

  function generateSubjectForNewEntity(iri: ElementIri): Rdf.Iri | undefined {
    const alreadyGeneratedIri = generatedIris.get(iri);
    if (alreadyGeneratedIri) {
      return alreadyGeneratedIri;
    }
    const event = state.index.elements.get(iri);
    if (!event) { return; }
    const {after} = event as ElementChange;
    const metadata = getEntityMetadata(after, allMetadata);
    if (!metadata) {
      throw Error(`Metadata are not defined for any of '${after.types}' types`);
    }
    const parent = metadata.parent ? findConnectedParent(iri, metadata.parent) : undefined;
    const composite = convertElementModelToCompositeValue(after, metadata);
    const subject = generateSubjectByTemplate(
      metadata.newSubjectTemplate,
      parent ? Rdf.iri(parent) : undefined,
      CompositeValue.set(composite, {subject: Rdf.iri('')}),
    );
    generatedIris.set(after.id, subject);
  }

  function findConnectedParent(target: ElementIri, link: EntityParent): ElementIri | undefined {
    for (const e of state.events) {
      if (e.type !== AuthoringKind.ChangeLink) { return; }
      const {after} = e as LinkChange;
      if (after.linkTypeId === link.fieldIri && after.targetId === target) {
        const sourceModel = existingModels.get(after.sourceId);
        if (sourceModel && sourceModel.types.indexOf(link.type) >= 0) {
          return sourceModel.id;
        }
      }
    }
  }

  const toFetch = new Set<ElementIri>();
  const changed = new Set<ElementIri>();

  state.events.forEach(event => {
    if (event.type === AuthoringKind.ChangeElement) {
      const {before, after} = event as ElementChange;
      if (before) {
        if (after.id !== before.id) {
          throw new Error(`Changing IRIs of existing entities is not supported`);
        }
        changed.add(after.id);
        toFetch.add(after.id);
      } else {
        changed.add(after.id);
        generateSubjectForNewEntity(after.id);
      }
    } else if (event.type === AuthoringKind.ChangeLink) {
      const {before, after} = event as LinkChange;
      if (before) {
        changed.add(before.sourceId);
        toFetch.add(before.sourceId);
        toFetch.add(before.targetId);
      }
      changed.add(after.sourceId);
      toFetch.add(after.sourceId);
      toFetch.add(after.targetId);
    } else if (event.type === AuthoringKind.DeleteElement) {
      const {model} = event as ElementDeletion;
      changed.add(model.id);
      toFetch.add(model.id);
    } else if (event.type === AuthoringKind.DeleteLink) {
      const {model} = event as LinkDeletion;
      changed.add(model.sourceId);
      toFetch.add(model.sourceId);
      toFetch.add(model.targetId);
    }
  });

  function getNewElementModel(elementIri: ElementIri) {
    const event = state.index.elements.get(elementIri);
    if (event && event.type === AuthoringKind.ChangeElement) {
      const {before, after} = event as ElementChange;
      if (!before) {
        return after;
      }
    }
    return undefined;
  }

  return fetchEntities(toFetch, allMetadata, existingModels, fetchModel).flatMap(initials => {
    const shallowPrevious = new Map<ElementIri, EntityState>();
    const shallowCurrent = new Map<ElementIri, EntityState>();

    changed.forEach(elementIri => {
      const initial = initials.get(elementIri);
      const newElementModel = getNewElementModel(elementIri);
      let previousState: EntityState;
      let currentState: EntityState;

      if (newElementModel) {
        const metadata = getEntityMetadata(newElementModel, allMetadata);
        let current: CompositeValue | EmptyValue =
          convertElementModelToCompositeValue(newElementModel, metadata);
        current = applyEventsToCompositeValue({
          elementIri, state, metadata, initialModel: current, generatedIris,
        });
        if (FieldValue.isComposite(current) && generatedIris.has(newElementModel.id)) {
          const subject = generatedIris.get(newElementModel.id);
          current = CompositeValue.set(current, {subject});
        }
        const iri = newElementModel.id;
        previousState = {iri, metadata, value: FieldValue.empty};
        currentState = {iri, metadata, value: current};
      } else if (initial) {
        const {model, value: initialModel} = initial;
        const metadata = getEntityMetadata(model, allMetadata);
        const current = applyEventsToCompositeValue({
          elementIri, state, metadata, initialModel, generatedIris,
        });
        const iri = model.id;
        previousState = {iri, metadata, value: initialModel};
        currentState = {iri, metadata, value: current};
      } else {
        throw new Error(`Failed to load intial state for entity <${elementIri}>`);
      }
      shallowPrevious.set(elementIri, previousState);
      shallowCurrent.set(elementIri, currentState);
    });

    const deepPrevious = composeContainerTrees(shallowPrevious, allMetadata);
    const deepCurrent = composeContainerTrees(shallowCurrent, allMetadata);
    if (deepPrevious.size !== deepCurrent.size) {
      console.error('Different diff lengths!');
    }

    // DEBUG LOG
    deepPrevious.forEach((previous, iri) => {
      const current = deepCurrent.get(iri);
      console.log(iri, computeValuePatch(previous.value, current.value));
      console.log('previous', computeValuePatch(FieldValue.empty, previous.value));
      console.log('current', computeValuePatch(FieldValue.empty, current.value));
    });

    const result = new Map<ElementIri, ElementModel>();
    shallowCurrent.forEach((current, elementIri) => {
      const {value, metadata} = current;
      const model = FieldValue.isComposite(value)
        ? convertCompositeValueToElementModel(value, metadata) : null;
      result.set(elementIri, model);
    });

    return Kefir.zip(
      Array.from(deepPrevious.values(), previousState => {
        const currentState = deepCurrent.get(previousState.iri);
        return persistence.persist(previousState.value, currentState.value);
      })
    ).map(() => result);
  }).toProperty();
}

interface IntialEntityData {
  model: ElementModel;
  value: CompositeValue;
}

interface EntityState {
  iri: ElementIri;
  metadata: EntityMetadata;
  value: CompositeValue | EmptyValue;
}

function fetchEntities(
  entities: ReadonlySet<ElementIri>,
  allMetadata: ReadonlyMap<ElementTypeIri, EntityMetadata>,
  existingModels: ReadonlyMap<ElementIri, ElementModel>,
  fetchModel: (iri: ElementIri) => Kefir.Property<ElementModel>,
): Kefir.Property<Map<ElementIri, IntialEntityData>> {
  const result = new Map<ElementIri, IntialEntityData>();

  const tasks = Array.from(entities as Set<ElementIri>, iri => {
    const existing = existingModels.get(iri);
    const fetchingModel = existing ? Kefir.constant(existing) : fetchModel(iri);
    return fetchingModel.flatMap((model): Kefir.Property<IntialEntityData | undefined> => {
        const metadata = getEntityMetadata(model, allMetadata);
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

  return Kefir.zip(tasks).map(entities => {
    const result = new Map<ElementIri, IntialEntityData>();
    entities.forEach(entity => {
      if (entity) {
        result.set(entity.model.id, entity);
      }
    });
    return result;
  }).toProperty();
}

export function convertElementModelToCompositeValue(
  model: ElementModel,
  metadata: EntityMetadata,
): CompositeValue {
  const fields = Immutable.Map<string, FieldState>().withMutations(map => {
    metadata.fieldById.forEach((definition, fieldId) => {
      let fieldValues: FieldValue[] = [];
      if (definition.iri === metadata.typeField.iri) {
        fieldValues = model.types.map(type =>
          FieldValue.fromLabeled({value: Rdf.iri(type)})
        );
      } else if (metadata.imageField && definition.iri === metadata.imageField.iri) {
        fieldValues = model.image ? [FieldValue.fromLabeled({value: Rdf.iri(model.image)})] : [];
      } else if (definition.iri === metadata.labelField.iri) {
        fieldValues = convertLocalizedStringsToFieldValues(model.label.values);
      } else {
        const property = model.properties[definition.iri];
        if (property) {
          fieldValues = convertPropertyToFieldValues(property);
        }
      }
      map.set(fieldId, {
        values: Immutable.List(fieldValues),
        errors: FieldError.noErrors,
      });
    });
  });

  return {
    type: CompositeValue.type,
    subject: Rdf.iri(model.id),
    definitions: metadata.fieldById,
    fields,
    errors: FieldError.noErrors,
  };
}

export function convertCompositeValueToElementModel(
  composite: CompositeValue,
  metadata: EntityMetadata,
): ElementModel {
  let types: ElementTypeIri[] | undefined;
  let labels: LocalizedString[] | undefined;
  let image: string | undefined;
  const properties: { [id: string]: Property } = {};

  composite.fields.forEach((field, fieldId) => {
    const definition = metadata.fieldById.get(fieldId);
    if (definition.iri === metadata.typeField.iri) {
      types = field.values
        .map(FieldValue.asRdfNode)
        .filter(v => v && v.isIri())
        .map(v => v.value as ElementTypeIri)
        .toArray();
    } else if (metadata.imageField && definition.iri === metadata.imageField.iri) {
      image = field.values
        .map(FieldValue.asRdfNode)
        .filter(v => v && v.isIri())
        .map(v => v.value)
        .first();
    } else if (definition.iri === metadata.labelField.iri) {
      labels = field.values.map(v => {
        if (FieldValue.isAtomic(v) && v.value.isLiteral()) {
          const {value: text, language: lang} = FieldValue.asRdfNode(v) as Rdf.Literal;
          return {text, lang};
        }
      }).toArray();
    } else {
      field.values.forEach(v => {
        if (!FieldValue.isAtomic(v)) { return; }
        if (v.value.isLiteral()) {
          const {value: text, language: lang} = FieldValue.asRdfNode(v) as Rdf.Literal;
          const property = properties[definition.iri] || {type: 'string', values: []};
          if (isLiteralProperty(property)) {
            property.values = [...property.values, {
              text, lang,
              datatype: definition.xsdDatatype ? definition.xsdDatatype.value : undefined,
            }];
          }
          properties[definition.iri] = property;
        } else if (v.value.isIri()) {
          const {value} = FieldValue.asRdfNode(v) as Rdf.Iri;
          const property = properties[definition.iri] || {type: 'uri', values: []};
          if (isIriProperty(property)) {
            property.values = [...property.values, {type: 'uri', value}];
          }
          properties[definition.iri] = property;
        }
      });
    }
  });

  return {
    id: composite.subject.value as ElementIri,
    types: types || [],
    label: {values: labels || []},
    image,
    properties,
  };
}

export function applyEventsToCompositeValue(params: {
  elementIri: ElementIri;
  state: AuthoringState;
  metadata: EntityMetadata;
  initialModel: CompositeValue;
  generatedIris: ReadonlyMap<ElementIri, Rdf.Iri>;
}): CompositeValue | EmptyValue {
  const {elementIri, state, metadata, initialModel, generatedIris} = params;

  let currentModel = initialModel;
  let deleted = false;

  state.events.forEach(event => {
    if (event.type === AuthoringKind.ChangeElement) {
      const {after} = event as ElementChange;
      if (after.id === elementIri) {
        currentModel = applyElementModelToCompositeValue(after, currentModel, metadata);
      }
    } else if (event.type === AuthoringKind.ChangeLink) {
      const {before, after} = event as LinkChange;
      if (before && before.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(before, currentModel, metadata);
      }
      if (after.sourceId === elementIri) {
        currentModel = applyLinkModelToCompositeValue(after, currentModel, metadata, generatedIris);
      }
    } else if (event.type === AuthoringKind.DeleteElement) {
      const {model} = event as ElementDeletion;
      if (model.id === elementIri) {
        deleted = true;
      }
    } else if (event.type === AuthoringKind.DeleteLink) {
      const {model} = event as LinkDeletion;
      if (model.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(model, currentModel, metadata);
      }
    }
  });

  // Filter out fields or field values whose target(value) was deleted
  const existingFields = currentModel.fields;
  existingFields.forEach((field, fieldId) => {
    const updater = (previous: FieldState) => {
      const newValueSet = previous.values.filter(value => {
        const relatedElementIri = FieldValue.asRdfNode(value).value as ElementIri;
        const event = state.index.elements.get(relatedElementIri);
        const isTargetValueDeleted = event && event.type === AuthoringKind.DeleteElement;
        return !isTargetValueDeleted;
      }).toList();
      return FieldState.set(previous, { values: newValueSet });
    };
    const newFieldSet = currentModel.fields.update(fieldId, updater);
    currentModel = CompositeValue.set(currentModel, {fields: newFieldSet});
  });

  return deleted ? FieldValue.empty : currentModel;
}

export function getEntityMetadata(
  elementData: ElementModel, allMetadata: ReadonlyMap<string, EntityMetadata>
): EntityMetadata | undefined {
  for (const type of elementData.types) {
    if (allMetadata.get(type)) {
      return allMetadata.get(type);
    }
  }
  return undefined;
}

function getEntitySubject(state: AuthoringState, elementIri: ElementIri): Rdf.Iri {
  let subject: string = elementIri;

  const event = state.index.elements.get(elementIri);
  if (event && event.type === AuthoringKind.ChangeElement && !(event as ElementChange).before) {
    subject = '';
  }

  return Rdf.iri(subject);
}

export function fetchInitialModel(subject: Rdf.Iri, metadata: EntityMetadata) {
  const initial: CompositeValue = {
    type: CompositeValue.type,
    subject,
    definitions: metadata.fieldById,
    fields: Immutable.Map<string, FieldState>(),
    errors: FieldError.noErrors,
  };

  const valuesFetching = metadata.fieldById.toArray().map(definition =>
    queryValues(definition.selectPattern, subject).map(bindings => {
      const values = bindings.map(b => FieldValue.fromLabeled(b));
      const state = FieldState.set(FieldState.empty, {values: Immutable.List(values)});
      return [definition.id, state] as [string, FieldState];
    })
  );

  return Kefir.zip(valuesFetching).map(fields => {
    const nonEmpty = fields.filter(([id, state]) => state.values.size > 0);
    return CompositeValue.set(initial, {fields: Immutable.Map(nonEmpty)})
  }).toProperty();
}

function applyLinkModelToCompositeValue(
  link: LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata,
  generatedIris: ReadonlyMap<ElementIri, Rdf.Iri>,
): CompositeValue {
  const value = generatedIris.get(link.targetId) || Rdf.iri(link.targetId);
  const definition = metadata.fieldByIri.get(link.linkTypeId);
  if (!definition) {
    return composite;
  }
  const fields = composite.fields.update(
    definition.id,
    (previous = FieldState.empty) => FieldState.set(previous, {
      values: previous.values.push(
        FieldValue.fromLabeled({value})
      ),
    })
  );
  return CompositeValue.set(composite, {fields});
}

function applyElementModelToCompositeValue(
  model: ElementModel,
  composite: CompositeValue,
  metadata: EntityMetadata,
): CompositeValue {
  let fields = composite.fields;

  metadata.fieldByIri.forEach((definition, fieldIri) => {
    if (isObjectProperty(definition, metadata)) { return; }
    let values = [];
    if (definition.id === metadata.labelField.id) {
      values = convertLocalizedStringsToFieldValues(model.label.values);
    } else if (definition.id === metadata.typeField.id) {
      values = model.types.map(type => FieldValue.fromLabeled({value: Rdf.iri(type)}));
    } else if (metadata.imageField && definition.id === metadata.imageField.id && model.image) {
      values = [FieldValue.fromLabeled({value: Rdf.iri(model.image)})];
    } else {
      const property = model.properties[fieldIri];
      if (property) {
        values = convertPropertyToFieldValues(property);
      }
    }
    fields = fields.set(definition.id, {
      values: Immutable.List(values),
      errors: FieldError.noErrors,
    });
  });

  return CompositeValue.set(composite, {fields});
}

function convertPropertyToFieldValues(property: Property): FieldValue[] {
  if (isIriProperty(property)) {
    return property.values.map(({value}) =>
      FieldValue.fromLabeled({value: Rdf.iri(value)})
    );
  } else if (isLiteralProperty(property)) {
    return convertLocalizedStringsToFieldValues(property.values);
  }
  return [];
}

function convertLocalizedStringsToFieldValues(property: ReadonlyArray<LocalizedString>) {
  return property.map(({text, lang, datatype}) => {
    const value = lang === '' ? Rdf.literal(text, datatype ? Rdf.iri(datatype): undefined) : Rdf.langLiteral(text, lang);
    return FieldValue.fromLabeled({value});
  });
}

function deleteLinkFromCompositeValue(
  link: LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata,
): CompositeValue {
  const definition = metadata.fieldByIri.get(link.linkTypeId);
  if (!composite.fields.has(definition.id)) {
    return composite;
  }
  const fields = composite.fields.update(
    definition.id,
    previous => FieldState.set(previous, {
      values: previous.values
        .filter(v => FieldValue.asRdfNode(v).value !== link.targetId)
        .toList()
    })
  );
  return CompositeValue.set(composite, {fields});
}

function composeContainerTrees(
  diffs: ReadonlyMap<ElementIri, EntityState>,
  allMetadata: ReadonlyMap<ElementTypeIri, EntityMetadata>,
): Map<ElementIri, EntityState> {
  const roots = Array.from((diffs as Map<ElementIri, EntityState>).values())
    .filter(diff => !diff.metadata.parent);

  const composedEnitites = new Map<ElementIri, EntityState>();

  function composeEntity(entity: EntityState): EntityState {
    if (composedEnitites.has(entity.iri)) {
      return;
    }

    const {value} = entity;
    if (FieldValue.isEmpty(value)) {
      composedEnitites.set(entity.iri, entity);
      return entity;
    }

    let {fields} = value;
    fields.forEach(({values}, fieldIri) => {
      let valuesChanged = false;
      const newValues = values.map(v => {
        if (FieldValue.isAtomic(v)) {
          const target = v.value;

          const diff = diffs.get(target.value as ElementIri);
          const parent = diff ? diff.metadata.parent : undefined;
          const isCompatibleParent = parent
            && parent.fieldIri === fieldIri
            && parent.type === entity.metadata.entityType;
          if (target.isIri() && isCompatibleParent && !composedEnitites.has(diff.iri)) {
            const composed = composeEntity(diff);
            return composed.value;
          }
        }
        return v;
      });
      if (valuesChanged) {
        fields = fields.update(
          fieldIri, previous => FieldState.set(previous, {values: newValues})
        );
      }
    });

    let result = entity;
    if (fields !== value.fields) {
      result = {
        ...entity,
        value: CompositeValue.set(value, {fields}),
      };
    }
    return result;
  }

  const composedRoots = new Map<ElementIri, EntityState>();
  for (const root of roots) {
    const composedRoot = composeEntity(root);
    composedRoots.set(composedRoot.iri, composedRoot);
  }
  return composedRoots;
}
