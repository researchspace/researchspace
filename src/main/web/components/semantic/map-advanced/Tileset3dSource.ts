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

import * as React from 'react';

import { Component, ComponentProps } from 'platform/api/components';
import { componentHasType } from 'platform/components/utils';

import { Tileset3dFieldMapping, Tileset3dRules } from './Tileset3dModel';

/**
 * A source of 3D tilesets for the 3D view of `<semantic-map-advanced>`, shown and hidden along the
 * timeline. Declared as a child of the map; read once when the 3D view is first opened.
 *
 * Manifests list the loadable geometries. Each geometry belongs to a *group* (the object whose
 * appearance changes over time) and carries the years in which it was observed; the map shows,
 * per group, the geometry observed most recently before the timeline year. An optional
 * `temporal-query` supplies the authoritative existence of each group, which can extend before the
 * first observation (drawn as an extruded footprint) and end after the last.
 */
export interface Tileset3dSourceConfig {
  /** One or more manifest URLs, comma-separated. Use this or `manifest-query`. */
  manifestUrl?: string;
  /** SELECT returning one `?url` per manifest. Use this or `manifest-url`. */
  manifestQuery?: string;

  /**
   * Top-level collections to read from a field-mapped manifest, comma-separated. Empty reads every
   * top-level array. Ignored for manifests in the normalised `{items: [...]}` shape.
   */
  sections?: string;
  /** Field holding a geometry's id. Items with the same id MUST be the same geometry. Default `id`. */
  idField?: string;
  /** Field holding the group a geometry belongs to. Default `group`; absent means the id itself. */
  groupField?: string;
  /** Field holding the year a geometry was observed in. Default `year`. */
  yearField?: string;
  /** Field holding the tileset URL. Default `url`. Ignored when `url-template` is set. */
  urlField?: string;
  /** Builds the tileset URL from item fields, e.g. `{base}{path}/tileset.json`. */
  urlTemplate?: string;
  /** Value of `{base}` in `url-template`. */
  baseUrl?: string;

  /**
   * Metres to raise every tileset along the local vertical. Default 0. A manifest may carry a
   * geoid correction; only apply it if the rest of the scene uses the same vertical datum — with
   * imagery draped on the ellipsoid and no terrain, a datum correction lifts the models off it.
   */
  heightOffset?: number;
  /** Top-level manifest field to read the height offset from, instead of `height-offset`. */
  heightOffsetField?: string;

  /**
   * SELECT giving the existence of each group. Rows: `?identifier` (a group id, or a descendant of
   * one under `identifier-separator`), `?start` and `?end` (dates or years; unbound means open), and
   * optionally `?footprint` (WKT in `footprint-crs`) and `?tileset` (an item id to show for that
   * interval, overriding the observed-year rule).
   */
  temporalQuery?: string;

  /** `snapshot` (default): latest observation not after the year. `exact`: only that year's. */
  selection?: 'snapshot' | 'exact';
  /** A group that exists but has no observation yet: `placeholder`, `earliest` or `none` (default). */
  beforeFirstObservation?: 'placeholder' | 'earliest' | 'none';
  /** Query identifiers that match no group: `placeholder` or `none` (default). */
  unmatchedIdentifiers?: 'placeholder' | 'none';
  /** Separator of hierarchical identifiers, e.g. `.`. Empty (default) matches exact ids only. */
  identifierSeparator?: string;

  /** Height of the extruded footprint placeholders, in metres. Default 8. */
  placeholderHeight?: number;
  /** CSS colour of the placeholders. Default a translucent grey. */
  placeholderColor?: string;
  /** CRS of the `?footprint` WKT. Default `EPSG:4326`. */
  footprintCrs?: string;
}

export type Tileset3dSourceProps = Tileset3dSourceConfig & ComponentProps;

/** Configuration-only element: never mounted, the map reads its props off the React element. */
export class Tileset3dSource extends Component<Tileset3dSourceProps, {}> {
  public render() {
    return null;
  }
}

export interface Tileset3dSourceModel {
  manifestUrls: string[];
  manifestQuery?: string;
  mapping: Tileset3dFieldMapping;
  rules: Tileset3dRules;
  heightOffset: number;
  heightOffsetField?: string;
  temporalQuery?: string;
  placeholderHeight: number;
  placeholderColor: string;
  footprintCrs: string;
}

const COMPONENT_TAG = '<tileset-3d-source>';

function list(value: any): string[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function oneOf<T extends string>(value: any, allowed: T[], fallback: T, attribute: string): T {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (allowed.indexOf(value) === -1) {
    console.warn(`${COMPONENT_TAG}: "${attribute}" must be one of ${allowed.join(', ')}; using "${fallback}"`);
    return fallback;
  }
  return value as T;
}

function number(value: any, fallback: number): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isTileset3dSource(child: React.ReactNode): boolean {
  return componentHasType(child, Tileset3dSource);
}

export function extractTileset3dSource(child: React.ReactNode): Tileset3dSourceModel {
  const props = (child as React.ReactElement<Tileset3dSourceProps>).props;
  const manifestUrls = list(props.manifestUrl);
  if (!manifestUrls.length && !props.manifestQuery) {
    throw new Error(`${COMPONENT_TAG} needs "manifest-url" or "manifest-query"`);
  }
  return {
    manifestUrls,
    manifestQuery: props.manifestQuery || undefined,
    mapping: {
      sections: list(props.sections),
      idField: props.idField || 'id',
      groupField: props.groupField || 'group',
      yearField: props.yearField || 'year',
      urlField: props.urlField || 'url',
      urlTemplate: props.urlTemplate || undefined,
      baseUrl: props.baseUrl || undefined,
    },
    rules: {
      selection: oneOf(props.selection, ['snapshot', 'exact'], 'snapshot', 'selection'),
      beforeFirstObservation: oneOf(
        props.beforeFirstObservation,
        ['placeholder', 'earliest', 'none'],
        'none',
        'before-first-observation'
      ),
      unmatched: oneOf(props.unmatchedIdentifiers, ['placeholder', 'none'], 'none', 'unmatched-identifiers'),
      identifierSeparator: props.identifierSeparator ? String(props.identifierSeparator) : '',
    },
    heightOffset: number(props.heightOffset, 0),
    heightOffsetField: props.heightOffsetField || undefined,
    temporalQuery: props.temporalQuery || undefined,
    placeholderHeight: number(props.placeholderHeight, 8),
    placeholderColor: props.placeholderColor || 'rgba(128, 128, 128, 0.35)',
    footprintCrs: props.footprintCrs || 'EPSG:4326',
  };
}

export default Tileset3dSource;
