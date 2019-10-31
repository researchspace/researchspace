/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
  events: GraphEvent[]
  min: number
  max: number
  range: {begin: number, end: number}
}


export class FacetSliderGraph extends Component<FacetSliderGraphProps, {}> {
  private points: number[][];

  constructor(props, context) {
    super(props, context);
    this.points = [];
  }

  private calculatePoints(events: GraphEvent[]) {
    let indices = [];
    let points = [];
    let changes = [];
    let i = 0;
    for (let event of events) {
      let scaledWeight = event.weight / Math.max(1, event.end - event.begin);
      points.push(event.begin);
      changes.push(scaledWeight);
      indices.push(i);
      ++i;
      points.push(event.end);
      changes.push(-scaledWeight);
      indices.push(i);
      ++i;
    }
    indices.sort((ia, ib) => points[ia] - points[ib] === 0 ? changes[ib] - changes[ia] : points[ia] - points[ib]);
    const n = points.length;
    const min = n ? points[indices[0]] : 0;
    const max = n ? points[indices[n - 1]] : 0;
    let currentWeight = 0;
    let maxWeight = 0;
    for (let j = 0; j < n; ++j) {
      currentWeight += changes[indices[j]];
      if (currentWeight > maxWeight) {
        maxWeight = currentWeight;
      }
    }
    let coordinates = [];
    currentWeight = 0;
    for (let k = 0; k < n; ++k) {
      coordinates.push([(points[indices[k]] - min) / (max - min), currentWeight / maxWeight]);
      currentWeight += changes[indices[k]];
      coordinates.push([(points[indices[k]] - min) / (max - min), currentWeight / maxWeight]);
    }
    // ToDo: discrete compress
    return coordinates;
  }

  componentWillReceiveProps(newProps) {
    if (newProps.events !== this.props.events) {
      this.points = this.calculatePoints(newProps.events);
    }
  }

  componentWillMount() {
    this.points = this.calculatePoints(this.props.events);
  }

  componentDidMount() {
    this.updateCanvas();
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateCanvas();
  }

  updateCanvas() {
    const canvas = findDOMNode(this.refs['canvas']) as HTMLCanvasElement;
    canvas.width = (this.refs['canvas-container'] as HTMLElement).clientWidth;
    const h = canvas.height;
    const w = canvas.width;
    const ctx = canvas.getContext('2d');

    // Draw graph
    const points = this.points;
    if (points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#008cba';
      ctx.lineWidth = 0.5;
      ctx.moveTo(points[0][0] * (w - 2) + 1, h - points[0][1] * h);
      for (let i = 1; i < points.length; ++i) {
        ctx.lineTo(points[i][0] * (w - 2) + 1, h - points[i][1] * h);
      }
      ctx.stroke();
    }

    // Draw selection
    const min = this.props.min;
    const max = this.props.max;
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.strokeRect(
      Math.round((this.props.range.begin - min) / (max - min) * w) + 0.5, 0 - 10.5,
      Math.round((this.props.range.end - this.props.range.begin) / (max - min) * w), h + 20);
  }

  render() {
    return D.div(
      {ref: 'canvas-container'},
      D.canvas({
        ref: 'canvas', width: '100%', height: '100',
      })
    );
  }
}

export default FacetSliderGraph;
