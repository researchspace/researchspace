/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { FieldValue } from './FieldValues';

/**
 * Number of distinct, non-empty values held by the given fields of a form model.
 *
 * Counts come from the live form model, so they include unsaved additions and
 * removals. A value that appears in more than one field (e.g. an image that is
 * both the main representation and one of the other images) is counted once.
 * Fields missing from the model count as 0.
 *
 * A field can be a path into a composite field, e.g.
 * `entity_represents_range/represents_visualItem_domain`, which counts one per row:
 *  - a saved row counts by its own IRI, whether or not its nested fields have
 *    loaded yet (saved rows arrive as plain IRIs and are expanded into composites
 *    asynchronously after the form itself reports its values loaded);
 *  - an unsaved row has no identity yet (placeholder subject ''), so it counts by
 *    what it links to through the rest of the path: one per linked value, and
 *    0 while it links nothing (an empty or just-opened row).
 */
export function countFieldValues(model: FieldValue | undefined, fields: ReadonlyArray<string>): number {
  if (!model || !FieldValue.isComposite(model) || !fields || fields.length === 0) {
    return 0;
  }
  const seen = new Set<string>();
  for (const field of fields) {
    collectValues(model, field.split('/').filter(step => step.length > 0), seen);
  }
  return seen.size;
}

function collectValues(composite: FieldValue, path: ReadonlyArray<string>, seen: Set<string>) {
  if (path.length === 0 || !FieldValue.isComposite(composite)) {
    return;
  }
  const state = composite.fields.get(path[0]);
  if (!state) {
    return;
  }
  const rest = path.slice(1);
  state.values.forEach(value => {
    if (rest.length > 0) {
      if (FieldValue.isAtomic(value)) {
        seen.add(value.value.toString());           // saved row, not expanded yet
      } else if (FieldValue.isComposite(value) && value.subject.value.length > 0) {
        seen.add(value.subject.toString());         // saved row
      } else {
        collectValues(value, rest, seen);           // unsaved row: count what it links to
      }
    } else if (FieldValue.isAtomic(value)) {
      seen.add(value.value.toString());
    } else if (FieldValue.isComposite(value) && value.subject.value.length > 0) {
      // A placeholder subject ('') is an unsaved row without identity: count rows
      // through a path to what they link to instead.
      seen.add(value.subject.toString());
    }
  });
}

/** Accepts the `count-fields` attribute as a JSON array or a space/comma separated list. */
export function parseCountFields(fields: string | ReadonlyArray<string> | undefined | null): string[] {
  if (!fields) {
    return [];
  }
  if (Array.isArray(fields)) {
    return fields.filter(field => typeof field === 'string' && field.length > 0);
  }
  return String(fields).split(/[\s,]+/).filter(field => field.length > 0);
}

/** Screen-reader suffix for a count badge: " item" / " items". */
export function itemsLabel(count: number): string {
  return count === 1 ? ' item' : ' items';
}
