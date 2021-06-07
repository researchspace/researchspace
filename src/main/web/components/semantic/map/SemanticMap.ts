/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { Props, createElement } from 'react';
import * as React from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Vector from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';
import Stroke from 'ol/style/Stroke';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import GeometryCollection from 'ol/geom/GeometryCollection';
import WKT from 'ol/format/WKT';
import { transform } from 'ol/proj';
import { defaults as controlDefaults } from 'ol/control';
import { Interaction } from 'ol/interaction';
import { defaults as interactionDefaults } from 'ol/interaction';
import { Extent } from 'ol/extent';
import { extend } from 'ol/extent';
import { createEmpty } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { getRenderPixel } from 'ol/render';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import XYZ from "ol/source/XYZ";

import { BuiltInEvents, trigger } from 'platform/api/events';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentContext } from 'platform/api/components';

import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import * as Popup from 'ol-popup';

import 'ol/ol.css';
import 'ol-popup/src/ol-popup.css';
import {
  SemanticMapBoundingBoxChanged,
  SemanticMapUpdateFeatureColor,
  SemanticMapReplaceBasemap,
  SemanticMapReplaceOverlay,
} from './SemanticMapEvents';
import { Dictionary } from 'platform/api/sparql/SparqlClient';
import { QueryConstantParameter } from '../search/web-components/QueryConstant';
import { Cancellation } from 'platform/api/async';
import { listen, Event } from 'platform/api/events';
import { WindowScroller } from 'react-virtualized';
import { zoomByDelta } from 'ol/interaction/Interaction';
import TilesLayer from './TilesLayer';
import {
  SemanticMapControlsOverlayOpacity,
  SemanticMapControlsOverlayVisualization,
} from './SemanticMapControlsEvents';
import { none } from 'ol/centerconstraint';

enum Source {
  OSM = 'osm',
}

interface ProviderOptions {
  endpoint: string;
  crs: string;
  style: string;
}

interface MapOptions {
  /**
   *
   */
  crs?: string;

  /**
   *
   */
  extent?: Array<number>;
}

interface Marker {
  link?: string;
  description?: string;
}

export interface SemanticMapConfig {
  /**
   * SPARQL Select query. Query should project `lat` and `lng`, with the WKT point.
   * Or `wkt` variable with WKT point literal.
   *
   * Also to use default marker template one need to project `link` with IRI of
   * the corresponding resource and `description` with some short textual
   * marker description text.
   *
   * One can customize color of the marker/polygon using `color` projection variable
   */
  query: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> for marker popup. By default shows `<semantic-link>` to the resource with a short textual description
   */
  tupleTemplate?: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results
   */
  noResultTemplate?: string;

  /**
   * Optional numeric zoom between 0-18 (max zoom level may vary depending on the resolution)
   * to fix the inital map zoom.
   * If no fixed zoom level is provided, the zoom will be calculated on the max bounding box
   * of available markers.
   */
  fixZoomLevel?: number;

  fixCenter?: Array<number>;

  /**
   * Map Options
   */
  mapOptions?: MapOptions;

  /**
   * ID for issuing component events.
   */
  id?: string;

  /**
   * Optional enum for calling the selected OpenLayer source
   * ENUM { "mapbox", "osm"}
   */
  provider?: Source;

  /**
   * Optional JSON object containing various user provided options
   */
  providerOptions?: ProviderOptions;

  tilesLayers?: any;
}

export type SemanticMapProps = SemanticMapConfig & Props<any>;

interface MapState {
  tupleTemplate?: Data.Maybe<HandlebarsTemplateDelegate>;
  errorMessage: Data.Maybe<string>;
  noResults?: boolean;
  isLoading?: boolean;
  overlayVisualization?: string;
}

const MAP_REF = 'researchspace-map-widget';

export class SemanticMap extends Component<SemanticMapProps, MapState> {
  private layers: { [id: string]: VectorLayer };
  private map: Map;
  private cancelation = new Cancellation();
  private tilesLayers = [];
  private mousePosition = null;

