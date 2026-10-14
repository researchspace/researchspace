/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

/**
 * Pure model behind `<tileset-3d-source>`: reading a manifest into items, merging the existence
 * intervals returned by a query, and deciding what each group shows at a given year.
 *
 * Deliberately free of Cesium, OpenLayers and platform imports, so the rules can be reasoned
 * about — and tested — on their own. Vocabulary is neutral: an *item* is one loadable geometry,
 * a *group* is the thing whose appearance changes over time (an object, a building, a site), and
 * the *years* of an item are the years in which that geometry was observed.
 */

/** One loadable geometry: a tileset URL plus the years it was observed in. */
export interface Tileset3dItem {
  id: string;
  group: string;
  url: string;
  years: number[];
}

/** An existence interval for a group, as returned by the temporal query. */
export interface Tileset3dInterval {
  /** The identifier as the query returned it, before matching it to a group. */
  identifier: string;
  start: number;
  end: number;
  footprint?: string;
  /** An item id that this interval asks to be shown, overriding the observed-year rule. */
  pinned?: string;
}

/** What a group, or an unmatched identifier, displays at a given year. */
export type Tileset3dSelection =
  | { kind: 'tileset'; itemId: string }
  | { kind: 'placeholder'; key: string; footprint: string };

export interface Tileset3dFieldMapping {
  /** Top-level collections of a field-mapped manifest to read. Empty means every top-level array. */
  sections: string[];
  idField: string;
  groupField: string;
  yearField: string;
  urlField: string;
  /** Builds the URL from item fields, e.g. `{base}{path}/tileset.json`. Overrides `urlField`. */
  urlTemplate?: string;
  /** Substituted for `{base}` in `urlTemplate`. */
  baseUrl?: string;
}

export interface Tileset3dRules {
  /** `snapshot`: the latest observed geometry not after the year. `exact`: only one observed that year. */
  selection: 'snapshot' | 'exact';
  /** For an existing group with no geometry observed yet: draw its footprint, its earliest geometry, or nothing. */
  beforeFirstObservation: 'placeholder' | 'earliest' | 'none';
  /** Intervals whose identifier matches no group: draw their footprint, or ignore them. */
  unmatched: 'placeholder' | 'none';
  /**
   * Separator of hierarchical identifiers. An identifier with no group of exactly that id is
   * matched to the group named by its longest prefix ending before a separator. Empty disables
   * the fallback, so only exact ids match.
   */
  identifierSeparator: string;
}

export interface Tileset3dModelState {
  items: Tileset3dItem[];
  /** Intervals matched to a group, by group id. */
  intervalsByGroup: { [group: string]: Tileset3dInterval[] };
  /** Intervals that matched no group, by identifier. */
  unmatchedByIdentifier: { [identifier: string]: Tileset3dInterval[] };
}

export interface Tileset3dSelectionResult {
  /** Selection per group; a group missing from the map shows nothing. */
  groups: { [group: string]: Tileset3dSelection };
  /** Placeholders for identifiers that matched no group. */
  unmatched: Tileset3dSelection[];
}

const YEAR = /^\s*(-?\d+)/;

/** The leading (possibly negative) year of a date-like value: `1870`, `"1870-01-01"`, `"1870"`. */
export function parseYear(value: any): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const match = YEAR.exec(String(value));
  return match ? parseInt(match[1], 10) : null;
}

/** Raw item before the ids are merged. */
export interface Tileset3dRawItem {
  id: string;
  group: string;
  url: string;
  year: number | null;
}

/**
 * Reads a manifest into raw items.
 *
 * Two shapes are accepted. The normalised one, `{items: [{id, group?, url, year?}]}`, needs no
 * mapping. Any other object is read through `mapping`: the named top-level collections are scanned
 * and each element's fields are picked by name. Relative URLs are resolved against the manifest.
 */
