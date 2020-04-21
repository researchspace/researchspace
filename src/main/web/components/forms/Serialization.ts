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

import * as Immutable from 'immutable';

import { Rdf, turtle } from 'platform/api/rdf';

import { FieldDefinition } from './FieldDefinition';
import { FieldValue, CompositeValue, AtomicValue, EmptyValue, FieldState, FieldError } from './FieldValues';

export type ValuePatch = CompositePatch | AtomicPatch | null;

interface CompositePatch {
  readonly type: typeof CompositeValue.type;
  /** RDF IRI represented in the N3 format */
  readonly subject: string;
  /** RDF node represented in the N3 format */
  readonly discriminator?: string;
  readonly fields: { readonly [fieldId: string]: FieldPatch };
}

interface FieldPatch {
  readonly baseLength: number;
  readonly values: ReadonlyArray<ValuePatch>;
}

interface AtomicPatch {
  readonly type: typeof AtomicValue.type;
  /** RDF node represented in the N3 format */
  readonly value: string;
  readonly label: string | undefined;
}

export function computeValuePatch(base: FieldValue, changed: FieldValue): ValuePatch {
  if (FieldValue.isEmpty(changed)) {
    return null;
  }
  if (base.type !== changed.type) {
    return asPatch(changed);
  }
  switch (base.type) {
    case AtomicValue.type:
      const changedAtomic = changed as AtomicValue;
      const isEqual = base.value.equals(changedAtomic.value) && base.label === changedAtomic.label;
      return isEqual ? null : asPatch(changedAtomic);
    case CompositeValue.type:
      return computeCompositePatch(base, changed as CompositeValue);
  }
  FieldValue.unknownFieldType(base);
}

function computeCompositePatch(base: CompositeValue, changed: CompositeValue): ValuePatch {
  if (!equalRdfTerms(base.discriminator, changed.discriminator)) {
    return asPatch(changed);
  }

  const visited: { [fieldId: string]: true } = {};
  const patchFields: { [fieldId: string]: FieldPatch } = {};
  let hasAtLeastOnePatch = false;

  const visit = (fieldId: string, baseState: FieldState | undefined, changedState: FieldState | undefined) => {
    if (visited[fieldId]) {
      return;
    }
    visited[fieldId] = true;

    if (!baseState && changedState) {
      const values = changedState.values.map(asPatch).toArray();
      patchFields[fieldId] = { baseLength: values.length, values };
      hasAtLeastOnePatch = true;
    } else if (baseState && changedState) {
      const statePatch = computeFieldPatch(baseState, changedState);
      if (statePatch.values.some((p) => p !== null)) {
        patchFields[fieldId] = statePatch;
        hasAtLeastOnePatch = true;
      }
    }
  };

  base.fields.forEach((baseState, fieldId) => visit(fieldId, baseState, changed.fields.get(fieldId)));
  changed.fields.forEach((changedState, fieldId) => visit(fieldId, base.fields.get(fieldId), changedState));

  return hasAtLeastOnePatch
    ? {
        type: CompositeValue.type,
        subject: turtle.serialize.nodeToN3(changed.subject),
        fields: patchFields,
      }
    : null;
}

function equalRdfTerms(a: Rdf.Node | null | undefined, b: Rdf.Node | null | undefined): boolean {
  return !a ? !b : !b ? !a : a.equals(b);
}

function computeFieldPatch(base: FieldState, changed: FieldState): FieldPatch {
  const values = changed.values
    .map((changedValue, index) => {
      const baseValue = base.values.get(index, FieldValue.empty);
      return computeValuePatch(baseValue, changedValue);
    })
    .toArray();
  return { baseLength: base.values.size, values };
}

