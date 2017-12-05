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

import { Dictionary, merge, find } from 'lodash';
import * as Immutable from 'immutable';
import { DOM as D, Component, createElement } from 'react';
import {
  Chart, ChartData, ChartOptions, LegendItem,
  LinearDataSet, BarDataSet, CircularDataSet, BubbleDataSet, BubbleDataObject
} from 'chart.js';
import { ChartProps, Line, Bar, Radar, Pie, Doughnut, Bubble } from 'react-chartjs-2';

import { Rdf } from 'platform/api/rdf';

import {
  ChartType, BuiltData, ChartRendererProps, propertyValue, labeled, parseNumeric,
} from './ChartingCommons';

const LINE_FILL_OPACITY = 0.2;
const BAR_FILL_OPACITY = 0.6;
const DEFAULT_BUBBLE_RADIUS = 10;

interface State {
  hiddenCategories: Immutable.Set<Rdf.Node>;
}

const CHART_TYPE_MAPPING: Record<ChartType, any> = {
  'line': Line,
  'bar': Bar,
  'radar': Radar,
  'pie': Pie,
  'donut': Doughnut,
  'bubble': Bubble,
};

// stretch horizontally by default
const DEFAULT_WIDTH: number = undefined;
const DEFAULT_HEIGHT = 400;

type CustomLegendItem = LegendItem & { category?: Rdf.Node };

export class ChartJsRenderer extends Component<ChartRendererProps, State> {
  private redrawChart = false;

  constructor(props: ChartRendererProps) {
    super(props);
    this.state = {
      hiddenCategories: Immutable.Set<Rdf.Node>(),
    };
  }

  componentWillReceiveProps(nextProps?: ChartRendererProps) {
    if (nextProps.builtData !== this.props.builtData) {
      this.redrawChart = true;
    }
  }

  private mapCircularData(
    data: BuiltData, labels: Dictionary<string>
  ): [ChartData, ChartOptions] {
    if (data.sets.length === 0) {
      return [{datasets: [], labels: []}, {}];
    }

    const firstSet = data.sets[0];
    const categories = firstSet.points.map(point =>
      point[firstSet.mapping.category || firstSet.mapping.x]);
    const chartLabels = categories.map(category => labeled(category, labels));
    const datasets = data.sets.map<CircularDataSet>((set, setIndex) => ({
      data: set.points.map(point =>
        propertyValue(point, set.mapping.value || set.mapping.y)
          .map(parseFloat).getOrElse(0)),
      backgroundColor: set.points.map((point, pointIndex) =>
        propertyValue(point, set.mapping.color)
          .getOrElse(getDefaultColor(pointIndex))),
    }));

    let options = {};
    if (data.sets.length === 1) {
      options = this.legendOptions(
        chart => {
          const meta = chart.getDatasetMeta(0);
          const items: CustomLegendItem[] =
            Chart.defaults.doughnut.legend.labels.generateLabels(chart);
          categories.forEach((category, i) => {
            const hidden = this.state.hiddenCategories.has(category);
            items[i].category = category;
            items[i].hidden = hidden;
            meta.data[i].hidden = hidden;
          });
          return items;
        },
        (event, item, context) => {
          Chart.defaults.doughnut.legend.onClick.call(context, event, item);
        });
    }

    return [{labels: chartLabels, datasets}, options];
  }

  private mapCategorialData(
    data: BuiltData, labels: Dictionary<string>
  ): [ChartData, ChartOptions] {
    const [chartData, options] = data.sets.length === 1
      ? this.mapSingleCategorialSet(data, labels)
      : this.mapMultipleCategorialSets(data, labels);

    const chartType = this.props.config.type;
    if (chartType === 'line' || chartType === 'bar') {
      merge(options, {
        scales: {
          xAxes: [{
            ticks: {autoSkip: false},
          }],
          yAxes: [{
            ticks: {beginAtZero: true},
          }],
        },
      });
    } else if (chartType === 'radar') {
      merge(options, {
        scale: {
          ticks: {beginAtZero: true},
        },
      });
    }

    return [chartData, options];
  }

