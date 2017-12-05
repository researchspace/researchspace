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

import { Dictionary, merge, find, cloneDeep, omit } from 'lodash';
import { DOM as D, Component, ReactElement, createElement } from 'react';

import {
  ChartType, BuiltData, ChartRendererProps, DataSetMappings, DataPoint,
  propertyValue, labeled, parseNumeric,
} from './ChartingCommons';

declare var BUNDLE_HIGHCHARTS: boolean;

let highchartsLoaded = false;
let ReactHighchartsChart: any;

interface HighchartsRendererState {
  libraryLoaded?: boolean;
  config?: HighchartsOptions;
}

export class HighchartsRenderer extends Component<ChartRendererProps, HighchartsRendererState> {
  private static CHART_TYPE_MAPPING: Record<ChartType, HighchartsOptions> = {
    'line':  {chart: {type: 'line'}},
    'bar':   {chart: {type: 'column'}},
    'radar': {
      chart: {type: 'line', polar: true},
      xAxis: {tickmarkPlacement: 'on'},
      yAxis: {min: 0, ['gridLineInterpolation' as any]: 'polygon'},
    },
    'pie':   {chart: {type: 'pie'}},
    'donut': {chart: {type: 'pie'}},
    'bubble': {
      chart: {type: 'bubble'},
      xAxis: {gridLineWidth: 1},
      plotOptions: {
        series: {
          dataLabels: {enabled: true, format: '{point.name}'},
        },
      },
    },
  };

  constructor(props: ChartRendererProps) {
    super(props);
    this.state = {
      libraryLoaded: false,
      config: this.buildConfig(props),
    };
  }

  private loadHigcharts = () => {
    if (BUNDLE_HIGHCHARTS) {
      if (!highchartsLoaded) {
        highchartsLoaded = true;
        require('highcharts-css');
        ReactHighchartsChart = require('react-highcharts');
        const HighchartsMore = require('highcharts-more');
        HighchartsMore(ReactHighchartsChart.Highcharts);
      }
      this.setState({libraryLoaded: true});
    }
  }

  componentWillMount() {
    this.loadHigcharts();
  }

  componentWillReceiveProps(nextProps: ChartRendererProps) {
    this.setState({
      config: this.buildConfig(nextProps),
    });
  }

  mapLinearNumericalScaleData(data: BuiltData, labels: Dictionary<string>): HighchartsOptions {
    return {
      series: data.sets.map(set => {
        const hasZAxis = Boolean(set.mapping.z);
        return {
          name: set.name || labeled(set.iri, labels),
          data: set.points.map(point => {
            const x = propertyValue(
              point, set.mapping.x || set.mapping.category).chain(parseNumeric);
            const y = propertyValue(
              point, set.mapping.y || set.mapping.value).chain(parseNumeric);
            // filter points with unparseable or missing coordinates
            if (x.isNothing || y.isNothing) { return null; }
            if (!hasZAxis) { return [x.get(), y.get()]; }

            const z = propertyValue(point, set.mapping.z).chain(parseNumeric);
            const name = propertyValue(point, set.mapping.category)
                .map(category => labels[category] || category);
            return {
              x: x.get(),
              y: y.get(),
              z: z.getOrElse(0),
              name: name.getOrElse(undefined),
            };
          }).filter(point => point !== null),
        };
      }),
    };
  }

  mapLinearCategorialScaleData(data: BuiltData, labels: Dictionary<string>): HighchartsOptions {
    return {
      xAxis: {categories: data.categories.map(category => labeled(category, labels))},
      series: data.sets.map(set => {
        return {
          name: set.name || labeled(set.iri, labels),
          data: set.points.map(point => {
            const coords = [];

            if (set.mapping.x && set.mapping.category) {
              const x = propertyValue(point, set.mapping.x).chain(parseNumeric);
              coords.push(x.getOrElse(0));
            }

            if (set.mapping.y || set.mapping.value) {
              const y = propertyValue(
                point, set.mapping.y || set.mapping.value).chain(parseNumeric);
              coords.push(y.getOrElse(0));
            }

            if (set.mapping.z) {
              const z = propertyValue(point, set.mapping.z).chain(parseNumeric);
              coords.push(z.getOrElse(0));
            }

            return coords.length === 1 ? coords[0] : coords;
          }).filter(p => p != null),
        };
      }),
    };
  }

  mapCircularData(
    data: BuiltData, labels: Dictionary<string>, isDonut: boolean
  ): HighchartsOptions {
    const cutoutRadius = isDonut ? 50 : 0;
    const ringWidth = (100 - cutoutRadius) / data.sets.length;
    const radius = (ringIndex: number) => cutoutRadius + ringWidth * ringIndex;

    const series = data.sets.map((set, setIndex) => {
      const pointData = set.points.map((point, pointIndex) => ({
        y: propertyValue(point, set.mapping.value || set.mapping.y).map(parseFloat).getOrElse(0),
        name: labeled(point[set.mapping.category || set.mapping.x], labels),
        // using default color scheme
        color: propertyValue(point, set.mapping.color).getOrElse(undefined),
      }));
      return {
        name: set.name || labeled(set.iri, labels),
        data: pointData,
        size: `${radius(setIndex + 1)}%`,
        innerSize: `${radius(setIndex)}%`,
      };
    });
    return {series};
  }

  render(): ReactElement<any> {
    if (this.state.libraryLoaded) {
      return createElement(ReactHighchartsChart, {config: this.state.config});
    } else {
      return D.span({});
    }
  }

  buildConfig(props: ChartRendererProps): HighchartsOptions {
    const {config, builtData, labels} = props;

    const isCategorialChart = config.type === 'bar' || config.type === 'radar';
    const isCircularChart = config.type === 'pie' || config.type === 'donut';

    let generatedConfig: HighchartsOptions;
    if (isCircularChart) {
      generatedConfig = this.mapCircularData(builtData, labels, config.type === 'donut');
    } else if (isCategorialChart || (config.type === 'line' && builtData.categories)) {
      generatedConfig = this.mapLinearCategorialScaleData(builtData, labels);
    } else if (config.type === 'line' || config.type === 'bubble') {
      generatedConfig = this.mapLinearNumericalScaleData(builtData, labels);
    } else {
      throw Error(`Unsupported chart type '${config.type}'`);
    }

    if (config.dimensions) {
      merge(generatedConfig, {
        chart: {
          className: this.props.className,
          width: config.dimensions.width,
          height: config.dimensions.height,
        } as HighchartsChartOptions,
      });
    }
    merge(generatedConfig,
      cloneDeep(HighchartsRenderer.CHART_TYPE_MAPPING[config.type]),
      {
        title: {text: null},
      });

    const specificStyle = find(config.styles, style => style.provider === 'highcharts');
    if (specificStyle && specificStyle.style) {
      merge(generatedConfig, specificStyle.style);
    }
    return generatedConfig;
  }
}

export default HighchartsRenderer;
