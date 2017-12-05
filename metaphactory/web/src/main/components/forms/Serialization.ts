/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';

import { FieldDefinition } from './FieldDefinition';
import {
  FieldValue, CompositeValue, AtomicValue, EmptyValue, FieldState, FieldError,
} from './FieldValues';

export type ValuePatch = CompositePatch | AtomicPatch | null;

interface CompositePatch {
  readonly type: typeof CompositeValue.type;
  readonly subject: Rdf.Iri;
  readonly fields: { readonly [fieldId: string]: FieldPatch }
}

interface FieldPatch {
  readonly baseLength: number;
  readonly values: ReadonlyArray<ValuePatch>;
}

interface AtomicPatch {
  readonly type: typeof AtomicValue.type;
  readonly value: Rdf.Node;
  readonly label: string | undefined;
}

export function computeValuePatch(base: FieldValue, changed: FieldValue): ValuePatch {
  if (FieldValue.isEmpty(changed)) { return null; }
  if (base.type !== changed.type) {
    return asPatch(changed);
  }
  switch (base.type) {
    case AtomicValue.type:
      const changedAtomic = changed as AtomicValue;
      const isEqual = base.value.equals(changedAtomic.value)
        && base.label === changedAtomic.label;
      return isEqual ? null : asPatch(changedAtomic);
    case CompositeValue.type:
      return computeCompositePatch(base, changed as CompositeValue);
  }
  FieldValue.unknownFieldType(base);
}

function computeCompositePatch(base: CompositeValue, changed: CompositeValue): CompositePatch {
  const visited: { [fieldId: string]: true } = {};
  const patchFields: { [fieldId: string]: FieldPatch } = {};
  let hasAtLeastOnePatch = false;

  const visit = (
    fieldId: string,
    baseState: FieldState | undefined,
    changedState: FieldState | undefined
  ) => {
    if (visited[fieldId]) { return; }
    visited[fieldId] = true;

    if (!baseState && changedState) {
      const values = changedState.values.map(asPatch).toArray();
      patchFields[fieldId] = {baseLength: values.length, values};
      hasAtLeastOnePatch = true;
    } else if (baseState && changedState) {
      const statePatch = computeFieldPatch(baseState, changedState);
      if (statePatch.values.some(p => p !== null)) {
        patchFields[fieldId] = statePatch;
        hasAtLeastOnePatch = true;
      }
    }
  };

  base.fields.forEach((baseState, fieldId) =>
    visit(fieldId, baseState, changed.fields.get(fieldId)));
  changed.fields.forEach((changedState, fieldId) =>
    visit(fieldId, base.fields.get(fieldId), changedState));

  return hasAtLeastOnePatch ? {
    type: CompositeValue.type,
    subject: changed.subject,
    fields: patchFields,
  } : null;
}

function computeFieldPatch(base: FieldState, changed: FieldState): FieldPatch {
  const values = changed.values.map((changedValue, index) => {
    const baseValue = base.values.get(index, FieldValue.empty);
    return computeValuePatch(baseValue, changedValue);
  }).toArray();
  return {baseLength: base.values.size, values};
}

function asPatch(value: FieldValue): ValuePatch {
  switch (value.type) {
    case EmptyValue.type: return null;
    case AtomicValue.type: return {
      type: AtomicValue.type,
      value: value.value,
      label: value.label,
    };
    case CompositeValue.type: return {
      type: CompositeValue.type,
      subject: value.subject,
      fields: value.fields.map((state): FieldPatch => {
        const values = state.values.map(asPatch).toArray();
        return {baseLength: values.length, values};
      }).toObject(),
    };
  }
  FieldValue.unknownFieldType(value);
}

export function applyValuePatch(base: FieldValue, patch: ValuePatch): FieldValue {
  if (!patch) { return base; }
  switch (base.type) {
    case EmptyValue.type:
      return asValue(patch);
    case AtomicValue.type:
      if (patch.type === AtomicValue.type) {
        return asValue(patch);
      }
      break;
    case CompositeValue.type:
      if (patch.type === CompositeValue.type) {
        return applyCompositePatch(base, patch);
      }
  }
  return base;
}

function applyCompositePatch(base: CompositeValue, patch: CompositePatch): CompositeValue {
  if (!patch.fields) { return base; }
  if (!base.subject.equals(patch.subject)) { return base; }

  const fields = base.fields.map((baseState, fieldId) => {
    const statePatch = patch.fields[fieldId];
    return statePatch ? applyFieldPatch(baseState, statePatch) : baseState;
  }).toMap();

  return CompositeValue.set(base, {fields});
}

function applyFieldPatch(base: FieldState, patch: FieldPatch): FieldState {
  const isValidValues = Array.isArray(patch.values);
  if (!isValidValues) { return base; }
  if (base.values.size > patch.baseLength) { return base; }

  const values = patch.values.map((valuePatch, index) => {
    const baseValue = base.values.get(index, FieldValue.empty);
    return valuePatch ? applyValuePatch(baseValue, valuePatch) : baseValue;
  });

  return FieldState.set(base, {values: Immutable.List(values)});
}

function asValue(patch: ValuePatch): FieldValue {
  let isValid: boolean;
  switch (patch.type) {
    case AtomicValue.type:
      isValid = patch.value instanceof Rdf.Node && (
        typeof patch.label === 'undefined' ||
        typeof patch.label === 'string'
      );
      if (isValid) {
        return {
          type: AtomicValue.type,
          value: patch.value,
          label: patch.label,
          errors: FieldError.noErrors,
        };
      }
      break;
    case CompositeValue.type:
      isValid = patch.subject instanceof Rdf.Node;
      if (isValid) {
        const states = Object.keys(patch.fields).map((fieldId): [string, FieldState] => {
          const statePatch = patch.fields[fieldId];
          const values = statePatch && Array.isArray(statePatch.values)
            ? statePatch.values.map(v => v ? asValue(v) : FieldValue.empty)
            : [];
          return [fieldId, {
            values: Immutable.List(values),
            errors: FieldError.noErrors,
          }];
        });
        return {
          type: CompositeValue.type,
          definitions: Immutable.Map<string, FieldDefinition>(),
          subject: patch.subject,
          fields: Immutable.Map<string, FieldState>(states),
          errors: FieldError.noErrors,
        };
      }
  }
  return FieldValue.empty;
}
