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

import * as React from 'react';
import { ReactElement, CSSProperties } from 'react';
import { mapValues, uniqueId } from 'lodash';
import { Overlay, Popover } from 'react-bootstrap';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { ModuleRegistry } from 'platform/api/module-loader';
import { SparqlClient } from 'platform/api/sparql';

import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import {
  RadarPlotProps, SectorDescription, SubSectorDescription, ItemDescription, RingDescription,
  RadarTemplates
} from './Config';
import {
  Scalar, Vector, ellipsePointFromDirection, approximateUniformEllipticAngle,
  approximateEllipsePerimeter, convexHullOf,
} from './Geometry';
import { PlotLayout, computeLayout } from './Layout';

import * as styles from './RadarPlot.scss';

interface State {
  readonly loadedItems?: ReadonlyArray<ItemDescription>;
  readonly layout?: PlotLayout;
  readonly popover?: ReactElement<any>;
}

type TemplateType = keyof RadarTemplates;

/**
 * @example
  <mp-radar-plot width='1600' height='450'
    sectors='[
      {"iri": "test:a", "label": "Test A"},
      {"iri": "test:b", "label": "Test B"},
      {"iri": "test:c", "label": "Test C"}
    ]'
    subsectors='[
      {"sector": "test:a", "iri": "test:a/1", "label": "Test A1"},
      {"sector": "test:b", "iri": "test:b/1", "label": "Test B1"},
      {"sector": "test:b", "iri": "test:b/2", "label": "Test B2"},
      {"sector": "test:b", "iri": "test:b/3", "label": "Test B3"},
      {"sector": "test:c", "iri": "test:c/1", "label": "Test C1"},
      {"sector": "test:c", "iri": "test:c/2", "label": "Test C2"}
    ]'
    rings='[
      {"iri": "test:ring-1", "label": "Horizon 1"},
      {"iri": "test:ring-2", "label": "Horizon 2", "color": "#ebffe5"},
      {"iri": "test:ring-3", "label": "Horizon 3"}
    ]'
    clusters='[
      {"iri": "test:cluster-1", "label": "Test Cluster 1"},
      {"iri": "test:cluster-2", "label": "Test Cluster 2"}
    ]'
    templates='{
      "subSector": "<div>Sub-sector {{label}}:<br>{{iri}}</div>",
      "point": "<div>Point {{label}}:<br>{{iri}}</div>"
    }'
    subsector-label-style='fill: red'
    query='
      SELECT * WHERE {
        VALUES (?subsector ?ring ?iri ?label ?distance ?cluster) {
          (<test:a/1> <test:ring-2> <test:a/1/1> "A-1-1" 10 <test:cluster-1>)
          (<test:a/1> <test:ring-2> <test:a/1/2> "A-1-2" 20 <test:cluster-1>)
          (<test:b/2> <test:ring-1> <test:b/2/1> "B-2-1" 0 <test:cluster-1>)
          (<test:b/2> <test:ring-2> <test:b/2/2> "B-2-2" 5 <test:cluster-1>)
          (<test:b/2> <test:ring-2> <test:b/2/3> "B-2-3" 13 UNDEF)
          (<test:b/3> <test:ring-3> <test:b/3/1> "B-3-1" 23 <test:cluster-2>)
          (<test:b/3> <test:ring-3> <test:b/3/2> "B-3-2" 2 <test:cluster-2>)
          (<test:b/3> <test:ring-3> <test:b/3/3> "B-3-3" 25 <test:cluster-2>)
        }
      }
    '
  >
  </mp-radar-plot>
 */
export class RadarPlot extends Component<RadarPlotProps, State> {
  static readonly defaultProps: Partial<RadarPlotProps> = {
    clusters: [],
    templates: {},
    itemRadius: 15,
    popoverWidth: 200,
  };

  private readonly cancellation = new Cancellation();
  private readonly uniquePrefix = uniqueId('RadarPlot-');

  constructor(props: RadarPlotProps, context: any) {
    super(props, context);
    this.state = {
      layout: this.props.items ? computeLayout(this.props) : undefined,
    };
  }

