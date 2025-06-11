/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Denis Ostapenko
 */

import { Props, Component } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';

export class GraphEvent {
  public begin: number;
  public end: number;
  public weight: number;

  constructor(begin: number, end: number, weight: number) {
    this.begin = begin;
    this.end = end;
    this.weight = weight;
  }
}

export interface FacetSliderGraphProps extends Props<FacetSliderGraph> {
  events: GraphEvent[];
  min: number; 
  max: number; 
  range: { begin: number; end: number }; 
  dataMin: number; 
  dataMax: number; 
  coreMin: number; 
  coreMax: number; 
}

const PREFIX_DISPLAY_RATIO_GRAPH = 0.05; 
const SUFFIX_DISPLAY_RATIO_GRAPH = 0.05;
const CORE_DISPLAY_RATIO_GRAPH = 1.0 - PREFIX_DISPLAY_RATIO_GRAPH - SUFFIX_DISPLAY_RATIO_GRAPH;

export class FacetSliderGraph extends Component<FacetSliderGraphProps, {}> {
  private points: number[][];

  constructor(props: FacetSliderGraphProps, context: any) {
    super(props, context);
    this.points = this.calculatePoints(props.events, props);
  }

  private graphDataValueToDisplayX = (value: number, props: FacetSliderGraphProps): number => {
    const { dataMin, dataMax, coreMin, coreMax } = props;

    if (dataMin === undefined || dataMax === undefined || coreMin === undefined || coreMax === undefined) {
      return 0.5; 
    }
    
    if (dataMin >= dataMax) return 0.5;
    const actualCoreMin = Math.max(dataMin, coreMin);
    const actualCoreMax = Math.min(dataMax, coreMax);
        
    const effectiveCoreMin = (actualCoreMin >= actualCoreMax) ? dataMin : actualCoreMin;
    const effectiveCoreMax = (actualCoreMin >= actualCoreMax) ? dataMax : actualCoreMax;

    const hasPrefixRegion = effectiveCoreMin > dataMin;
    const hasSuffixRegion = effectiveCoreMax < dataMax;

    let currentPrefixRatio = hasPrefixRegion ? PREFIX_DISPLAY_RATIO_GRAPH : 0;
    let currentSuffixRatio = hasSuffixRegion ? SUFFIX_DISPLAY_RATIO_GRAPH : 0;
    let currentCoreRatio = 1.0 - currentPrefixRatio - currentSuffixRatio;

    if (value <= effectiveCoreMin) {
      if (!hasPrefixRegion) return 0;
      const prefixRange = effectiveCoreMin - dataMin;
      if (prefixRange <= 0) return 0;
      if (currentPrefixRatio === 0) return 0; 
      return ((value - dataMin) / prefixRange) * currentPrefixRatio;
    } else if (value >= effectiveCoreMax) {
      if (!hasSuffixRegion) return 1.0;
      const suffixRange = dataMax - effectiveCoreMax;
      if (suffixRange <= 0) return 1.0;
      if (currentSuffixRatio === 0) return 1.0; 
      return (
        currentPrefixRatio +
        currentCoreRatio +
        ((value - effectiveCoreMax) / suffixRange) * currentSuffixRatio
      );
    } else {
      const coreRange = effectiveCoreMax - effectiveCoreMin;
      if (coreRange <= 0) {
        return currentPrefixRatio;
      }
      if (currentCoreRatio === 0 && currentPrefixRatio === 0) return 0; 
      if (currentCoreRatio === 0) return currentPrefixRatio; 
      return (
        currentPrefixRatio +
        ((value - effectiveCoreMin) / coreRange) * currentCoreRatio
      );
    }
  };
  