export function readManifest(json: any, mapping: Tileset3dFieldMapping, manifestUrl: string): Tileset3dRawItem[] {
  if (!json || typeof json !== 'object') {
    return [];
  }
  if (Array.isArray(json.items)) {
    return json.items
      .filter((entry: any) => entry && entry.id && entry.url)
      .map((entry: any) => ({
        id: String(entry.id),
        group: String(entry.group || entry.id),
        url: resolveUrl(String(entry.url), manifestUrl),
        year: parseYear(entry.year),
      }));
  }

  const sections = mapping.sections.length
    ? mapping.sections
    : Object.keys(json).filter((key) => Array.isArray(json[key]));
  const items: Tileset3dRawItem[] = [];
  sections.forEach((section) => {
    const entries = json[section];
    if (!Array.isArray(entries)) {
      return;
    }
    entries.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const id = entry[mapping.idField];
      const url = buildUrl(entry, mapping);
      if (id === undefined || id === null || !url) {
        return;
      }
      const group = entry[mapping.groupField];
      items.push({
        id: String(id),
        group: String(group === undefined || group === null ? id : group),
        url: resolveUrl(url, manifestUrl),
        year: parseYear(entry[mapping.yearField]),
      });
    });
  });
  return items;
}

function buildUrl(entry: any, mapping: Tileset3dFieldMapping): string | null {
  if (mapping.urlTemplate) {
    let missing = false;
    const url = mapping.urlTemplate.replace(/\{([^}]+)\}/g, (_match, name) => {
      if (name === 'base') {
        return mapping.baseUrl || '';
      }
      const value = entry[name];
      if (value === undefined || value === null) {
        missing = true;
        return '';
      }
      return String(value);
    });
    return missing ? null : url;
  }
  const value = entry[mapping.urlField];
  return value === undefined || value === null ? null : String(value);
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch (e) {
    return url;
  }
}

/**
 * Merges raw items sharing an id into one item. The contract is that one id names one geometry,
 * wherever it appears: the same id listed for several years is the same geometry observed several
 * times, so it is loaded once and keeps all its years. The URL of its earliest observation is the
 * one loaded, which keeps the choice deterministic.
 */
export function mergeItems(raw: Tileset3dRawItem[]): Tileset3dItem[] {
  const byId: { [id: string]: { item: Tileset3dItem; firstYear: number } } = {};
  const order: string[] = [];
  raw.forEach((entry) => {
    const year = entry.year === null ? Number.POSITIVE_INFINITY : entry.year;
    const known = byId[entry.id];
    if (!known) {
      byId[entry.id] = {
        item: { id: entry.id, group: entry.group, url: entry.url, years: entry.year === null ? [] : [entry.year] },
        firstYear: year,
      };
      order.push(entry.id);
      return;
    }
    if (entry.year !== null && known.item.years.indexOf(entry.year) === -1) {
      known.item.years.push(entry.year);
    }
    if (year < known.firstYear) {
      known.firstYear = year;
      known.item.url = entry.url;
    }
  });
  return order.map((id) => {
    const item = byId[id].item;
    item.years.sort((a, b) => a - b);
    return item;
  });
}

/** The group an identifier belongs to: exact id first, then its hierarchical prefixes. */
export function matchGroup(identifier: string, groups: { [group: string]: true }, separator: string): string | null {
  if (groups[identifier]) {
    return identifier;
  }
  if (!separator) {
    return null;
  }
  let current = identifier;
  let cut = current.lastIndexOf(separator);
  while (cut > 0) {
    current = current.substring(0, cut);
    if (groups[current]) {
      return current;
    }
    cut = current.lastIndexOf(separator);
  }
  return null;
}

/** Turns query rows into intervals, matched to the manifest's groups. */
export function buildModel(
  items: Tileset3dItem[],
  rows: Array<{ identifier: string; start?: any; end?: any; footprint?: string; tileset?: string }>,
  rules: Tileset3dRules
): Tileset3dModelState {
  const groups: { [group: string]: true } = {};
  items.forEach((item) => (groups[item.group] = true));
  const intervalsByGroup: { [group: string]: Tileset3dInterval[] } = {};
  const unmatchedByIdentifier: { [identifier: string]: Tileset3dInterval[] } = {};
  rows.forEach((row) => {
    if (!row.identifier) {
      return;
    }
    const start = parseYear(row.start);
    const end = parseYear(row.end);
    const interval: Tileset3dInterval = {
      identifier: row.identifier,
      start: start === null ? Number.NEGATIVE_INFINITY : start,
      end: end === null ? Number.POSITIVE_INFINITY : end,
      footprint: row.footprint || undefined,
      pinned: row.tileset || undefined,
    };
    const group = matchGroup(row.identifier, groups, rules.identifierSeparator);
    const target = group === null ? unmatchedByIdentifier : intervalsByGroup;
    const key = group === null ? row.identifier : group;
    (target[key] = target[key] || []).push(interval);
  });
  return { items, intervalsByGroup, unmatchedByIdentifier };
}