  render() {
    const {width, height} = this.props;
    return (
      <div className={styles.component}>
        {this.renderSvg(Number(width), Number(height))}
      </div>
    );
  }

  componentDidMount() {
    if (this.props.query) {
      this.reloadItems(this.props);
    }
  }

  componentWillReceiveProps(nextProps: RadarPlotProps) {
    if (nextProps.query !== this.props.query) {
      this.setState({loadedItems: undefined, layout: undefined});
      this.reloadItems(nextProps);
    }
  }

  private reloadItems(props: RadarPlotProps) {
    this.cancellation.map(
      loadItems(props.query, this.context.semanticContext)
    ).observe({
      value: loadedItems => {
        this.setState((state, props): State => ({
          loadedItems,
          layout: computeLayout({...props, items: loadedItems}),
        }));
      },
      error: err => console.error(err),
    });
  }

  renderSvg(width: number, height: number) {
    const {itemRadius} = this.props;
    const {layout, popover} = this.state;
    if (!layout) {
      return <div style={{width, height}}><Spinner /></div>;
    }

    const {orderedSubsectors} = layout;

    const MAX_HEDER_HEIGHT = 50;
    const headerHeight = Math.min(height / 8, 50);
    const ringLabelHeight = headerHeight;

    const center: Vector = {x: width / 2, y: height - ringLabelHeight};
    const outerRadius = {x: width / 2, y: height - ringLabelHeight};
    const innerSubHeaderRadius = Vector.subtract(
      outerRadius, {x: headerHeight * 2, y: headerHeight * 2}
    );

    const directionFromIndex = (index: number) => {
      const location = index / orderedSubsectors.length;
      const normed = approximateUniformEllipticAngle(location, outerRadius.x, outerRadius.y);
      // multiply by -1 to account for inverted Y axis in SVG coordinates
      const angle = -1 * Math.PI * (1 - normed);
      return Vector.fromAngle(angle);
    };

    const cellPadding = itemRadius;
    const getItemPosition = (item: ItemDescription) => {
      return computeItemPosition(
        item,
        layout,
        directionFromIndex,
        center,
        innerSubHeaderRadius,
        cellPadding
      );
    };

    const parseStyle = (style: string) => ModuleRegistry.parseReactStyleFromCss(style);
    const sectorLabelStyle = parseStyle(this.props.sectorLabelStyle);
    const subsectorLabelStyle = parseStyle(this.props.subsectorLabelStyle);
    const ringLabelStyle = parseStyle(this.props.ringLabelStyle);
    const itemLabelStyle = parseStyle(this.props.itemLabelStyle);

    return (
      <svg width={width} height={height}>
        <Background layout={layout} center={center} outerRadius={innerSubHeaderRadius} />
        <Headers layout={layout}
          sectorLabelStyle={sectorLabelStyle}
          subsectorLabelStyle={subsectorLabelStyle}
          showPopover={this.showPopover}
          directionFromIndex={directionFromIndex}
          uniquePrefix={this.uniquePrefix}
          center={center}
          outerRadius={outerRadius}
          height={headerHeight}
        />
        <Grid layout={layout}
          labelStyle={ringLabelStyle}
          showPopover={this.showPopover}
          directionFromIndex={directionFromIndex}
          center={center}
          innerSubHeaderRadius={innerSubHeaderRadius}
          ringLabelHeight={ringLabelHeight}
        />
        <Clusters layout={layout}
          showPopover={this.showPopover}
          getItemPosition={getItemPosition}
          itemRadius={itemRadius}
        />
        <Items layout={layout}
          labelStyle={itemLabelStyle}
          showPopover={this.showPopover}
          directionFromIndex={directionFromIndex}
          getItemPosition={getItemPosition}
          itemRadius={itemRadius}
        />
        {popover}
      </svg>
    );
  }

  private showPopover = (type: TemplateType, iri: string, label: string, target: EventTarget) => {
    const template = this.props.templates[type];
    const newPopover = (
      <Overlay key={`${type}:${iri}`}
        show={true}
        rootClose={true}
        onHide={() => {
          this.setState({popover: undefined});
        }}
        placement='bottom'
        target={target as Element}>
        <Popover id='radar-plot-popover' title={`${label}`}>
          <div style={{width: this.props.popoverWidth}}>
            {template
              ? <TemplateItem template={{source: template, options: {iri, label}}} />
              : <i>No info available</i>}
          </div>
        </Popover>
      </Overlay>
    );
    this.setState({popover: newPopover});
  };
}

