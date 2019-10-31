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

import { createElement, Props } from 'react';
import * as D from 'react-dom-factories';
import { Dictionary, find } from 'lodash';
import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { getLabels } from 'platform/api/services/resource-label';

import { Action } from 'platform/components/utils';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import { ChartRendererExtension, ChartRenderers } from './extensions';

import {
  ChartType, SemanticChartConfig, DataPoint, DataSet, BuiltData, ChartRenderer,
  extractKey, valueExists, isSetContainsPoint,
} from './ChartingCommons';
import { ChartJsRenderer } from './ChartJsRenderer';

import './SemanticChart.scss';

export type SemanticChartProps = SemanticChartConfig & Props<SemanticChart>;

interface State {
  selectedType?: ChartType;
  queryResult?: SparqlClient.SparqlSelectResult;
  rendererProps?: {
    config: SemanticChartConfig;
    data: BuiltData;
    labels: Dictionary<string>;
  };
  errorMessage?: string;
  isLoading?: boolean;
}

const DEFAULT_RENDERERS: ChartRenderers = {
  'chartjs': ChartJsRenderer,
};

const CLASS_NAME = 'semantic-chart';

export class SemanticChart extends Component<SemanticChartProps, State> {
  private readonly cancellation = new Cancellation();
  private query = Action<SemanticChartProps>();

  private root: HTMLElement;

  constructor(props: SemanticChartProps, context: any) {
    super(props, context);
    this.state = {
      isLoading: true,
    };
    this.cancellation.map(
      this.query.$property.debounce(300)
    ).flatMap(
      this.loadQueryData
    ).onValue(() => {/**/});
  }

  componentDidMount() {
    ChartRendererExtension.loadAndUpdate(this, this.cancellation);
    this.query(this.props);
  }

  componentWillReceiveProps(nextProps: SemanticChartProps) {
    if (nextProps.query !== this.props.query) {
      this.setState({isLoading: true, errorMessage: undefined});
      this.query(nextProps);
    } else if (nextProps.type !== this.props.type) {
      if (this.state.queryResult) {
        this.buildRendererProps(nextProps, this.state.queryResult);
      } else {
        this.query(nextProps);
      }
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private loadQueryData = (config: SemanticChartConfig) => {
    const context = this.context.semanticContext;
    const querying = SparqlClient.select(config.query, {context});
    querying.onValue(queryResult => {
      this.setState({
        queryResult: queryResult,
        isLoading: false,
      });
      this.buildRendererProps(config, queryResult);
    });
    querying.onError(errorMessage => {
      this.setState({
        errorMessage: errorMessage,
        isLoading: false,
      });
    });
    querying.onEnd(() => {
      if (this.props.id) {
        trigger({eventType: BuiltInEvents.ComponentLoaded, source: this.props.id});
      }
    });

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: querying,
      });
    }
    return querying;
  };

  buildRendererProps(config: SemanticChartConfig, queryResult: SparqlClient.SparqlSelectResult) {
    const data = buildData(config, queryResult);
    fetchLabels(data).onValue(labels => {
      this.setState({
        queryResult,
        rendererProps: {config, data, labels},
        errorMessage: undefined,
        isLoading: false,
      });
    }).onError(errorMessage => {
      this.setState({
        queryResult,
        rendererProps: undefined,
        errorMessage,
        isLoading: false,
      });
    });
  }

  componentWillUpdate() {
    if (this.root) {
      // preserve chart's dimensions when switching chart type
      this.root.style.width = this.root.clientWidth + 'px';
      this.root.style.height = this.root.clientHeight + 'px';
    }
  }

  componentDidUpdate() {
    if (this.root) {
      this.root.style.width = null;
      this.root.style.height = null;
    }
  }

  render() {
    if (ChartRendererExtension.isLoading() || this.state.isLoading) {
      return createElement(Spinner);
    } else if (this.state.errorMessage) {
      return D.div({}, createElement(ErrorNotification, { errorMessage: this.state.errorMessage }));
    } else if (this.state.rendererProps) {
      if (SparqlUtil.isSelectResultEmpty(this.state.queryResult)) {
        return createElement(TemplateItem, {template: {source: this.props.noResultTemplate}});
      }

      const config = this.state.rendererProps.config;
      const renderers: ChartRenderers = {
        ...DEFAULT_RENDERERS,
        ...ChartRendererExtension.get(),
      };
      const renderer = renderers[config.provider] || renderers['chartjs'];

      const rootProps = {
        className: CLASS_NAME,
        'data-type': this.state.selectedType,
        ref: root => { this.root = root; },
      };
      return D.div(
        rootProps,
        this.props.children,
        createElement(renderer, {
          className: `${CLASS_NAME}__renderer`,
          config,
          builtData: this.state.rendererProps.data,
          labels: this.state.rendererProps.labels,
        })
      );
    } else {
      return D.div({className: CLASS_NAME}, this.props.children);
    }
  }
}

