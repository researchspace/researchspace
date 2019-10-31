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
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 */

import * as React from 'react';
import {findDOMNode} from 'react-dom';
import 'ol/ol.css';
import Map from 'ol/map';
import View from 'ol/view';
import Vector from 'ol/source/vector';
import OSM from 'ol/source/osm';
import TileLayer from 'ol/layer/tile';
import VectorLayer from 'ol/layer/vector';
import Style from 'ol/style/style';
import Stroke from 'ol/style/stroke';
import Circle from 'ol/style/circle';
import Fill from 'ol/style/fill';
import LineString from 'ol/geom/linestring';
import CircleGeometry from 'ol/geom/circle';
import PolygonGeometry from 'ol/geom/polygon';
import SimpleGeometry from 'ol/geom/simplegeometry';
import proj from 'ol/proj';
import control from 'ol/control';
import Draw from 'ol/interaction/draw';
import Sphere from 'ol/sphere';
import * as _ from 'lodash';
import * as classNames from 'classnames';

import {
  SpatialDistance, SpatialBoundingBox, Coordinate,
} from 'platform/components/semantic/search/data/search/Model';
import * as styles from './OLMapSelection.scss';

export interface ZoomToOptions {
  lat: number;
  long: number;
  zoomLevel: number;
}

export interface OLMapSelectionProps {
  onSelect: (area: SelectedArea) => void;
  zoomTo?: ZoomToOptions;
}

export interface OLMapSelectionState {
  selectionTool: SelectType;
}

export enum SelectType {Box, Circle}

export interface SelectedArea {
  type: SelectType;
  circle?: SpatialDistance;
  box?: SpatialBoundingBox;
}

type Coord = [number, number];

const MAP_REF = 'metaphacts-map-selection';

/**
 * Openlayers map selection component. Can select rectangles and circles.
 * Keep in mind that circle selection is incorrect due to different
 * coordinate systems used for selection and for actual search.
 */
export class OLMapSelection extends React.Component<OLMapSelectionProps, OLMapSelectionState> {
  currentDraw: Draw;
  map: Map;
  vectorSource: Vector;
  view: View;

  constructor(props: OLMapSelectionProps) {
    super(props);
    this.state = {
      selectionTool: SelectType.Box,
    };
  }