function loadItems(query: string, context: SparqlClient.QueryContext) {
  return SparqlClient.select(query, {context}).map(({results}) => {
    const items: ItemDescription[] = [];
    for (const binding of results.bindings) {
      const {iri, subsector, ring, cluster, label, distance, color} = binding;
      if (iri && subsector && distance) {
        const itemDistance = Number(distance.value);
        if (!Number.isFinite(itemDistance)) {
          console.warn(`Invalid distance for item '${iri}'`);
        }
        items.push({
          iri: iri.value,
          subsector: subsector.value,
          ring: ring.value,
          cluster: cluster ? cluster.value : undefined,
          label: label ? label.value : iri.value,
          distance: Number.isFinite(itemDistance) ? itemDistance : 0,
          color: color ? color.value : undefined,
        });
      }
    }
    return items;
  });
}

class Headers extends Component<{
  layout: PlotLayout;
  sectorLabelStyle: CSSProperties;
  subsectorLabelStyle: CSSProperties;
  showPopover: (type: TemplateType, iri: string, label: string, target: EventTarget) => void;
  directionFromIndex: (index: number) => Vector;
  uniquePrefix: string;
  center: Vector;
  outerRadius: Vector;
  height: number;
}, {}> {
  render() {
    const {
      layout, sectorLabelStyle, subsectorLabelStyle, showPopover, directionFromIndex, uniquePrefix,
      center, outerRadius, height,
    } = this.props;
    const {sectors, subsectorsBySector, orderedSubsectors, sectorLayouts, sectorColors} = layout;
    const innerHeaderRadius = Vector.subtract(outerRadius, {x: height, y: height});
    const innerSubHeaderRadius = Vector.subtract(
      innerHeaderRadius, {x: height, y: height}
    );
    return (
      <g className={styles.headers}>
        {sectors.map((sector, i) => {
          const {startIndex, endIndex} = sectorLayouts[sector.iri];
          return <SectorHeader key={sector.iri}
            onTriggerPopover={target => {
              showPopover('sector', sector.iri, sector.label, target);
            }}
            className={styles.sectorHeader}
            style={sectorLabelStyle}
            shortId={`${uniquePrefix}-sector-${i}`}
            startDirection={directionFromIndex(startIndex)}
            endDirection={directionFromIndex(endIndex)}
            center={center}
            innerRadius={innerHeaderRadius}
            headerHeight={height}
            label={sector.label}
            color={sectorColors[sector.iri]}
          />;
        })}
        {orderedSubsectors.map((subsector, j) => {
          const {startIndex, endIndex} = sectorLayouts[subsector.iri];
          return <SectorHeader
            key={subsector.iri}
            onTriggerPopover={target => {
              showPopover('subsector', subsector.iri, subsector.label, target);
            }}
            className={styles.subsectorHeader}
            style={subsectorLabelStyle}
            shortId={`${uniquePrefix}-subsector-${j}`}
            startDirection={directionFromIndex(startIndex)}
            endDirection={directionFromIndex(endIndex)}
            center={center}
            innerRadius={innerSubHeaderRadius}
            headerHeight={height}
            label={subsector.label}
            color={sectorColors[subsector.iri]}
          />;
        })}
      </g>
    );
  }
}