  /**
   * Perform separate mapping for single dataset case to display
   * different legend with a legend item for each dataset point.
   */
  private mapSingleCategorialSet(
    data: BuiltData, labels: Dictionary<string>
  ): [ChartData, ChartOptions] {
    const chartType = this.props.config.type;
    const set = data.sets[0];

    const displayedCategories = data.categories
      .map((category, index) => ({category, index}))
      .filter(({category}) => !this.state.hiddenCategories.has(category));
    const displayedIndices = displayedCategories.map(({index}) => index);
    const displayedIndicesSet = Immutable.Set<number>(displayedIndices);

    const dataset: BarDataSet | LinearDataSet | BubbleDataSet = {
      label: set.name || labeled(set.iri, labels),
      data: set.points
        .filter((point, index) => displayedIndicesSet.has(index))
        .map(point => {
          const x = propertyValue(point, set.mapping.x).chain(parseNumeric);
          const y = propertyValue(point, set.mapping.y || set.mapping.value).chain(parseNumeric);
          const z = propertyValue(point, set.mapping.z).chain(parseNumeric);
          if (chartType === 'bubble') {
            return {x: x.getOrElse(0), y: y.getOrElse(0), r: z.getOrElse(DEFAULT_BUBBLE_RADIUS)};
          } else {
            return y.getOrElse(null);
          }
        }).filter(p => p !== null) as number[] | BubbleDataObject[],
      borderWidth: 1,
    };

    const fillColors = displayedIndices.map(i => defaultPalette(i, BAR_FILL_OPACITY));
    const borderColors = displayedIndices.map(i => defaultPalette(i, 1));
    if (chartType === 'bar' || chartType === 'bubble') {
      const barDataset = dataset as BarDataSet | BubbleDataSet;
      barDataset.backgroundColor = fillColors;
      barDataset.borderColor = borderColors;
    } else {
      merge(dataset, singleLinearDatasetStyle());
      (dataset as LinearDataSet).pointBackgroundColor = borderColors;
    }

    const chartData = {
      labels: displayedCategories.map(({category}) => labeled(category, labels)),
      datasets: [dataset],
    };

    return [chartData, this.singleCategorialSetLegendOptions(data, labels)];
  }

  private singleCategorialSetLegendOptions(
    data: BuiltData, labels: Dictionary<string>
  ): ChartOptions {
    const legendItems = data.categories.map((category, categoryIndex) => {
      return <CustomLegendItem>{
        text: labeled(category, labels),
        fillStyle: defaultPalette(categoryIndex, BAR_FILL_OPACITY),
        hidden: this.state.hiddenCategories.has(category),
        category,
      };
    });
    return this.legendOptions(
      chart => legendItems,
      (event, item) => { item.hidden = !item.hidden; });
  }

  private legendOptions(
    generateLabels: (chart: Chart) => CustomLegendItem[],
    onClick: (event: any, item: CustomLegendItem, context: any) => void
  ): ChartOptions {
    const updateVisibility = (category: Rdf.Node, wasHidden: boolean) => {
      this.setState({
        hiddenCategories: wasHidden
          ? this.state.hiddenCategories.remove(category)
          : this.state.hiddenCategories.add(category),
      });
    };
    return {
      legend: {
        labels: {generateLabels},
        onClick: function (this: any, event: any, item: CustomLegendItem) {
          const wasHidden = item.hidden;
          onClick(event, item, this);
          updateVisibility(item.category, wasHidden);
        },
      },
    };
  }

  private mapMultipleCategorialSets(
    data: BuiltData, labels: Dictionary<string>
  ): [ChartData, ChartOptions] {
    const chartData = {
      labels: data.categories.map(category => labeled(category, labels)),
      datasets: data.sets.map((set, setIndex) => {
        const style = getLinearSeriesDefaultStyle(setIndex,
          this.props.config.type === 'bar' ? BAR_FILL_OPACITY : LINE_FILL_OPACITY);
        const dataSet: BarDataSet & LinearDataSet = merge({
          label: set.name || labeled(set.iri, labels),
          data: set.points.map(point =>
            propertyValue(point, set.mapping.value || set.mapping.y)
              .map(parseFloat).getOrElse(0)),
        }, style);
        return dataSet;
      }),
    };
    return [chartData, {}];
  }