function asPatch(value: FieldValue): ValuePatch {
  switch (value.type) {
    case EmptyValue.type:
      return null;
    case AtomicValue.type:
      return {
        type: AtomicValue.type,
        value: turtle.serialize.nodeToN3(value.value),
        label: value.label,
      };
    case CompositeValue.type:
      return {
        type: CompositeValue.type,
        subject: turtle.serialize.nodeToN3(value.subject),
        discriminator: value.discriminator ? turtle.serialize.nodeToN3(value.discriminator) : undefined,
        fields: value.fields
          .map(
            (state): FieldPatch => {
              const values = state.values.map(asPatch).toArray();
              return { baseLength: values.length, values };
            }
          )
          .toObject(),
      };
  }
  FieldValue.unknownFieldType(value);
}

export function applyValuePatch(base: FieldValue, patch: ValuePatch): FieldValue {
  if (!patch) {
    return base;
  }
  switch (base.type) {
    case EmptyValue.type:
      const value = asValue(patch);
      // prevent reusing exising entity from patch by clearing the subject
      return FieldValue.isComposite(value) ? CompositeValue.set(value, { subject: Rdf.iri('') }) : value;
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

function applyCompositePatch(base: CompositeValue, patch: CompositePatch): FieldValue {
  const patchDiscriminator = patch.discriminator ? tryDeserializeN3(patch.discriminator) : undefined;
  if (!equalRdfTerms(base.discriminator, patchDiscriminator)) {
    return asValue(patch);
  }

  if (!patch.fields) {
    return base;
  }

  const fields = base.fields
    .map((baseState, fieldId) => {
      const statePatch = patch.fields[fieldId];
      return statePatch ? applyFieldPatch(baseState, statePatch) : baseState;
    })
    .toMap();

  return CompositeValue.set(base, { fields });
}

function applyFieldPatch(base: FieldState, patch: FieldPatch): FieldState {
  const isValidValues = Array.isArray(patch.values);
  if (!isValidValues) {
    return base;
  }

  const values = patch.values.map((valuePatch, index) => {
    const baseValue = base.values.get(index, FieldValue.empty);
    return valuePatch ? applyValuePatch(baseValue, valuePatch) : baseValue;
  });

  return FieldState.set(base, { values: Immutable.List(values) });
}

function asValue(patch: ValuePatch): FieldValue {
  let isValid: boolean;
  switch (patch.type) {
    case AtomicValue.type:
      const nodeValue = tryDeserializeN3(patch.value);
      isValid =
        nodeValue &&
        (nodeValue.isLiteral() || nodeValue.isIri()) &&
        (typeof patch.label === 'undefined' || typeof patch.label === 'string');
      if (isValid) {
        return {
          type: AtomicValue.type,
          value: nodeValue,
          label: patch.label,
          errors: FieldError.noErrors,
        };
      }
      break;
    case CompositeValue.type:
      const subjectIri = tryDeserializeN3(patch.subject);
      if (subjectIri && subjectIri instanceof Rdf.Iri) {
        const states = Object.keys(patch.fields).map((fieldId): [string, FieldState] => {
          const statePatch = patch.fields[fieldId];
          const values =
            statePatch && Array.isArray(statePatch.values)
              ? statePatch.values.map((v) => (v ? asValue(v) : FieldValue.empty))
              : [];
          return [
            fieldId,
            {
              values: Immutable.List(values),
              errors: FieldError.noErrors,
            },
          ];
        });
        const discriminator = patch.discriminator ? tryDeserializeN3(patch.discriminator) : undefined;
        return {
          type: CompositeValue.type,
          definitions: Immutable.Map<string, FieldDefinition>(),
          subject: subjectIri,
          discriminator,
          fields: Immutable.Map<string, FieldState>(states),
          errors: FieldError.noErrors,
        };
      }
  }
  return FieldValue.empty;
}

function tryDeserializeN3(n3value: string): Rdf.Node | undefined {
  try {
    return turtle.deserialize.n3ValueToRdf(n3value);
  } catch (e) {
    console.warn('Encountered invalid N3 value while applying form patch', n3value);
    return undefined;
  }
}
