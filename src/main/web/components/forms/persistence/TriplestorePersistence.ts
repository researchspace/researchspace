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
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';

import { FieldDefinition } from '../FieldDefinition';
import { FieldValue, CompositeValue, EmptyValue } from '../FieldValues';

export interface TriplestorePersistence {
  persist(initialModel: CompositeValue | EmptyValue, currentModel: CompositeValue | EmptyValue): Kefir.Property<void>;

  remove(model: CompositeValue): Kefir.Property<void>;
}

export function isTriplestorePersistence(obj: any): obj is TriplestorePersistence {
  return obj && typeof obj === 'object' && typeof obj.persist === 'function';
}

export interface ModelDiffEntry {
  subject: Rdf.Iri;
  definition: FieldDefinition;
  deleted: ReadonlyArray<Rdf.Node>;
  inserted: ReadonlyArray<Rdf.Node>;
}

export function computeModelDiff(
  base: CompositeValue | EmptyValue,
  changed: CompositeValue | EmptyValue
): ModelDiffEntry[] {
  const result: ModelDiffEntry[] = [];
  // replace placeholder models with an empty ones to correctly handle default values
  // (otherwise fields with default values would be considered unchanged)
  const namedBaseOrEmpty = isPlaceholderComposite(base) ? FieldValue.empty : base;
  const namedChangedOrEmpty = isPlaceholderComposite(changed) ? FieldValue.empty : changed;
  collectCompositeDiff(namedBaseOrEmpty, namedChangedOrEmpty, result);
  return result;
}

function isPlaceholderComposite(value: FieldValue): value is CompositeValue {
  return FieldValue.isComposite(value) && CompositeValue.isPlaceholder(value.subject);
}

const EMPTY_VALUES = Immutable.List<FieldValue>();

function collectCompositeDiff(
  base: CompositeValue | EmptyValue,
  changed: CompositeValue | EmptyValue,
  result: ModelDiffEntry[]
) {
  

  if (FieldValue.isComposite(base)) {
    if (CompositeValue.isPlaceholder(base.subject)) {
      throw new Error('Cannot compute diff with placeholder base composite');
    }
    base.fields.forEach((state, fieldId) => {
      const definition = base.definitions.get(fieldId);
      const changedValues = getFieldValues(changed, fieldId);
      collectFieldDiff(base.subject, definition, state.values, changedValues, result);
    });
  }

  if (FieldValue.isComposite(changed)) {
    if (CompositeValue.isPlaceholder(changed.subject)) {
      throw new Error('Cannot compute diff with placeholder changed composite');
    }
    changed.fields.forEach((state, fieldId) => {
      if (FieldValue.isEmpty(base) || !base.fields.has(fieldId)) {
        const definition = changed.definitions.get(fieldId);
        collectFieldDiff(changed.subject, definition, EMPTY_VALUES, state.values, result);
      }
    });
  }
}

function getFieldValues(composite: CompositeValue | EmptyValue, fieldId: string): Immutable.List<FieldValue> {
  if (FieldValue.isEmpty(composite)) {
    return EMPTY_VALUES;
  }
  const state = composite.fields.get(fieldId);
  return state ? state.values : EMPTY_VALUES;
}

function collectFieldDiff(
  subject: Rdf.Iri,
  definition: FieldDefinition,
  base: Immutable.List<FieldValue>,
  changed: Immutable.List<FieldValue>,
  result: ModelDiffEntry[]
) {
  const baseSet = base
    .filterNot(field => FieldValue.isAtomic(field) && field.isForcedDefault)
    .map(FieldValue.asRdfNode)
    .filter((node) => node !== undefined)
    .toSet();
  const changedSet = changed
    .map(FieldValue.asRdfNode)
    .filter((node) => node !== undefined)
    .toSet();

  const deleted = baseSet.subtract(changedSet).toArray();
  const inserted = changedSet.subtract(baseSet).toArray();

  if (deleted.length > 0 || inserted.length > 0) {
    result.push({ subject, definition, deleted, inserted });
  }

  const baseComposites = pickComposites(base);
  const changedComposites = pickComposites(changed);

  baseComposites.forEach((baseComposite, subjectKey) => {
    const changedComposite = changedComposites.get(subjectKey) || FieldValue.empty;
    collectCompositeDiff(baseComposite, changedComposite, result);
  });
  changedComposites.forEach((changedComposite, subjectKey) => {
    if (!baseComposites.has(subjectKey)) {
      collectCompositeDiff(FieldValue.empty, changedComposite, result);
    }
  });
}

function pickComposites(values: Immutable.List<FieldValue>): Map<string, CompositeValue> {
  const result = new Map<string, CompositeValue>();
  values.forEach((value) => {
    if (FieldValue.isComposite(value) && !CompositeValue.isPlaceholder(value.subject)) {
      result.set(value.subject.value, value);
    }
  });
  return result;
}