class SectorHeader extends Component<{
  onTriggerPopover: (target: EventTarget) => void;
  className: string;
  style: CSSProperties;
  shortId: string;
  startDirection: Vector;
  endDirection: Vector;
  center: Vector;
  innerRadius: Vector;
  headerHeight: number;
  label: string;
  color: string;
}, {}> {
  render() {
    const {
      onTriggerPopover, className, style, shortId, startDirection, endDirection,
      center, innerRadius, headerHeight, label, color,
    } = this.props;

    const innerStart = Vector.add(
      center, ellipsePointFromDirection(startDirection, innerRadius)
    );
    const innerMiddle = Vector.add(
      center,
      ellipsePointFromDirection(
        Vector.lerp(startDirection, endDirection, 0.5),
        innerRadius
      )
    );
    const innerEnd = Vector.add(
      center, ellipsePointFromDirection(endDirection, innerRadius)
    );

    const outerRadius = Vector.add(innerRadius, {x: headerHeight, y: headerHeight});
    const outerStart = Vector.add(
      center, ellipsePointFromDirection(startDirection, outerRadius)
    );
    const outerEnd = Vector.add(
      center, ellipsePointFromDirection(endDirection, outerRadius)
    );

    const triggerOnHeader = (e: React.MouseEvent<EventTarget>) => {
      const parent = e.currentTarget;
      if (parent instanceof Element) {
        const target = parent.querySelector(`.${styles.sectorPopoverTarget}`);
        if (target) {
          onTriggerPopover(target);
        }
      }
    };

    const labelPathId = `${shortId}-labelPath`;
    return (
      <g className={className}
        onMouseEnter={triggerOnHeader}
        onClick={triggerOnHeader}>
        <defs>
          <path id={labelPathId}
            d={`
              M ${(innerStart.x + outerStart.x) / 2}
                ${(innerStart.y + outerStart.y) / 2}

              A ${(innerRadius.x + outerRadius.x) / 2}
                ${(innerRadius.y + outerRadius.y) / 2}
                0 0 1
                ${(innerEnd.x + outerEnd.x) / 2}
                ${(innerEnd.y + outerEnd.y) / 2}
            `}
          />
        </defs>
        <path fill={color}
          d={`
            M ${outerStart.x} ${outerStart.y}
            A ${outerRadius.x} ${outerRadius.y} 0 0 1 ${outerEnd.x} ${outerEnd.y}
            L ${innerEnd.x} ${innerEnd.y}
            A ${innerRadius.x} ${innerRadius.y} 0 0 0 ${innerStart.x} ${innerStart.y}
            Z
          `}
        />
        <circle className={styles.sectorPopoverTarget}
          cx={innerMiddle.x} cy={innerMiddle.y} r={1}
        />
        <text fontSize={headerHeight * 0.75} textAnchor='middle' style={style}>
          <textPath xlinkHref={`#${labelPathId}`} dominantBaseline='central' startOffset='50%'>
            {label}
          </textPath>
        </text>
      </g>
    );
  }
}

class Background extends Component<{
  layout: PlotLayout;
  center: Vector;
  outerRadius: Vector;
}, {}> {
  render() {
    const {layout, center, outerRadius} = this.props;
    const ringSize = Vector.scale(outerRadius, 1 / layout.rings.length);
    return <g className={styles.background}>
      {layout.rings.map((ring, index) => {
        const inner = Vector.scale(ringSize, index);
        const outer = Vector.scale(ringSize, index + 1);
        return this.renderRing(ring, center, inner, outer);
      })}
    </g>;
  }

  renderRing(
    ring: RingDescription,
    center: Vector,
    innerRadius: Vector,
    outerRadius: Vector
  ) {
    return (
      <path key={ring.iri} className={styles.ringArea}
        style={{fill: ring.color}}
        d={`
          M ${center.x - outerRadius.x} ${center.y}
          A ${outerRadius.x} ${outerRadius.y} 0 0 1 ${center.x + outerRadius.x} ${center.y}
          L ${center.x + innerRadius.x} ${center.y}
          A ${innerRadius.x} ${innerRadius.y} 0 0 0 ${center.x - innerRadius.x} ${center.y}
          Z
        `}
      />
    );
  }
}

