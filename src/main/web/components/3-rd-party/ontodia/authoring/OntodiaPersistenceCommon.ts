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
import * as Immutable from 'immutable';
import * as Reactodia from '@reactodia/workspace';

import { Rdf } from 'platform/api/rdf';

import { CompositeValue, EmptyValue, FieldState, FieldValue, FieldError, queryValues } from 'platform/components/forms';

import { EntityMetadata, isObjectProperty } from './FieldConfigurationCommon';

export function fetchInitialModel(
  subject: Rdf.Iri,
  metadata: EntityMetadata,
  fieldsToFetch = metadata.fieldByIri
): Kefir.Property<CompositeValue> {
  const initial: CompositeValue = {
    type: CompositeValue.type,
    subject,
    definitions: metadata.fieldByIri,
    fields: Immutable.Map<string, FieldState>(),
    errors: FieldError.noErrors,
  };

  const valuesFetching = fieldsToFetch.toArray().map((definition) =>
    queryValues(definition.selectPattern, subject).map((bindings) => {
      const values = bindings.map((b) => FieldValue.fromLabeled(b));
      const state = FieldState.set(FieldState.empty, { values: Immutable.List(values) });
      return [definition.id, state] as [string, FieldState];
    })
  );

  return Kefir.zip(valuesFetching)
    .map((fields) => {
      const nonEmpty = fields.filter(([id, state]) => state.values.size > 0);
      return CompositeValue.set(initial, { fields: Immutable.Map(nonEmpty) });
    })
    .toProperty();
}

export function getEntityMetadata(
  elementData: Reactodia.ElementModel,
  allMetadata: ReadonlyMap<string, EntityMetadata>
): EntityMetadata | undefined {
  for (const type of elementData.types) {
    if (allMetadata.get(type)) {
      return allMetadata.get(type);
    }
  }
  return undefined;
}

