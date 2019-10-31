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

import { Dictionary, merge, find } from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as D from 'react-dom-factories';
import {
  Chart, ChartData, ChartOptions, LegendItem, TooltipOptions, TooltipModel, TooltipItem,
  ScaleOptions, LinearDataSet, BarDataSet, CircularDataSet, BubbleDataSet, BubbleDataObject
} from 'chart.js';
import ChartComponent, {
  ChartComponentProps, Line, Bar, Radar, Pie, Doughnut, Bubble
} from 'react-chartjs-2';

import { Rdf } from 'platform/api/rdf';
import { TemplateItem } from 'platform/components/ui/template';
import { TargetedPopover, TargetedPopoverProps } from 'platform/components/ui/TargetedPopover';

import {
  ChartType, BuiltData, DataPoint, ChartRendererProps, propertyValue, labeled, parseNumeric,
  ChartTooltipData, ChartTooltipPoint, TOOLTIP_ID, DEFAULT_TOOLTIP_MARKUP,
} from './ChartingCommons';

const LINE_FILL_OPACITY = 0.2;
const BAR_FILL_OPACITY = 0.6;
const DEFAULT_BUBBLE_RADIUS = 10;

interface State {
  hiddenCategories?: Immutable.Set<Rdf.Node>;
  tooltip?: TooltipState;
}

interface MappedOptions {
  data: ChartData;
  options: ChartOptions;
  makeTooltip: (refs: ReadonlyArray<PointReference>) => ChartTooltipData;
}

interface PointReference {
  setIndex: number;
  pointIndex: number;
}

interface TooltipState {
  hovering: boolean;
  caretX: number;
  caretY: number;
  data: ChartTooltipData;
  props: TargetedPopoverProps;
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

export class ChartJsRenderer extends React.Component<ChartRendererProps, State> {
  private redrawChart = false;