class Grid extends Component<{
  layout: PlotLayout;
  labelStyle: CSSProperties;
  showPopover: (type: TemplateType, iri: string, label: string, target: EventTarget) => void;
  directionFromIndex: (index: number) => Vector;
  center: Vector;
  innerSubHeaderRadius: Vector;
  ringLabelHeight: number;
}, {}> {
  render() {
    const {
      layout, labelStyle, showPopover, directionFromIndex,
      center, innerSubHeaderRadius, ringLabelHeight,
    } = this.props;
    const {sectors, subsectorsBySector, sectorLayouts, rings} = layout;

    const lineEndFromIndex = (index: number): Vector => {
      const radius = ellipsePointFromDirection(
        directionFromIndex(index), innerSubHeaderRadius
      );
      return Vector.add(center, radius);
    };

    const ringSize = Vector.scale(innerSubHeaderRadius, 1 / rings.length);

    return (
      <g className={styles.grid}>
        {rings.map((ring, i) => {
          const radius = Vector.scale(ringSize, i);
          const onTriggerPopover = (e: React.MouseEvent<EventTarget>) => {
            showPopover('ring', ring.iri, ring.label, e.currentTarget);
          };
          return (
            <g key={ring.iri}>
              {i === 0 ? null : (
                <path className={styles.ringLine}
                  d={`
                    M ${center.x - radius.x} ${center.y}
                    A ${radius.x} ${radius.y} 0 0 1 ${center.x + radius.x} ${center.y}
                  `}
                />
              )}
              <text className={styles.ringLabel}
                x={center.x - radius.x - ringSize.x / 2}
                y={center.y + ringLabelHeight / 2}
                style={labelStyle}
                textAnchor='middle'
                alignmentBaseline='central'
                fontSize={ringLabelHeight * 0.3}
                onMouseEnter={onTriggerPopover}
                onClick={onTriggerPopover}>
                {ring.label}
              </text>
            </g>
          );
        })}
        {sectors.map((sector, i) => {
          const sectorEnd = lineEndFromIndex(sectorLayouts[sector.iri].startIndex);
          const subsectors = subsectorsBySector[sector.iri];
          return (
            <g key={sector.iri}>
              {i === 0 ? null : (
                <line className={styles.sectorLine}
                  x1={center.x} y1={center.y}
                  x2={sectorEnd.x} y2={sectorEnd.y}
                />
              )}
              {subsectors.map((subsector, j) => {
                if (j === 0) { return null; }
                const subsectorEnd = lineEndFromIndex(sectorLayouts[subsector.iri].startIndex);
                return (
                  <line className={styles.subsectorLine} key={subsector.iri}
                    x1={center.x} y1={center.y}
                    x2={subsectorEnd.x} y2={subsectorEnd.y}
                  />
                );
              })}
            </g>
          );
        })}
        <line className={styles.sectorLine}
          x1={center.x - innerSubHeaderRadius.x} y1={center.y}
          x2={center.x + innerSubHeaderRadius.x} y2={center.y}
        />
      </g>
    );
  }
}

class Clusters extends Component<{
  layout: PlotLayout;
  showPopover: (type: TemplateType, iri: string, label: string, target: EventTarget) => void;
  getItemPosition: (item: ItemDescription) => Vector;
  itemRadius: number;
}, {}> {
  render() {
    const {layout, showPopover, getItemPosition, itemRadius} = this.props;
    const {clusters, clusterColors, items} = layout;
    return (
      <g className={styles.clusters}>
        {clusters.map(cluster => {
          const points = items
            .filter(item => item.cluster === cluster.iri)
            .map(getItemPosition);

          if (points.length < 2) {
            return null;
          }
          const convexHull = convexHullOf(points);
          const marginRadius = itemRadius * 1.3;

          const orthogonalClockwise = (v: Vector) => ({x: -v.y, y: v.x});

          const pathGeometry = 'M ' + convexHull.map((p, i) => {
            const previousIndex = i === 0 ? (convexHull.length - 1) : (i - 1);
            const nextIndex = (i + 1) % convexHull.length;

            const previous = convexHull[previousIndex];
            const next = convexHull[nextIndex];

            const previousOrthogonal =  Vector.scale(orthogonalClockwise(
              Vector.normalize(Vector.subtract(p, previous))
            ), marginRadius);
            const nextOrthogonal = Vector.scale(orthogonalClockwise(
              Vector.normalize(Vector.subtract(next, p))
            ), marginRadius);

            const previousPivot = Vector.add(p, previousOrthogonal);
            const nextPivot = Vector.add(p, nextOrthogonal);

            const midPrevious = Vector.add(Vector.lerp(p, previous, 1 / 3), previousOrthogonal);
            const midNext = Vector.add(Vector.lerp(p, next, 1 / 3), nextOrthogonal);

            return `${midPrevious.x} ${midPrevious.y}` +
              ` L ${previousPivot.x} ${previousPivot.y}` +
              ` A ${marginRadius} ${marginRadius} 0 0 0 ${nextPivot.x} ${nextPivot.y}` +
              ` L ${midNext.x} ${midNext.y}`;
          }).join(' L ') + ' Z';

          const color = clusterColors[cluster.iri];
          return (
            <path key={cluster.iri}
              className={styles.cluster}
              d={pathGeometry}
              fill={color}
              stroke={color}
            />
          );
        })}
      </g>
    );
  }
}