/** The first interval containing the year, or null. */
function activeInterval(intervals: Tileset3dInterval[], year: number): Tileset3dInterval | null {
  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i].start <= year && year <= intervals[i].end) {
      return intervals[i];
    }
  }
  return null;
}

function placeholderKey(interval: Tileset3dInterval): string {
  return interval.identifier + '|' + interval.start;
}

/**
 * Decides what every group shows at `year`.
 *
 * - A group with query intervals exists only inside them. Inside, a pinned item wins; otherwise
 *   the observed-year rule picks the geometry; if none has been observed yet, the group falls back
 *   to `beforeFirstObservation`.
 * - A group with no intervals follows the manifest alone, and shows nothing before its first
 *   observation.
 * - With no year (time filtering off), each group shows its latest geometry — showing them all
 *   would stack every variant of the same object in the same place.
 */
export function selectAt(year: number | null, model: Tileset3dModelState, rules: Tileset3dRules): Tileset3dSelectionResult {
  const itemsByGroup: { [group: string]: Tileset3dItem[] } = {};
  model.items.forEach((item) => (itemsByGroup[item.group] = itemsByGroup[item.group] || []).push(item));

  const groups: { [group: string]: Tileset3dSelection } = {};
  Object.keys(itemsByGroup).forEach((group) => {
    const items = itemsByGroup[group];
    if (year === null) {
      const latest = latestObserved(items, Number.POSITIVE_INFINITY);
      if (latest) {
        groups[group] = { kind: 'tileset', itemId: latest.id };
      }
      return;
    }

    const intervals = model.intervalsByGroup[group];
    const observed = rules.selection === 'exact' ? observedExactly(items, year) : latestObserved(items, year);

    if (!intervals || intervals.length === 0) {
      if (observed) {
        groups[group] = { kind: 'tileset', itemId: observed.id };
      }
      return;
    }

    const active = activeInterval(intervals, year);
    if (!active) {
      return;
    }
    if (active.pinned && items.some((item) => item.id === active.pinned)) {
      groups[group] = { kind: 'tileset', itemId: active.pinned };
      return;
    }
    if (observed) {
      groups[group] = { kind: 'tileset', itemId: observed.id };
      return;
    }
    if (rules.beforeFirstObservation === 'earliest') {
      const earliest = earliestObserved(items);
      if (earliest) {
        groups[group] = { kind: 'tileset', itemId: earliest.id };
      }
    } else if (rules.beforeFirstObservation === 'placeholder' && active.footprint) {
      groups[group] = { kind: 'placeholder', key: placeholderKey(active), footprint: active.footprint };
    }
  });

  const unmatched: Tileset3dSelection[] = [];
  if (year !== null && rules.unmatched === 'placeholder') {
    Object.keys(model.unmatchedByIdentifier).forEach((identifier) => {
      // One footprint per identifier, even when the data lists overlapping intervals for it:
      // two translucent copies of the same footprint would read as one darker shape.
      const active = activeInterval(model.unmatchedByIdentifier[identifier], year);
      if (active && active.footprint) {
        unmatched.push({ kind: 'placeholder', key: placeholderKey(active), footprint: active.footprint });
      }
    });
  }
  return { groups, unmatched };
}

/** The item whose observation is the latest one not after `year`. */
function latestObserved(items: Tileset3dItem[], year: number): Tileset3dItem | null {
  let best: Tileset3dItem | null = null;
  let bestYear = Number.NEGATIVE_INFINITY;
  items.forEach((item) => {
    item.years.forEach((observedYear) => {
      if (observedYear <= year && observedYear > bestYear) {
        bestYear = observedYear;
        best = item;
      }
    });
  });
  return best;
}

function observedExactly(items: Tileset3dItem[], year: number): Tileset3dItem | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].years.indexOf(year) !== -1) {
      return items[i];
    }
  }
  return null;
}

function earliestObserved(items: Tileset3dItem[]): Tileset3dItem | null {
  let best: Tileset3dItem | null = null;
  let bestYear = Number.POSITIVE_INFINITY;
  items.forEach((item) => {
    if (item.years.length && item.years[0] < bestYear) {
      bestYear = item.years[0];
      best = item;
    }
  });
  return best;
}