  componentDidMount() {

    this.vectorSource = new Vector({wrapX: false});
    let vectorStyle = new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2,
      }),
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33',
        }),
      }),
    });

    let vector_draw = new VectorLayer({
      source: this.vectorSource,
      style: vectorStyle,
    });

    this.view = new View({
        center: proj.fromLonLat([0, 0], undefined),
        zoom: 3,
      });

    this.map = new Map({
      target: findDOMNode(this.refs[MAP_REF]) as Element,
      layers: [
        new TileLayer({
          source: new OSM(),
        }), vector_draw,
      ],
      controls: control.defaults({
        attributionOptions: ({
          collapsible: false,
        }),
      }),
      view: this.view,
    });

    this.updateCurrentDraw();

    this.vectorSource.on('change', (e) => {
      if (this.vectorSource.getFeatures().length > 0) {
        this.updateSelection();
      }
    });
  }

  componentWillReceiveProps(props: OLMapSelectionProps) {
    if (props.zoomTo) {
      this.view.setCenter(
        proj.transform([props.zoomTo.long, props.zoomTo.lat], 'EPSG:4326', 'EPSG:3857'));
      this.view.setZoom(props.zoomTo.zoomLevel);
    }
  }

  /**
   * transforms coordinates from web metacor to wgs-84
   * @param metacor
   */
  transformToWGS84(metacor: Coord): Coord {
    let wgs84 = proj.transform(metacor, 'EPSG:3857', 'EPSG:4326') as Coord;
    return wgs84;
  }

  /**
   * wraps longitude to fall into -180,180
   * @param wgs84
   * @returns Coord
   */
  wrapLongitudeOL(wgs84: Coord): Coord {
    const [long, lat] = wgs84;
    return [this.wrapLong(long), lat];
  }

  /**
   * wraps longitude to fall into -180,180
   * @param wgs84
   * @returns Coordinate
   */
  wrapLongitude(wgs84: Coordinate): Coordinate {
    const {lat, long} = wgs84;
    return {lat: lat, long: this.wrapLong(long)};
  }
  wrapLong(long: number) {
    while (long > 180) {
      long = long - 360;
    }
    while (long < -180) {
      long = long + 360;
    }
    return long;
  }

  updateSelection() {
    // there's small openlayers magic to get first feature,
    // it's coords and transform into lat, long in WGS84
    let feature = this.vectorSource.getFeatures()[0];
    let selectedArea: SelectedArea;
    switch (this.state.selectionTool) {
      case SelectType.Box:
        let olCoords = (feature.getGeometry() as LineString).getCoordinates()[0];
        let coords = _.map(olCoords, this.transformToWGS84);
        const firstPoint: Coordinate = {lat: coords[0][1], long: coords[0][0]};
        const secondPoint: Coordinate = {lat: coords[2][1], long: coords[2][0]};
        // User could draw rectangle in any direction, setting coordinates right
        const southWest: Coordinate = {
          lat: _.minBy([firstPoint, secondPoint], point => point.lat).lat,
          long: _.minBy([firstPoint, secondPoint], point => point.long).long,
        };
        const northEast: Coordinate = {
          lat: _.maxBy([firstPoint, secondPoint], point => point.lat).lat,
          long: _.maxBy([firstPoint, secondPoint], point => point.long).long,
        };
        // dealing with an edge-case of selection of the entire world
        if (northEast.long - southWest.long >= 360) {
          northEast.long = 180;
          southWest.long = -180;
        }
        selectedArea = {type: SelectType.Box, box: {
          southWest: this.wrapLongitude(southWest),
          northEast: this.wrapLongitude(northEast),
        }};
        break;
      case SelectType.Circle: {
        const circle = feature.getGeometry() as CircleGeometry;
        const olCenter = circle.getCenter() as Coord;
        const olRadius = circle.getRadius();

        // radius calculation in km for a circle drawn on projection map
        // will have large error up to 30%. We calculate a distance to eastern side of the circle
        const edgeCoordinate = this.transformToWGS84([olCenter[0] + olRadius, olCenter[1]]);

        const wgs84Sphere = new Sphere(6378137);
        const center = this.transformToWGS84(olCenter);
        const radius = wgs84Sphere.haversineDistance(
          center,
          edgeCoordinate
        );

        const wrappedCenter = this.wrapLongitudeOL(center);
        selectedArea = {type: SelectType.Circle, circle: {
          center: {lat: wrappedCenter[1], long: wrappedCenter[0]},
          distance: radius / 1000, // km
        }};
        break;
      }
    }

    this.props.onSelect(selectedArea);
  }

  updateCurrentDraw() {
    if (this.currentDraw) {
      this.map.removeInteraction(this.currentDraw);
    }
    this.currentDraw = new Draw({
      source: this.vectorSource,
      type: this.state.selectionTool === SelectType.Box ? 'LineString' : 'Circle',
      geometryFunction: (
        this.state.selectionTool === SelectType.Box ? this.geometryFunction : undefined
      ),
      maxPoints: 2,
      wrapX: false,
    });
    this.currentDraw.on('drawstart', (event) => this.vectorSource.clear());
    this.map.addInteraction(this.currentDraw);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectionTool !== this.state.selectionTool) {
      this.updateCurrentDraw();
    }
  }
  geometryFunction =
  (coordinates: Coord[], geometry: PolygonGeometry) : SimpleGeometry => {
    if (!geometry) {
      geometry = new PolygonGeometry(null);
    }
    let start = coordinates[0];
    let end = coordinates[1];
    geometry.setCoordinates([
      [start, [start[0], end[1]], end, [end[0], start[1]], start],
    ]);
    return geometry;
  };

  setSelectionTool(tool: SelectType) {
    this.setState(_.assign({}, this.state, {selectionTool: tool}));
  }

  render() {
    const selectionTool = this.state.selectionTool;
    return <div className={styles.body}>
      <div className={styles.tools}>
        <div className={styles.btnsWrap} role='group'>
          <button
            onClick={() => this.setSelectionTool(SelectType.Box)}
            className={
              classNames(
                styles.toolsBtnSquare,
                {[styles.btnActive]: selectionTool === SelectType.Box}
              )
             }
          ></button>
          <button
            onClick={() => this.setSelectionTool(SelectType.Circle)}
            className={
              classNames(
                styles.toolsBtnCircle,
                {[styles.btnActive]: selectionTool === SelectType.Circle}
              )
            }
          ></button>
        </div>
      </div>
      <div className={styles.map} ref={MAP_REF}></div>
    </div>;
  }
}
export default OLMapSelection;