  private calculatePoints(events: GraphEvent[], currentProps: FacetSliderGraphProps): number[][] {
    if (!events || events.length === 0) {
      return [];
    }
    let indices: number[] = [];
    let pointsDataValues: number[] = []; 
    let changes: number[] = [];
    let i = 0;
    for (let event of events) {
      pointsDataValues.push(event.begin);
      changes.push(event.weight);
      indices.push(i++);
      pointsDataValues.push(event.end);
      changes.push(-event.weight);
      indices.push(i++);
    }

    indices.sort((ia, ib) => 
      (pointsDataValues[ia] - pointsDataValues[ib] === 0 ? 
        changes[ib] - changes[ia] : 
        pointsDataValues[ia] - pointsDataValues[ib])
    );

    const n = pointsDataValues.length;
    let currentWeight = 0;
    let maxWeight = 0;
    for (let j = 0; j < n; ++j) {
      currentWeight += changes[indices[j]];
      if (currentWeight > maxWeight) {
        maxWeight = currentWeight;
      }
    }

    let coordinates: number[][] = [];
    currentWeight = 0;

    for (let k = 0; k < n; ++k) {
      const dataValue = pointsDataValues[indices[k]];
      const displayX = this.graphDataValueToDisplayX(dataValue, currentProps);
      
      const y1 = maxWeight === 0 ? 0 : currentWeight / maxWeight;
      coordinates.push([displayX, y1]);
      
      currentWeight += changes[indices[k]];
      const y2 = maxWeight === 0 ? 0 : currentWeight / maxWeight;
      coordinates.push([displayX, y2]);
    }
    return coordinates;
  }

  componentWillReceiveProps(newProps: FacetSliderGraphProps) {
    if (newProps.events !== this.props.events || 
        newProps.dataMin !== this.props.dataMin || 
        newProps.dataMax !== this.props.dataMax ||
        newProps.coreMin !== this.props.coreMin ||
        newProps.coreMax !== this.props.coreMax
        ) {
      this.points = this.calculatePoints(newProps.events, newProps);
    }
  }

  componentWillMount() {
    this.points = this.calculatePoints(this.props.events, this.props);
  }

  componentDidMount() {
    this.updateCanvas();
  }

  componentDidUpdate(prevProps: FacetSliderGraphProps, prevState: {}) {
    this.updateCanvas();
  }

  updateCanvas() {
    const canvas = findDOMNode(this.refs['canvas']) as HTMLCanvasElement;
    if (!canvas) return;
    const container = this.refs['canvas-container'] as HTMLElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    const h = canvas.height;
    const w = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    ctx.clearRect(0, 0, w, h);
  
    const points = this.points;

    if (points.length >= 4) { 
      ctx.fillStyle = 'rgba(0, 140, 186, 0.3)'; 
      for (let k = 0; k < (points.length / 2) - 1; ++k) {
        const x_start_scaled = points[2*k][0];
        const y_top_scaled = points[2*k+1][1];
        const x_end_scaled = points[2*(k+1)][0];

        if (x_start_scaled >= x_end_scaled || y_top_scaled <= 0) {
          continue;
        }

        const x_canvas = x_start_scaled * (w - 2) + 1;
        const y_canvas_top = h - (y_top_scaled * (h - 2) + 1);
        const bar_canvas_width = (x_end_scaled - x_start_scaled) * (w - 2);
        const bar_canvas_height = (h - 1) - y_canvas_top;

        if (bar_canvas_width > 0 && bar_canvas_height > 0) {
          ctx.fillRect(x_canvas, y_canvas_top, bar_canvas_width, bar_canvas_height);
        }
      }
    }

    if (points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#008cba';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      let lastX = points[0][0] * (w - 2) + 1;
      let lastY = h - (points[0][1] * (h - 2) + 1);
      ctx.moveTo(lastX, lastY);
  
      for (let i = 1; i < points.length; ++i) {
        const x = points[i][0] * (w - 2) + 1;
        const y = h - (points[i][1] * (h - 2) + 1);
        
        if (Math.abs(x - lastX) > w / 100 || Math.abs(y - lastY) > h / 100) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        lastX = x;
        lastY = y;
      }
      ctx.stroke();
    }
  
    const selectionBeginDisplayX = this.graphDataValueToDisplayX(this.props.range.begin, this.props);
    const selectionEndDisplayX = this.graphDataValueToDisplayX(this.props.range.end, this.props);

    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.strokeRect(
      Math.round(selectionBeginDisplayX * w) + 0.5,
      0 - 10.5, 
      Math.round((selectionEndDisplayX - selectionBeginDisplayX) * w),
      h + 20 
    );
  }  

  render() {
    return D.div(
      { ref: 'canvas-container' },
      D.canvas({
        ref: 'canvas',
        width: '100%',
        height: '100',
      })
    );
  }
}

export default FacetSliderGraph;