export function convertElementModelToCompositeValue(
  model: Reactodia.ElementModel,
  metadata: EntityMetadata
): CompositeValue {
  const fields = Immutable.Map<string, FieldState>().withMutations((map) => {
    metadata.fieldByIri.forEach((definition, fieldId) => {
      let fieldValues: FieldValue[] = [];
      if (definition.iri === metadata.typeField.iri) {
        fieldValues = model.types.map((type) => FieldValue.fromLabeled({ value: Rdf.iri(type) }));
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
    definitions: metadata.fieldByIri,
    fields,
    errors: FieldError.noErrors,
  };
}

export function convertCompositeValueToElementModel(
  composite: CompositeValue,
  metadata: EntityMetadata
): Reactodia.ElementModel {
  let types: Reactodia.ElementTypeIri[] | undefined;
  const properties: { [id: string]: Array<Reactodia.Rdf.NamedNode | Reactodia.Rdf.Literal> } =
    Object.create(null);

  composite.fields.forEach((field, fieldId) => {
    const definition = metadata.fieldByIri.get(fieldId);
    if (definition.iri === metadata.typeField.iri) {
      types = field.values
        .map(FieldValue.asRdfNode)
        .filter((v) => v && v.isIri())
        .map((v): Reactodia.ElementTypeIri => v.value)
        .toArray();
    } else {
      field.values.forEach((v) => {
        if (!FieldValue.isAtomic(v)) {
          return;
        }
        let propertyValues = properties[definition.iri];
        if (!propertyValues) {
          propertyValues = [];
          properties[definition.iri] = propertyValues;
        }
        if (v.value.isLiteral()) {
          propertyValues.push(FieldValue.asRdfNode(v) as Rdf.Literal);
        } else if (v.value.isIri()) {
          propertyValues.push(FieldValue.asRdfNode(v) as Rdf.Iri);
        }
      });
    }
  });

  return {
    id: composite.subject.value,
    types: types || [],
    properties,
  };
}

export function applyEventsToCompositeValue(params: {
  elementIri: Reactodia.ElementIri;
  state: Reactodia.AuthoringState;
  metadata: EntityMetadata;
  initialModel: CompositeValue;
}): CompositeValue | EmptyValue {
  const { elementIri, state, metadata, initialModel } = params;

  let currentModel = initialModel;
  let deleted = false;
  let newIri: Reactodia.ElementIri;

  state.elements.forEach((event) => {
    if (event.type === 'entityDelete') {
      const { data } = event;
      if (data.id === elementIri) {
        deleted = true;
      }
    } else {
      const { data } = event;
      if (data.id === elementIri) {
        currentModel = applyElementModelToCompositeValue(data, currentModel, metadata);
        newIri = event.type === 'entityChange' && event.newIri !== currentModel.subject.value
          ? event.newIri : undefined;
      }
    }
  });

  state.links.forEach((event) => {
    if (event.type === 'relationDelete') {
      const { data } = event;
      if (data.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(data, currentModel, metadata);
      }
    } else {
      const { data } = event;
      if (event.type === 'relationChange' && event.before.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(event.before, currentModel, metadata);
      }
      if (data.sourceId === elementIri) {
        currentModel = applyLinkModelToCompositeValue(data, currentModel, metadata);
      }
    }
  });

  // Filter out fields or field values whose target(value) was deleted
  const existingFields = currentModel.fields;
  existingFields.forEach((field, fieldId) => {
    const updater = (previous: FieldState) => {
      const newValueSet = previous.values
        .filter((value) => {
          const relatedElementIri: Reactodia.ElementIri = FieldValue.asRdfNode(value).value;
          const event = state.elements.get(relatedElementIri);
          const isTargetValueDeleted = event && event.type === 'entityDelete';
          return !isTargetValueDeleted;
        })
        .toList();
      return FieldState.set(previous, { values: newValueSet });
    };
    const newFieldSet = currentModel.fields.update(fieldId, updater);
    currentModel = CompositeValue.set(currentModel, { fields: newFieldSet });
  });

  if (newIri) {
    currentModel = {
      ...currentModel,
      subject: new Rdf.Iri(newIri),
    };
  }

  return deleted ? FieldValue.empty : currentModel;
}

function applyLinkModelToCompositeValue(
  link: Reactodia.LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata
): CompositeValue {
  const value = Rdf.iri(link.targetId);
  const definition = metadata.fieldByIri.get(link.linkTypeId);
  if (!definition) {
    return composite;
  }
  const fields = composite.fields.update(definition.id, (previous = FieldState.empty) =>
    FieldState.set(previous, {
      values: previous.values.push(FieldValue.fromLabeled({ value })),
    })
  );
  return CompositeValue.set(composite, { fields });
}

function applyElementModelToCompositeValue(
  model: Reactodia.ElementModel,
  composite: CompositeValue,
  metadata: EntityMetadata
): CompositeValue {
  let fields = composite.fields;

  metadata.fieldByIri.forEach((definition, fieldIri) => {
    if (isObjectProperty(definition, metadata)) {
      return;
    }
    let values = [];
    if (definition.id === metadata.typeField.id) {
      values = model.types.map((type) => FieldValue.fromLabeled({ value: Rdf.iri(type) }));
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

  return CompositeValue.set(composite, { fields });
}

function convertPropertyToFieldValues(
  values: ReadonlyArray<Reactodia.Rdf.NamedNode | Reactodia.Rdf.Literal>
): FieldValue[] {
  return values.map(v => FieldValue.fromLabeled({ value: Rdf.toNode(v) as Rdf.Iri | Rdf.Literal }));
}

function deleteLinkFromCompositeValue(
  link: Reactodia.LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata
): CompositeValue {
  const definition = metadata.fieldByIri.get(link.linkTypeId);
  if (!composite.fields.has(definition.id)) {
    return composite;
  }
  const fields = composite.fields.update(definition.id, (previous) =>
    FieldState.set(previous, {
      values: previous.values.filter((v) => FieldValue.asRdfNode(v).value !== link.targetId).toList(),
    })
  );
  return CompositeValue.set(composite, { fields });
}
