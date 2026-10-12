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
import { TemplateScope } from 'platform/api/services/template';
import { componentHasType } from 'platform/components/utils';

/**
 * One class of related entities shown in the map controls' "related entities" panel, declared in
 * the page template. Everything domain-specific — which entities belong to the current view, how
 * they are dated, how they are laid out — lives in this element's query and templates, so the map
 * component itself stays free of any project vocabulary.
 */
export interface RelatedEntitiesClassConfig {
  /**
   * Identifier of the class, used as the tab key. Must be unique among sibling elements.
   */
  id: string;

  /**
   * Tab label shown to the user.
   */
  label: string;

  /**
   * Icon class for the tab, e.g. `fa fa-file-text-o`. Optional.
   */
  icon?: string;

  /**
   * SELECT query producing one row per entity.
   *
   * Required projections:
   * - `?entity` — the entity IRI;
   * - `?year` — a **number**, already reduced from whatever date encoding the data uses. Rows
   *   whose year is absent or unparseable are dropped, since they have no place in a
   *   chronological feed.
   *
   * The query should end with `ORDER BY ?year`; any other projected binding is passed through to
   * the row and detail templates.
   *
   * The component substitutes the current map viewport into these reserved variables, wherever
   * the query uses them (they are only valid in value positions, never in `SELECT`, `BIND`,
   * `VALUES` or `GROUP BY`):
   * - `?__minX__` `?__minY__` `?__maxX__` `?__maxY__` — EPSG:3857, as expected by SQL services;
   * - `?__minLon__` `?__minLat__` `?__maxLon__` `?__maxLat__` — WGS84 degrees.
   *
   * Mark where the spatial restriction belongs with `FILTER(?__spatial__)`. That placeholder is
   * replaced by `spatialPattern` when the spatial filter is on, and by nothing when it is off —
   * so the unfiltered query goes out smaller rather than carrying a world-sized bounding box,
   * which for an SQL service is a different execution plan entirely.
   */
  query: string;

  /**
   * SPARQL group pattern spliced in at `FILTER(?__spatial__)` while the spatial filter is on.
   * It is written here, not derived by the component, because how an entity relates to the map is
   * a property of the data: it may be a graph-side coordinate comparison, a geometry service
   * call, or anything else. It may use the reserved viewport variables.
   *
   * @example `?entity ex:latitude ?lat . FILTER(?lat >= ?__minLat__ && ?lat <= ?__maxLat__)`
   */
  spatialPattern?: string;

  /**
   * Maximum number of rows to fetch. Default: 200.
   */
  limit?: number;
}

export type RelatedEntitiesClassProps = RelatedEntitiesClassConfig & ComponentProps;

/**
 * Configuration-only element: it is never mounted, the parent reads its props off the React
 * element. See `RelatedEntitiesClassConfig`.
 */
export class RelatedEntitiesClass extends Component<RelatedEntitiesClassProps, {}> {
  public render() {
    return null;
  }
}

/**
 * A class as the panel consumes it: config plus the templates resolved from this element's own
 * markup scope. Keeping the scope alongside the sources is what lets each class render with its
 * own `<template>` partials rather than the parent's.
 */
export interface RelatedEntitiesClassModel {
  id: string;
  label: string;
  icon?: string;
  query: string;
  spatialPattern?: string;
  limit: number;
  rowTemplate?: string;
  detailTemplate?: string;
  templateScope?: TemplateScope;
}

const COMPONENT_TAG = '<related-entities-class>';
const DEFAULT_LIMIT = 200;

function resolveTemplate(props: RelatedEntitiesClassProps, id: string): string | undefined {
  if (!props.markupTemplateScope) {
    return undefined;
  }
  const partial = props.markupTemplateScope.getPartial(id);
  return partial ? partial.source : undefined;
}

export function extractRelatedEntitiesClass(child: React.ReactNode): RelatedEntitiesClassModel {
  if (!componentHasType(child, RelatedEntitiesClass)) {
    throw new Error(`<semantic-map-controls> related entities children must be ${COMPONENT_TAG}`);
  }
  const props = (child as React.ReactElement<RelatedEntitiesClassProps>).props;
  if (!props.id) {
    throw new Error(`${COMPONENT_TAG} must set "id"`);
  }
  if (!props.label) {
    throw new Error(`${COMPONENT_TAG} "${props.id}" must set "label"`);
  }
  if (!props.query) {
    throw new Error(`${COMPONENT_TAG} "${props.id}" must set "query"`);
  }
  const limit = typeof props.limit === 'number' ? props.limit : parseInt(String(props.limit), 10);
  return {
    id: props.id,
    label: props.label,
    icon: props.icon,
    query: props.query,
    spatialPattern: props.spatialPattern,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    rowTemplate: resolveTemplate(props, 'row'),
    detailTemplate: resolveTemplate(props, 'detail'),
    templateScope: props.markupTemplateScope,
  };
}

export default RelatedEntitiesClass;
