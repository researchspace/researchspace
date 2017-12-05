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

import * as React from 'react';
import { Just, Nothing, of as maybeOf } from 'data.maybe';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

export interface DataSetMappings {
  /** Query variable to pivot on. */
  dataSetVariable?: string;
  /** Optional label of data set to display in legend. */
  dataSetName?: string;
  /**
   * Optional IRI of data set. If specified, a label for this IRI will be fetched and displayed in legend.
   * */
  dataSetIRI?: string;
  /**
   * Determines position of data point along main axis (usually x-axis or axis around chart's center).
   */
  x?: string;
  /**
   * Determine position along cross axis (y-axis or radial axis).
   */
  y?: string;
  /**
   * Third-dimension value for 3+ dimensional data.
   */
  z?: string;
  /** Same as x, but value is explicitly non-numerical. */
  category?: string;
  /** Same as y for two-dimensional data. */
  value?: string;
  /** Color of specific data point. */
  color?: string;
}

export type ChartProvider = 'chartjs' | 'highcharts';

export interface ProviderSpecificStyle {
  /** Charting library identifier. */
  provider: ChartProvider;

  /**
   * Options specific to the provider. These options will be merged with widget-generated options and specified style will override defaults.
   */
  style: any;
}

export type ChartType = 'line' | 'bar' | 'radar' | 'pie' | 'donut' | 'bubble';

export interface ChartDimensions {
  /**
   * Chart width in pixels
   */
  width?: number;

  /**
   * Chart height in pixels
   */
  height?: number;
}

export interface SemanticChartConfig {
  /**
   * SPARQL select query where the resulting rows correspond to one (in case of `multi-data-set`) or multiple (in case of `data-sets`) data points.
   */
  query: string;

  /** Type of chart, specified as string */
  type: ChartType;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results.
   */
  noResultTemplate?: string;

  /**
   * List of plotted data sets where each specified through mapping between data points properties and query variables. (Mutually exclusive with `multi-data-sets.`)
   */
  sets?: DataSetMappings[];

  /**
   * Data sets specified through pivoting on variable in query and mapping between data points properties and other query variables. (Mutually exclusive with `data-sets.`)
   */
  multiDataSet?: DataSetMappings;

  /** List of charting library-specific configurations. */
  styles?: ProviderSpecificStyle[];

  /**
   * Chart's dimensions. If any dimension is not set, the default value provided by the charting library is used instead. In most cases the component will occupy all available space, so you should limit dimensions on enclosing HTML container tag if omitting this parameter.
   */
  dimensions?: ChartDimensions

  /**
   * Charting library provider.
   * <a target='_blank' href='http://www.chartjs.org/'>Chart.js</a> is used by default.
   */
  provider?: ChartProvider;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

export type DataPoint = SparqlClient.Binding;

export interface DataSet {
  id?: string;
  iri?: Rdf.Iri;
  name?: string;
  mapping: DataSetMappings;
  points?: DataPoint[];
}

export interface BuiltData {
  sets: DataSet[];
  categories?: Rdf.Node[];
}

export function propertyValue(point: DataPoint, property: string): Data.Maybe<string> {
  return (point && point[property]) ? maybeOf(point[property].value) : Nothing<string>();
}

export function labeled(node: Rdf.Node, labels: _.Dictionary<string>): string {
  if (!node) { return ''; }
  if (node.isIri()) {
    const label = labels[node.value];
    if (label) { return label; }
  }
  return node.value;
}

export function extractKey(set: DataSet, point: DataPoint): Rdf.Node {
  return point[set.mapping.category || set.mapping.x];
}

export function extractValue(set: DataSet, point: DataPoint): Rdf.Node {
  return point[set.mapping.value || set.mapping.y];
}

export function valueExists(set: DataSet, point: DataPoint): boolean {
  const value = extractValue(set, point);
  return !_.isUndefined(value) && !_.isNull(value);
}

export function isSetContainsPoint(set: DataSet, point: DataPoint) {
  return !set.id || point[set.mapping.dataSetVariable].value === set.id;
}

export interface ChartRendererProps {
  className?: string;
  builtData: BuiltData;
  labels: _.Dictionary<string>;
  config: SemanticChartConfig;
}

export interface ChartRenderer {
  new(props: ChartRendererProps): React.Component<ChartRendererProps, any>;
}

export function parseNumeric(value: string | undefined): Data.Maybe<number> {
  const num = parseFloat(value);
  return Number.isNaN(num) ? Nothing<number>() : Just(num);
}
