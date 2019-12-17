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
  ElementIri, ElementTypeIri, LocalizedString, Property, ElementModel, LinkModel, AuthoringState,
  isLiteralProperty, isIriProperty
} from 'ontodia';

import { Rdf } from 'platform/api/rdf';

import {
  CompositeValue, EmptyValue, FieldState, FieldValue, FieldError, queryValues,
} from 'platform/components/forms';

import { EntityMetadata, isObjectProperty } from './OntodiaEntityMetadata';

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
    return CompositeValue.set(initial, {fields: Immutable.Map(nonEmpty)});
  }).toProperty();
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

export function convertElementModelToCompositeValue(
  model: ElementModel,
  metadata: EntityMetadata
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
  metadata: EntityMetadata
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
          return FieldValue.asRdfNode(v) as Rdf.Literal;
        }
      }).toArray();
    } else {
      field.values.forEach(v => {
        if (!FieldValue.isAtomic(v)) { return; }
        if (v.value.isLiteral()) {
          const {value, language} = FieldValue.asRdfNode(v) as Rdf.Literal;
          const property = properties[definition.iri] || {type: 'string', values: []};
          if (isLiteralProperty(property)) {
            property.values = [...property.values, {
              value,
              language,
              datatype: definition.xsdDatatype,
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
}): CompositeValue | EmptyValue {
  const {elementIri, state, metadata, initialModel} = params;

  let currentModel = initialModel;
  let deleted = false;
  let newIri: ElementIri;

  state.elements.forEach(event => {
    if (event.deleted) {
      const {after} = event;
      if (after.id === elementIri) {
        deleted = true;
      }
    } else {
      const changeEvent = event;
      const {after} = changeEvent;
      if (after.id === elementIri) {
        currentModel = applyElementModelToCompositeValue(after, currentModel, metadata);
        newIri = changeEvent.newIri !== currentModel.subject.value ? changeEvent.newIri : undefined;
      }
    }
  });

  state.links.forEach(event => {
    if (event.deleted) {
      const {after} = event;
      if (after.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(after, currentModel, metadata);
      }
    } else {
      const {before, after} = event;
      if (before && before.sourceId === elementIri) {
        currentModel = deleteLinkFromCompositeValue(before, currentModel, metadata);
      }
      if (after.sourceId === elementIri) {
        currentModel = applyLinkModelToCompositeValue(after, currentModel, metadata);
      }
    }
  });

  // Filter out fields or field values whose target(value) was deleted
  const existingFields = currentModel.fields;
  existingFields.forEach((field, fieldId) => {
    const updater = (previous: FieldState) => {
      const newValueSet = previous.values.filter(value => {
        const relatedElementIri = FieldValue.asRdfNode(value).value as ElementIri;
        const event = state.elements.get(relatedElementIri);
        const isTargetValueDeleted = event && event.deleted;
        return !isTargetValueDeleted;
      }).toList();
      return FieldState.set(previous, { values: newValueSet });
    };
    const newFieldSet = currentModel.fields.update(fieldId, updater);
    currentModel = CompositeValue.set(currentModel, {fields: newFieldSet});
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
  link: LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata
): CompositeValue {
  const value = Rdf.iri(link.targetId);
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
  metadata: EntityMetadata
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
  return property.map(({value, language, datatype}) => {
    const literal = language
      ? Rdf.langLiteral(value, language)
      : Rdf.literal(value, datatype ? Rdf.iri(datatype.value) : undefined);
    return FieldValue.fromLabeled({value: literal});
  });
}

function deleteLinkFromCompositeValue(
  link: LinkModel,
  composite: CompositeValue,
  metadata: EntityMetadata
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