  private chart: ChartComponent<ChartComponentProps>;
  private mapped: MappedOptions;

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
  ): MappedOptions {
    if (data.sets.length === 0) {
      return {
        data: {datasets: [], labels: []},
        options: {},
        makeTooltip: () => ({points: []}),
      };
    }

    const firstSet = data.sets[0];
    const categories = firstSet.points.map(point =>
      point[firstSet.mapping.category || firstSet.mapping.x]);
    const chartLabels = categories.map(category => labeled(category, labels));
    const datasets = data.sets.map<CircularDataSet>((set, setIndex) => ({
      label: set.name || labeled(set.iri, labels),
      data: set.points.map(point =>
        propertyValue(point, set.mapping.value || set.mapping.y)
          .map(parseFloat).getOrElse(0)),
      backgroundColor: set.points.map((point, pointIndex) =>
        propertyValue(point, set.mapping.color)
          .getOrElse(getDefaultColor(pointIndex))),
    }));

    let options = {};
    let makeTooltip: MappedOptions['makeTooltip'];

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
        }
      );
      makeTooltip = (refs): ChartTooltipData => {
        const {setIndex, pointIndex} = refs[0];
        const set = datasets[setIndex];
        const relation: ChartTooltipPoint = {
          bindings: firstSet.points[pointIndex],
          iri: firstSet.iri ? firstSet.iri.value : undefined,
          label: set.label,
          value: set.data[pointIndex],
        };
        return {
          category: {
            iri: categories[pointIndex].value,
            label: chartLabels[pointIndex],
            markerStyle: `fill: ${set.backgroundColor[pointIndex] as string}`,
          },
          points: [relation]
        };
      };
    } else {
      makeTooltip = refs => ({
        points: refs.map(({setIndex, pointIndex}): ChartTooltipPoint => {
          const set = datasets[setIndex];
          return {
            bindings: data.sets[setIndex].points[pointIndex],
            iri: categories[pointIndex].value,
            label: chartLabels[pointIndex],
            value: set.data[pointIndex],
            markerStyle: `fill: ${set.backgroundColor[pointIndex] as string}`,
          };
        })
      });
    }

    return {
      data: {labels: chartLabels, datasets},
      options,
      makeTooltip,
    };
  }

  private mapCategorialData(
    data: BuiltData, labels: Dictionary<string>
  ): MappedOptions {
    const mapped = data.sets.length === 1
      ? this.mapSingleCategorialSet(data, labels)
      : this.mapMultipleCategorialSets(data, labels);

    const chartType = this.props.config.type;
    if (chartType === 'line' || chartType === 'bar') {
      merge(mapped.options, {
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
      merge(mapped.options, {
        scale: {
          ticks: {beginAtZero: true},
        },
      });
    }

    return mapped;
  }

  /**
   * Perform separate mapping for single dataset case to display
   * different legend with a legend item for each dataset point.
   */
  private mapSingleCategorialSet(
    data: BuiltData, labels: Dictionary<string>
  ): MappedOptions {
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
        }) as number[] | BubbleDataObject[],
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

    type Point = number | { x: number; y: number; r?: number };

    return {
      data: chartData,
      options: this.singleCategorialSetLegendOptions(data, labels),
      makeTooltip: (refs): ChartTooltipData => {
        const {pointIndex} = refs[0];
        const point: Point = dataset.data[pointIndex];
        const relation: ChartTooltipPoint = {
          bindings: set.points[pointIndex],
          iri: set.iri ? set.iri.value : undefined,
          label: dataset.label,
          value: (
            typeof point === 'number' ? point :
            typeof point.r === 'number' ? `(${point.x}, ${point.y}, ${point.r})` :
            `(${point.x}, ${point.y})`
          ),
        };
        return {
          category: {
            iri: displayedCategories[pointIndex].category.value,
            label: chartData.labels[pointIndex],
            markerStyle: `fill: ${borderColors[pointIndex]}`,
          },
          points: [relation],
        };
      }
    };
  }

  private singleCategorialSetLegendOptions(
    data: BuiltData, labels: Dictionary<string>
  ): ChartOptions {
    const legendItems = data.categories.map((category, categoryIndex): CustomLegendItem => {
      return {
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
  ): MappedOptions {
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
    return {
      data: chartData,
      options: {},
      makeTooltip: (refs): ChartTooltipData => {
        const {pointIndex} = refs[0];
        return {
          category: {
            iri: data.categories[pointIndex].value,
            label: chartData.labels[pointIndex]
          },
          points: refs.map(({setIndex, pointIndex}): ChartTooltipPoint => {
            const source = data.sets[setIndex];
            const mapped = chartData.datasets[setIndex];
            return {
              bindings: source.points[pointIndex],
              iri: source.iri ? source.iri.value : undefined,
              label: mapped.label,
              value: mapped.data[pointIndex],
              markerStyle: `fill: ${mapped.borderColor as string}`,
            }
          }),
        };
      }
    };
  }

  private mapNumericalData(
    data: BuiltData, labels: Dictionary<string>
  ): MappedOptions {
    type MappedPoint = { x: number; y: number; r?: number };
    const datasets = data.sets.map((set, setIndex) => {
      const dataset: LinearDataSet = {
        label: set.name || labeled(set.iri, labels),
        data: set.points.map((point): MappedPoint | null => {
          const x = propertyValue(point, set.mapping.x || set.mapping.category).chain(parseNumeric);
          const y = propertyValue(point, set.mapping.y || set.mapping.value).chain(parseNumeric);
          return {
            x: x.getOrElse(0),
            y: y.getOrElse(0),
            r: propertyValue(point, set.mapping.z)
              .chain(parseNumeric).getOrElse(DEFAULT_BUBBLE_RADIUS),
          };
        }),
      };
      return merge(dataset, getLinearSeriesDefaultStyle(
        setIndex, this.props.config.type === 'bar' ? BAR_FILL_OPACITY : LINE_FILL_OPACITY));
    });
    const options = this.props.config.type === 'line' ? {
      scales: {
        xAxes: [{type: 'linear', position: 'bottom'} as ScaleOptions],
      },
    } : {};
    return {
      data: {datasets},
      options,
      makeTooltip: refs => ({
        points: refs.map(({setIndex, pointIndex}): ChartTooltipPoint => {
          const source = data.sets[setIndex];
          const mapped = datasets[setIndex];
          const point = mapped.data[pointIndex] as MappedPoint;
          return {
            bindings: source.points[pointIndex],
            iri: source.iri ? source.iri.value : undefined,
            label: mapped.label,
            value: typeof point.r === 'number'
              ? `(${point.x},${point.y},${point.r})`
              : `(${point.x},${point.y})`,
            markerStyle: `fill: ${mapped.borderColor as string}`,
          };
        })
      })
    };
  }

  render() {
    const {config, builtData, labels} = this.props;
    const {tooltip} = this.state;

    const isXYChart = config.type === 'line' || config.type === 'bubble';
    const isCategorialChart = config.type === 'bar' || config.type === 'radar';
    const isCircularChart = config.type === 'pie' || config.type === 'donut';

    let mapped: MappedOptions;
    if (isCircularChart) {
      mapped = this.mapCircularData(builtData, labels);
    } else if (isCategorialChart || (isXYChart && builtData.categories)) {
      mapped = this.mapCategorialData(builtData, labels);
    } else if (isXYChart && !builtData.categories) {
      mapped = this.mapNumericalData(builtData, labels);
    } else {
      throw Error(`Unsupported chart type '${config.type}'`);
    }

    this.mapped = mapped;
    const {data, options} = mapped;

    const specificStyle = find(config.styles, style => style.provider === 'chartjs');
    const tooltipOptions: TooltipOptions = {
      enabled: false,
      mode: 'index',
      position: 'nearest',
      custom: this.updateTooltip,
    };
    const optionsOverride: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      tooltips: tooltipOptions,
    };
    const generatedConfig: ChartComponentProps = {
      data: data,
      options: merge(options, optionsOverride),
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

    return (
      <div className={this.props.className}
        style={{
          width: generatedConfig.width,
          height: generatedConfig.height,
        }}>
        {React.createElement(
          CHART_TYPE_MAPPING[config.type],
          {...generatedConfig, ref: this.onChartMount}
        )}
        {tooltip ? (
          <TargetedPopover key={`${tooltip.caretX};${tooltip.caretY}`}
            onHide={tooltip.hovering ? undefined : this.onTooltipHide}
            {...tooltip.props}>
            <TemplateItem template={{
              source: config.tooltipTemplate || DEFAULT_TOOLTIP_MARKUP,
              options: tooltip.data,
            }} />
          </TargetedPopover>
        ) : null}
      </div>
    );
  }

  private onChartMount = (chart: ChartComponent<ChartComponentProps>) => {
    this.chart = chart;
  }

  private onTooltipHide = () => {
    this.setState({tooltip: undefined});
  }

  private updateTooltip = (model: TooltipModel) => {
    const existing = this.state.tooltip;

    if (this.props.config.disableTooltips) {
      if (existing) {
        this.setState({tooltip: undefined});
      }
      return;
    }

    if (existing && existing.caretX === model.caretX && existing.caretY === model.caretY) {
      if (model.opacity === 0) {
        this.setState({tooltip: {...existing, hovering: false}});
      } else if (!existing.hovering) {
        this.setState({tooltip: {...existing, hovering: true}});
      }
      return;
    }

    if (model.opacity === 0) {
      return;
    }

    const mapAlignment = (chartJsAlignment: string) => {
      switch(model.xAlign) {
        case 'left': return 'right';
        case 'right': return 'left';
        case 'center': return 'center';
      }
    }

    let popoverSide: TargetedPopoverProps['popoverSide'];
    let arrowAlignment: TargetedPopoverProps['arrowAlignment'];

    switch (model.yAlign) {
      case 'top':
        popoverSide = 'bottom';
        arrowAlignment = (
          model.xAlign === 'left' ? 'start' :
          model.xAlign === 'right' ? 'end' :
          'center'
        );
        break;
      case 'bottom':
        popoverSide = 'top';
        arrowAlignment = (
          model.xAlign === 'left' ? 'start' :
          model.xAlign === 'right' ? 'end' :
          'center'
        );
        break;
      case 'center':
        popoverSide = (
          model.xAlign === 'left' ? 'right' :
          model.xAlign === 'right' ? 'left' :
          'bottom'
        );
        arrowAlignment = 'center';
        break;
    }

    const chart = this.chart.chartInstance;
    const {offsetLeft, offsetTop} = chart.canvas as HTMLElement;

    this.setState({
      tooltip: {
        hovering: true,
        caretX: model.caretX,
        caretY: model.caretY,
        data: this.mapped.makeTooltip(
          model.dataPoints.map(p => ({setIndex: p.datasetIndex, pointIndex: p.index}))
        ),
        props: {
          id: TOOLTIP_ID,
          targetLeft: offsetLeft + model.caretX,
          targetTop: offsetTop + model.caretY,
          popoverSide,
          arrowAlignment,
        }
      }
    });
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