  constructor(props: SemanticMapProps, context: ComponentContext) {
    super(props, context);
    this.state = {
      tupleTemplate: maybe.Nothing<HandlebarsTemplateDelegate>(),
      noResults: false,
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
      overlayVisualization: 'normal',
    };

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapUpdateFeatureColor,
        })
      )
      .onValue(this.updateFeatureColor);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapReplaceBasemap,
        })
      )
      .onValue(this.replaceBasemap);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapReplaceOverlay,
        })
      )
      .onValue(this.replaceOverlay);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsOverlayOpacity,
        })
      )
      .onValue(this.setOverlayOpacity);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsOverlayVisualization,
        })
      )
      .onValue(this.setOverlayVisualizationFromEvent);
  }

  private setOverlayOpacity = (event: Event<any>) => {
    let new_opacity = event.data;
    let overlay_layer = this.getOverlayLayer();
    overlay_layer.setOpacity(new_opacity);
  };

  private getInputCrs() {
    return this.props.mapOptions === undefined || this.props.mapOptions.crs === undefined
      ? 'EPSG:3857'
      : this.props.mapOptions.crs;
  }

  private static createPopupContent(props, tupleTemplate: Data.Maybe<HandlebarsTemplateDelegate>) {
    let defaultContent = '';

    if (_.isUndefined(props.link) === false) {
      defaultContent += `
          <semantic-link uri="${props.link}"></semantic-link>
          <p>${props.description}</p>
      `;
    }

    return tupleTemplate.map((template) => template(props)).getOrElse(defaultContent);
  }

  public componentDidMount() {
    this.createMap();
  }

  public componentWillReceiveProps(props: SemanticMapProps, context: ComponentContext) {
    if (props.query !== this.props.query) {
      this.addMarkersFromQuery(props, context);
    }
  }

  public componentWillMount() {
    this.compileTemplatesInConfig(this.props);
  }

  public render() {
    if (!this.state.errorMessage.isNothing) {
      return D.div(
        { className: 'researchspace-map-widget' },
        createElement(ErrorNotification, { errorMessage: this.state.errorMessage.get() })
      );
    } else if (this.state.tupleTemplate === undefined) {
      return createElement(Spinner);
    } else if (this.state.noResults) {
      return createElement(TemplateItem, { template: { source: this.props.noResultTemplate } });
    }

    let tileslayers = this.getTilesLayersFromTemplate();

    return D.div(
      { style: { height: '100%', width: '100%' } },
      D.div(
        {
          ref: MAP_REF,
          className: 'researchspace-map-widget',
          style: {
            height: '100%',
            width: '100%',
            visibility: this.state.noResults ? 'hidden' : 'visible',
          },
        },
        D.div({
          // this div is for testing purpose only
          className: 'researchspace-map-widget-elements',
          ref: 'ref-map-widget-elements',
          onClick: this.getMarkerFromMapAsElements.bind(this),
          style: { display: 'none' },
        }),
        tileslayers
      ),
      this.state.isLoading ? createElement(Spinner) : null
    );
  }

  private initializeMarkerPopup(map) {
    const popup = new Popup();
    map.addOverlay(popup);

    map.on('click', (evt) => {
      // Hide existing popup and reset it's offset
      popup.hide();
      popup.setOffset([0, 0]);

      // Attempt to find a feature in one of the visible vector layers
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (f, layer) {
        return f;
      });

      if (feature) {
        const geometry = feature.getGeometry();
        const coord = getPopupCoordinate(geometry, evt.coordinate);
        const { features = [feature] } = feature.getProperties();

        const popupContent = features.map((feature) => {
          const props = feature.getProperties();
          return `<div>${SemanticMap.createPopupContent(props, this.state.tupleTemplate)}</div>`;
        });

        // info += "<p>" + props.locationtext + "</p>";
        // Offset the popup so it points at the middle of the marker not the tip
        popup.setOffset([0, -22]);
        popup.show(coord, `<mp-template-item>${popupContent.join('')}</mp-template-item>`);
      }
    });

    map.on('pointermove', (e) => {
      const hasFeatureAtPixel = map.hasFeatureAtPixel(e.pixel);
      map.getTarget().style.cursor = hasFeatureAtPixel ? 'pointer' : '';
    });
  }

  private replaceBasemap = (event: Event<any>) => {
    let newBasemap = this.getTilesLayerFromIdentifier(event.data.selectedBasemap);
    this.map.getLayers().removeAt(0);
    this.map.getLayers().insertAt(0, newBasemap);
  };

  private replaceOverlay = (event: Event<any>) => {
    var loaded_overlays = 0;
    this.map.getLayers().forEach(function (tilesLayer) {
      if (tilesLayer instanceof TileLayer && tilesLayer.get('level') === 'overlay') {
        loaded_overlays++;
      }
    });
    if (loaded_overlays > 0) {
      this.map.getLayers().removeAt(1);
    }

    let new_overlay = this.getTilesLayerFromIdentifier(event.data.selectedOverlay);

    this.map.getLayers().insertAt(1, new_overlay);
  };

  private setOverlayVisualizationFromEvent = (event: Event<any>) => {
    this.setOverlayVisualization(event.data);
  };

  private setOverlayVisualization(overlay_visualization: string) {
    let overlay_layer = this.getOverlayLayer();

    this.setState(
      {
        overlayVisualization: overlay_visualization,
      },
      () => {
        switch (overlay_visualization) {
          case 'normal': {
            overlay_layer.un('prerender', this.spyglassFunction);
            overlay_layer.un('postrender', function (event) {
              const ctx = event.context;
              ctx.restore();
            });
            this.map.render();
            break;
          }
          case 'spyglass': {
            overlay_layer.on('prerender', this.spyglassFunction);
            // after rendering the layer, restore the canvas context
            overlay_layer.on('postrender', function (event) {
              const ctx = event.context;
              ctx.restore();
            });
            this.map.render();
            break;
          }
        }
      }
    );
  }

  private spyglassFunction = (event) => {
    const radius = 120;
    const ctx = event.context;
    //let pixelRatio = event.frameState.pixelRatio;
    ctx.save();
    ctx.beginPath();
    if (this.mousePosition) {
      const pixel = getRenderPixel(event, this.mousePosition);
      const offset = getRenderPixel(event, [this.mousePosition[0] + radius, this.mousePosition[1]]);
      const canvasRadius = Math.sqrt(Math.pow(offset[0] - pixel[0], 2) + Math.pow(offset[1] - pixel[1], 2));
      ctx.arc(pixel[0], pixel[1], canvasRadius, 0, 2 * Math.PI);
      ctx.lineWidth = (2 * canvasRadius) / radius;
      ctx.strokeStyle = 'rgba(102,0,0,0.5)';
      ctx.stroke();
    }
    ctx.clip();
  };

  /**
   *
   * @param event
   *
   * The event data is structured as follows:
   * {
   *    "features": [
   *      {
   *        "subject":"SS_BLDG_052",
   *         "color":"rgba(143, 29, 33, .4)"
   *       }, ...
   *    ]
   * }
   *
   */

  private updateFeatureColor = (event: Event<any>) => {
    // It updates only the last layer, assuming it contains the features
    const layer = this.map.getLayers().getArray().slice(-1).pop() as VectorLayer;

    event.data['features'].forEach((feature) => {
      const i = this.getIndexBySubject(feature.subject, layer.getSource().getFeatures());

      layer
        .getSource()
        .getFeatures()
        [i].setStyle(
          new Style({
            fill: new Fill({
              color: feature.color,
            }),
            stroke: new Stroke({
              color: feature.color,
            }),
          })
        );
    });
  };

  private getIndexBySubject(subject: string, features: any) {
    let i = 0;
    for (const feature of features) {
      if (feature.values_.subject.value == subject) {
        return i;
      }
      i++;
    }
    return -1;
  }

  private transformToMercator(lng: number, lat: number): Coordinate {
    return transform([lng, lat], this.getInputCrs(), 'EPSG:3857');
  }

  private readWKT(wkt: string) {
    const format = new WKT();
    return format.readGeometry(wkt, {
      dataProjection: this.getInputCrs(),
      featureProjection: 'EPSG:3857',
    });
  }

  private createGeometries = (markersData: any[]) => {
    const geometries: { [type: string]: Feature[] } = {};

    markersData.forEach((marker) => {
      const f = new Feature(marker);
      let geo: Geometry = undefined;
      if (!_.isUndefined(marker['lat']) && !_.isUndefined(marker['lng'])) {
        geo = new Point(this.transformToMercator(parseFloat(marker['lng'].value), parseFloat(marker['lat'].value)));
      } else if (!_.isUndefined(marker['wkt']) && _.isUndefined(geo)) {
        geo = this.readWKT(marker['wkt'].value);
      }

      if (_.isUndefined(geo)) {
        const msg = `Result of SPARQL Select query does have neither
                    lat,lng nor wkt projection variable. `;
        this.setState({ errorMessage: maybe.Just(msg) });
      } else {
        f.setGeometry(geo);

        const type = geo.getType();
        geometries[type] = geometries[type] ? [...geometries[type], f] : [f];
      }
    });

    return geometries;
  };

  private createLayer = (features: Feature[], type: string): VectorLayer => {
    const source = new Vector({ features });
    if (type === 'Point') {
      const clusterSource = new Cluster({ source, distance: 40 });
      return new AnimatedCluster({
        source: clusterSource,
        style: getMarkerStyle(),
        zIndex: 1, // we want to always have markers on top of polygons
      });
    }
    return new VectorLayer({
      source,
      style: (feature: Feature) => {
        const geometry = feature.getGeometry();
        const color = feature.get('color');
        return getFeatureStyle(geometry, 'rgba(150,80,20,0.25)');
      },
      zIndex: 0,
    });
  };

  private getTilesLayersFromTemplate() {
    var tileslayers = React.Children.map(this.props.children, (child : any) => {
      if (child.type.name === 'TilesLayer') {
        let tileslayer = new TileLayer({
          source: new XYZ({url: child.props.url})
        });
        tileslayer.set('level', child.props.level);
        tileslayer.set('name', child.props.name);
        tileslayer.set('identifier', child.props.identifier);
        this.addTilesLayer(tileslayer)
        return child;
      }
    });
    return tileslayers;
  }

  private addTilesLayer(tileslayer) {
    //TODO: add existence constraints to avoid duplicates (with identifiers)
    this.tilesLayers.push(tileslayer);
  }

  private getAllTilesLayers() {
    return this.tilesLayers;
  }

  private getTilesLayerFromIdentifier(identifier) {
    let result;
    this.tilesLayers.forEach(function (tilesLayer) {
      if (tilesLayer.get('identifier') === identifier) {
        result = tilesLayer;
      }
    });
    return result;
  }

  private getOverlayLayer() {
    let overlay_layer;
    this.map.getLayers().forEach(function (current_layer) {
      if (current_layer.get('level') === 'overlay') {
        overlay_layer = current_layer;
      }
    });
    return overlay_layer;
  }

  private renderMap(node, props, center, markers) {
    window.setTimeout(() => {
      const geometries = this.createGeometries(markers);
      const layers = _.mapValues(geometries, this.createLayer);
      var basemapLayers = [];
      var overlayLayers = [];

      //TODO: get all basemap Layers (from an attribute on the <tileslayer> component) and give them an ID
      //TODO: get all overlay layers and give them an ID
      this.tilesLayers.forEach(function (tileslayer) {
        if (tileslayer.get('level') === 'basemap') {
          basemapLayers.push(tileslayer);
        } else if (tileslayer.get('level') === 'overlay') {
          overlayLayers.push(tileslayer);
        }
      });

      //Fallback to default provider if no tiles-layers are specified in template
      if (!this.tilesLayers.length) {
        this.tilesLayers = [
          new TileLayer({
            source: new OSM(),
          }),
        ];
      } else {
        basemapLayers = [basemapLayers[0]];
      }
      const radius = 120;

      const map = new Map({
        controls: controlDefaults({
          attributionOptions: {
            collapsible: false,
          },
        }),
        //interactions: interaction.defaults({ mouseWheelZoom: false }),
        interactions: interactionDefaults({}),
        layers: [..._.values(basemapLayers), ..._.values(layers)],
        target: node,
        view: new View({
          center: this.transformToMercator(parseFloat(center.lng), parseFloat(center.lat)),
          zoom: 3,
          extent: props.mapOptions.extent,
        }),
      });

      this.layers = layers;
      this.map = map;

      /* Layer Spy functionality */

      node.addEventListener('mousemove', (event) => {
        this.mousePosition = map.getEventPixel(event);
        this.map.render();
      });

      node.addEventListener('mouseout', () => {
        this.mousePosition = null;
        this.map.render();
      });

      // asynch execute query and add markers
      this.addMarkersFromQuery(this.props, this.context);

      this.initializeMarkerPopup(map);
      map.getView().fit(props.mapOptions.extent);

      window.addEventListener('resize', () => {
        map.updateSize();
      });

      this.map.on('moveend', () => {
        // Pass the bounding box as data in the event called when bounding box is changed
        const coordinates = this.map.getView().calculateExtent(this.map.getSize());
        this.BoundingBoxChanged({
          southWestLat: {
            value: String(coordinates[0]),
          },
          southWestLon: {
            value: String(coordinates[1]),
          },
          northEstLat: {
            value: String(coordinates[2]),
          },
          northEstLon: {
            value: String(coordinates[3]),
          },
        });
      });

      const zoom = this.props.fixZoomLevel ? this.props.fixZoomLevel : 12;
      const view = this.map.getView();

      view.setCenter(this.props.fixCenter);
      view.setZoom(zoom);
    }, 1000);
  }

  public BoundingBoxChanged(boundingBox: Dictionary<QueryConstantParameter>) {
    trigger({ eventType: SemanticMapBoundingBoxChanged, source: this.props.id, data: boundingBox });
  }

  addMarkersFromQuery = (props: SemanticMapProps, context: ComponentContext) => {
    const { query } = props;

    if (query) {
      const stream = SparqlClient.select(query, { context: context.semanticContext });

      stream.onValue((res) => {
        const result = _.map(res.results.bindings, (v) => _.mapValues(v, (x) => x) as any);

        if (SparqlUtil.isSelectResultEmpty(res)) {
          this.setState({
            noResults: true,
            errorMessage: maybe.Nothing<string>(),
            isLoading: false,
          });
        } else {
          this.setState({
            noResults: false,
            errorMessage: maybe.Nothing<string>(),
            isLoading: false,
          });

          const geometries = this.createGeometries(result);
          this.updateLayers(geometries);
        }

        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id, data: { results: result } });
        }
      });

      stream.onError((error) =>
        this.setState({
          errorMessage: maybe.Just(error),
          isLoading: false,
        })
      );

      if (this.props.id) {
        trigger({
          eventType: BuiltInEvents.ComponentLoading,
          source: this.props.id,
          data: stream,
        });
      }
    }
  };

  private updateLayers = (geometries: { [type: string]: Feature[] }) => {
    _.forEach(geometries, (features, type) => {
      let layer = this.layers[type];

      if (layer) {
        let source = layer.getSource();
        if (source instanceof Cluster) {
          source = source.getSource();
        }
        source.clear();
        source.addFeatures(features);
      } else {
        layer = this.createLayer(features, type);
        this.layers[type] = layer;
        this.map.addLayer(layer);
      }
    });
  };

  private calculateExtent() {
    const viewExtent = createEmpty();

    _.forEach(this.layers, (layer) => {
      let source = layer.getSource();
      if (source instanceof Cluster) {
        source = source.getSource();
      }
      extend(viewExtent, source.getExtent());
    });

    return viewExtent;
  }

  private createMap = () => {
    this.renderMap(
      findDOMNode(this.refs[MAP_REF]),
      this.props,
      {
        lng: parseFloat('0'),
        lat: parseFloat('0'),
      },
      []
    );
  };

  private getMarkerFromMapAsElements = () => {
    if (!_.isUndefined(this.layers)) {
      _.forEach(this.layers, (layer) => {
        const elementDiv = this.refs['ref-map-widget-elements'];
        let source = layer.getSource();
        if (source instanceof Cluster) {
          source = source.getSource();
        }
        const features = source.getFeaturesInExtent(source.getExtent());
        const d = findDOMNode(elementDiv);
        const template = this.state.tupleTemplate;

        _.forEach(features, (f) => {
          const html = SemanticMap.createPopupContent(f.getProperties(), template);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          d.appendChild(doc.body.firstChild);
        });
      });
    }
  };

  private compileTemplatesInConfig = (config: SemanticMapConfig): void => {
    const defaultTemplate = `
        <semantic-link class="map-resource-link" data-uri="{{link.value}}">
        </semantic-link>
        <p>{{description.value}}</p>
    `;

    const template = maybe
      .fromNullable(this.handleDeprecatedLayout(config))
      .chain((tupleTemplate) => maybe.fromNullable(tupleTemplate))
      .getOrElse(defaultTemplate);

    this.appliedTemplateScope
      .compile(template)
      .then((tupleTemplate) => {
        this.setState({
          tupleTemplate: maybe.Just(tupleTemplate),
          errorMessage: maybe.Nothing<string>(),
        });
      })
      .catch((error) => {
        this.setState({ errorMessage: maybe.Just(error) });
      });
  };

  private handleDeprecatedLayout(props: SemanticMapConfig): string {
    if (_.has(props, 'layout')) {
      console.warn('layout property in semantic-map is deprecated, please use flat properties instead');
      return props['layout']['tupleTemplate'];
    } else {
      return props.tupleTemplate;
    }
  }
}