  private mapNumericalData(
    data: BuiltData, labels: Dictionary<string>
  ): [ChartData, ChartOptions] {
    const datasets = data.sets.map((set, setIndex) => {
      const dataset: LinearDataSet = {
        label: set.name || labeled(set.iri, labels),
        data: set.points.map(point => {
          const x = propertyValue(point, set.mapping.x || set.mapping.category).chain(parseNumeric);
          const y = propertyValue(point, set.mapping.y || set.mapping.value).chain(parseNumeric);
          return (x.isJust && y.isJust) ? {
            x: x.get(),
            y: y.get(),
            r: propertyValue(point, set.mapping.z)
              .chain(parseNumeric).getOrElse(DEFAULT_BUBBLE_RADIUS),
          } : null;
        }).filter(point => point !== null),
      };
      return merge(dataset, getLinearSeriesDefaultStyle(
        setIndex, this.props.config.type === 'bar' ? BAR_FILL_OPACITY : LINE_FILL_OPACITY));
    });
    const options = this.props.config.type === 'line' ? {
      scales: {
        xAxes: [{type: 'linear', position: 'bottom'}],
      },
    } : {};
    return [{datasets}, options];
  }

  render() {
    const {config, builtData, labels} = this.props;

    const isXYChart = config.type === 'line' || config.type === 'bubble';
    const isCategorialChart = config.type === 'bar' || config.type === 'radar';
    const isCircularChart = config.type === 'pie' || config.type === 'donut';

    let data: ChartData, options: ChartOptions;
    if (isCircularChart) {
      [data, options] = this.mapCircularData(builtData, labels);
    } else if (isCategorialChart || (isXYChart && builtData.categories)) {
      [data, options] = this.mapCategorialData(builtData, labels);
    } else if (isXYChart && !builtData.categories) {
      [data, options] = this.mapNumericalData(builtData, labels);
    } else {
      throw Error(`Unsupported chart type '${config.type}'`);
    }

    const specificStyle = find(config.styles, style => style.provider === 'chartjs');
    const generatedConfig: ChartProps = {
      data: data,
      options: merge(options, <ChartOptions>{
        responsive: true,
        maintainAspectRatio: false,
      }),
      width: (!config.dimensions || config.dimensions.width === 0)
        ? DEFAULT_WIDTH : config.dimensions.width,
      height: (!config.dimensions || config.dimensions.height === 0)
        ? DEFAULT_HEIGHT : config.dimensions.height,
    };

    if (specificStyle && specificStyle.style) {
      merge(generatedConfig, specificStyle.style);
    }

    // redraw chart on BuiltData change to correctly update chart legend
    if (this.redrawChart) {
      generatedConfig.redraw = true;
      this.redrawChart = false;
    }

    return D.div(
      {
        className: this.props.className,
        style: {
          width: generatedConfig.width,
          height: generatedConfig.height,
        },
      },
      createElement(CHART_TYPE_MAPPING[config.type], generatedConfig)
    );
  }
}

function defaultPalette(index: number, opacity: number) {
  const colorNo = index % 8;
  const angle = colorNo * 45;
  return `hsla(${angle},75%,70%,${opacity})`;
}

function getLinearSeriesDefaultStyle(index: number, fillOpacity: number) {
  return {
    backgroundColor: defaultPalette(index, fillOpacity),
    borderColor: defaultPalette(index, 1),
    borderWidth: 1,
    pointBackgroundColor: defaultPalette(index, 1),
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: defaultPalette(index, 1),
  };
}

function getDefaultColor(index: number): string {
  return defaultPalette(index, 1);
}

function singleLinearDatasetStyle() {
  return {
    borderColor: 'lightgray',
    fill: false,
    pointRadius: 5,
    pointHitRadius: 7,
  };
}

export default ChartJsRenderer;