class Items extends Component<{
  layout: PlotLayout;
  labelStyle: CSSProperties;
  showPopover: (type: TemplateType, iri: string, label: string, target: EventTarget) => void;
  directionFromIndex: (index: number) => Vector;
  getItemPosition: (item: ItemDescription) => Vector;
  itemRadius: number;
}, {}> {
  render() {
    const {
      layout, labelStyle, showPopover, directionFromIndex, getItemPosition, itemRadius,
    } = this.props;
    const {orderedSubsectors, itemsBySubsector, normalizedPositions, sectorColors} = layout;
    return (
      <g className={styles.items}>
        {orderedSubsectors.map((subsector, i) => {
          const items = itemsBySubsector[subsector.iri] || [];
          if (items.length === 0) {
            return null;
          }
          return (
            <g key={subsector.iri}>
              {items.map(item => {
                const position = getItemPosition(item);
                const cluster = item.cluster ? layout.clustersByIri[item.cluster] : undefined;
                const color = (
                  item.color ? item.color :
                  (cluster && cluster.color) ? cluster.color :
                  sectorColors[subsector.iri]
                );
                const onTriggerPopover = (e: React.MouseEvent<EventTarget>) => {
                  showPopover('point', item.iri, item.label, e.currentTarget);
                };
                return renderItem(item, position, itemRadius, color, labelStyle, onTriggerPopover);
              })}
            </g>
          );
        })}
      </g>
    );
  }
}

function renderItem(
  item: ItemDescription,
  position: Vector,
  radius: number,
  color: string,
  style: CSSProperties,
  onTriggerPopover: (e: React.MouseEvent<EventTarget>) => void
) {
  const {x, y} = position;
  return (
    <g className={styles.item} key={item.iri}
      onMouseEnter={onTriggerPopover}
      onClick={onTriggerPopover}>
      <circle cx={x} cy={y} r={radius} fill={color} />
      <text x={x} y={y}
        style={style}
        textAnchor='middle'
        dominantBaseline='central'
        fontSize={radius / 2}>
        {item.label}
      </text>
    </g>
  );
}

function computeItemPosition(
  item: ItemDescription,
  layout: PlotLayout,
  directionFromIndex: (index: number) => Vector,
  center: Vector,
  outerAreaRadius: Vector,
  cellPadding: number,
) {
  const subsectorIndex = layout.sectorLayouts[item.subsector].startIndex;
  const ringIndex = layout.ringIndices[item.ring];
  const {x, y} = layout.normalizedPositions[item.iri];

  const distance = (ringIndex + y) / layout.rings.length;

  const radius = Vector.scale(outerAreaRadius, distance);
  const halfPerimeter = approximateEllipsePerimeter(radius.x, radius.y) / 2;
  const sectorLength = halfPerimeter / layout.orderedSubsectors.length;
  const xPadding = Math.min(1, cellPadding / sectorLength);

  const paddedX = Scalar.lerp(xPadding, 1 - xPadding, x);
  const direction = directionFromIndex(subsectorIndex + paddedX);

  const outerPointer = ellipsePointFromDirection(direction, outerAreaRadius);
  const totalHeight = Vector.length(outerPointer);
  const ringHeight = totalHeight / layout.rings.length;
  const yPadding = Math.min(cellPadding, ringHeight / 2);
  const pointer = Vector.scale(
    Vector.normalize(outerPointer),
    ringIndex * ringHeight + Scalar.lerp(cellPadding, ringHeight - cellPadding, y),
  );

  const position = Vector.add(center, pointer);
  return position;
}

export default RadarPlot;