function getMarkerStyle() {
  const styleCache = {};

  const clusterStyle = (size, radius, color) =>
    new Style({
      image: new Circle({
        radius,
        fill: new Fill({ color }),
      }),
      text: new Text({
        text: size.toString(),
        fill: new Fill({ color: '#fff' }),
      }),
    });

  return function (feature: Feature) {
    const features = feature.get('features');
    const size = features.length;

    const { value: color } = features[0].get('color') || { value: '#000' };

    let style = styleCache[`${size}${color}`];
    if (!style) {
      if (size === 1) {
        const geometry = feature.getGeometry();
        style = getFeatureStyle(geometry, color);
      } else {
        const radius = Math.max(8, Math.min(size * 0.75, 20));
        style = clusterStyle(size, radius, color);
      }

      styleCache[size] = style;
    }
    return [style];
  };
}

function getFeatureStyle(geometry: Geometry, color: string | undefined) {
  if (geometry instanceof Point || geometry instanceof MultiPoint) {
    return new Style({
      geometry,
      text: new Text({
        text: '\uf041',
        font: 'normal 22px FontAwesome',
        textBaseline: 'bottom',
        fill: new Fill({ color: color || '#000' }),
      }),
    });
  } else if (geometry instanceof GeometryCollection) {
    return geometry.getGeometries().map((geom) => getFeatureStyle(geom, color));
  }
  return new Style({
    geometry,
    fill: new Fill({ color: color || 'rgba(255, 255, 255, 0.5)' }),
    stroke: new Stroke({
      color: color || 'rgba(202, 105, 36, .3)',
      width: 1.25,
    }),
  });
}

function getPopupCoordinate(geometry: Geometry, coordinate: [number, number]) {
  if (geometry instanceof Point) {
    return geometry.getCoordinates();
  }
  if (geometry instanceof Polygon) {
    return geometry.getInteriorPoint().getCoordinates();
  } else if (geometry instanceof MultiPolygon) {
    const polygons = geometry.getPolygons();
    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i];
      if (polygon.intersectsCoordinate(coordinate)) {
        return getPopupCoordinate(polygon, coordinate);
      }
    }
  } else if (geometry instanceof GeometryCollection) {
    const geometries = geometry.getGeometries();
    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];
      if (geometry.intersectsCoordinate(coordinate)) {
        return getPopupCoordinate(geometry, coordinate);
      }
    }
  }
  return geometry.getClosestPoint(coordinate);
}

export default SemanticMap;