export function buildData(
  config: SemanticChartConfig, queryResult: SparqlClient.SparqlSelectResult
): BuiltData {
  const dataPoints = queryResult.results.bindings;

  const dataSets: DataSet[] = config.multiDataSet
    ? _(dataPoints).map(point => {
        const node = point[config.multiDataSet.dataSetVariable];
        return {
          id: node.value,
          iri: node.isIri() ? node : null,
          name: node.isLiteral() ? node.value : null,
          mapping: config.multiDataSet,
        };
      }).uniqBy(set => set.id).sortBy(set => set.id).value()
    : config.sets.map(set => {
      return {
        mapping: set,
        iri: typeof set.dataSetIRI === 'string' ? Rdf.iri(set.dataSetIRI) : set.dataSetIRI,
        name: set.dataSetName,
      };
    });

  const isNumericXScale = (config.type === 'line' || config.type === 'bubble')
    && !dataSets.some(set => Boolean(set.mapping.category));
  const isPieLikeChart = config.type === 'pie' || config.type === 'donut';

  if (isNumericXScale || isPieLikeChart) {
    for (const set of dataSets) {
      set.points = dataPoints.filter(point =>
        isSetContainsPoint(set, point) && valueExists(set, point));
    }
    return {sets: dataSets};
  } else {
    return buildCategorialDataInPlace(dataPoints, dataSets);
  }
}

function buildCategorialDataInPlace(dataPoints: DataPoint[], dataSets: DataSet[]): BuiltData {
  const categories: Rdf.Node[] = [];
  const groupedByKey: { [key: string]: DataPoint[] } = {};

  for (const set of dataSets) {
    for (const point of dataPoints) {
      const category = extractKey(set, point);
      if (!category) { continue; }
      const categoryString = category.toString();
      let groupedPoints = groupedByKey[categoryString];
      if (!groupedPoints) {
        groupedPoints = groupedByKey[categoryString] = [];
        categories.push(category);
      }
      if (isSetContainsPoint(set, point) && valueExists(set, point)) {
        groupedPoints.push(point);
      }
    }
  }

  for (const set of dataSets) {
    set.points = [];
  }

  for (const category of categories) {
    const pointsAtKey = groupedByKey[category.toString()];
    for (const set of dataSets) {
      const point = find(pointsAtKey, point =>
        isSetContainsPoint(set, point) && valueExists(set, point));
      set.points.push(point ? point : null);
    }
  }

  return {sets: dataSets, categories: categories};
}

function fetchLabels(data: BuiltData): Kefir.Property<Dictionary<string>> {
  const iris: Rdf.Iri[] = [];
  for (const set of data.sets) {
    if (set.iri) { iris.push(set.iri); }
    for (const point of set.points) {
      if (point) {
        const key = extractKey(set, point);
        if (key && key.isIri()) { iris.push(key); }
      }
    }
  }
  if (data.categories) {
    for (const category of data.categories) {
      if (category.isIri()) { iris.push(category); }
    }
  }
  return getLabels(iris).map(labels => labels.mapKeys(k => k.value).toObject());
}

export { SemanticChartConfig };
export { DataSetMappings, ChartType, ProviderSpecificStyle, DataSet } from './ChartingCommons';
export default SemanticChart;
