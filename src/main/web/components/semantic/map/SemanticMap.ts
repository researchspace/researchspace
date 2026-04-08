/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
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
import {transform} from 'ol/proj';
import {defaults as controlDefaults} from 'ol/control';
import {defaults as interactionDefaults} from 'ol/interaction';
import {createEmpty, getCenter} from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';

import { BuiltInEvents, trigger } from 'platform/api/events';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentContext } from 'platform/api/components';
import { LayoutChanged } from 'platform/components/dashboard/DashboardEvents';

import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import * as Popup from 'ol-popup';

import 'ol/ol.css';
import 'ol-popup/src/ol-popup.css';

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
   * <semantic-link iri='http://help.researchspace.org/resource/TemplatingSystem' target="_blank">Template</semantic-link> for marker popup. By default shows `<semantic-link>` to the resource with a short textual description
   */
  tupleTemplate?: string;

  /**
   * <semantic-link iri='http://help.researchspace.org/resource/TemplatingSystem' target="_blank">Template</semantic-link> which is applied when query returns no results
   */
  noResultTemplate?: string;

  /**
   * Optional numeric zoom between 0-18 (max zoom level may vary depending on the resolution)
   * to fix the inital map zoom.
   * If no fixed zoom level is provided, the zoom will be calculated on the max bounding box
   * of available markers.
   */
  fixZoomLevel?: number;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

export type SemanticMapProps = SemanticMapConfig & Props<any>;

interface MapState {
  tupleTemplate?: Data.Maybe<HandlebarsTemplateDelegate>;
  errorMessage: Data.Maybe<string>;
  noResults?: boolean;
  isLoading?: boolean;
}

const MAP_REF = 'researchspace-map-widget';

export class SemanticMap extends Component<SemanticMapProps, MapState> {
  // A single master source holds all features (Points, Polygons, etc.)
  private masterSource: VectorSource;
  private map: Map;

  constructor(props: SemanticMapProps, context: ComponentContext) {
    super(props, context);
    this.state = {
      tupleTemplate: maybe.Nothing<HandlebarsTemplateDelegate>(),
      noResults: false,
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
    };
  }

  private static createPopupContent(props, tupleTemplate: Data.Maybe<HandlebarsTemplateDelegate>) {
    let defaultContent = '';

    if (_.isUndefined(props.link) === false) {
      defaultContent += `
          <semantic-link iri="${props.link}"></semantic-link>
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
        })
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

  private transformToMercator(lng: number, lat: number): Coordinate {
    return transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
  }

  private readWKT(wkt: string) {
    const format = new WKT();
    return format.readGeometry(wkt, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
  }

  private createFeatures = (markersData: any[]): Feature[] => {
    return markersData.map((marker) => {
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
        return null;
      } else {
        f.setGeometry(geo);
        return f;
      }
    }).filter(Boolean); // Filter out any nulls from failed features
  };

  private renderMap(node, props, center, markers) {
    window.setTimeout(() => {
      const initialFeatures = this.createFeatures(markers);
      // A single source for ALL features, regardless of geometry type.
      this.masterSource = new VectorSource({ features: initialFeatures });

      // A single cluster source wraps the master source.
      const clusterSource = new Cluster({
        source: this.masterSource,
        distance: 40,
        // The geometryFunction tells the clusterer how to find a 'point'
        // for any given feature, enabling points and polygons to cluster together.
        geometryFunction: (feature: Feature) => {
          const geometry = feature.getGeometry();
          if (geometry instanceof Point) {
            return geometry; // For points, use the point itself.
          }
          if (geometry instanceof MultiPoint) {
            return geometry.getPoint(0);
          }
          if (geometry instanceof Polygon) {
            return geometry.getInteriorPoint(); // For polygons, use a point inside.
          }
          if (geometry instanceof MultiPolygon) {
            return geometry.getInteriorPoints().getPoint(0);
          }
          if (geometry instanceof GeometryCollection) {
            // For a collection, get the center of its bounding box.
            return new Point(getCenter(geometry.getExtent()));
          }
          return null;
        },
      });

      // A single AnimatedCluster layer handles all rendering logic.
      // Its style function is smart enough to draw clusters, points, or polygons.
      const clusterLayer = new AnimatedCluster({
        source: clusterSource,
        style: getMarkerStyle(),
      });

      const map = new Map({
        controls: controlDefaults({
          attributionOptions: {
            collapsible: false,
          },
        }),
        interactions: interactionDefaults({}),
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          clusterLayer, // We only need this one layer for all features.
        ],
        target: node,
        view: new View({
          center: this.transformToMercator(parseFloat(center.lng), parseFloat(center.lat)),
          zoom: 1,
        }),
      });

      this.map = map;

      // asynch execute query and add markers
      this.addMarkersFromQuery(this.props, this.context);

      this.initializeMarkerPopup(map);

      window.addEventListener('resize', () => {
        map.updateSize();
      });

      window.addEventListener(LayoutChanged, () => { map.updateSize() });
    }, 1000);
  }

  addMarkersFromQuery = (props: SemanticMapProps, context: ComponentContext) => {
    const { query, fixZoomLevel } = props;

    if (query) {
      const stream = SparqlClient.select(query, { context: context.semanticContext });

      stream.onValue((res) => {
        const m = _.map(res.results.bindings, (v) => <any>_.mapValues(v, (x) => x));
        if (SparqlUtil.isSelectResultEmpty(res)) {
          this.setState({
            noResults: true,
            errorMessage: maybe.Nothing<string>(),
            isLoading: false,
          });
          this.updateFeatures([]);
        } else {
          this.setState({
            noResults: false,
            errorMessage: maybe.Nothing<string>(),
            isLoading: false,
          });

          const allFeatures = this.createFeatures(m);
          this.updateFeatures(allFeatures);

          const view = this.map.getView();
          const extent = this.calculateExtent();
          if (extent && extent[0] !== Infinity) {
            view.fit(extent, { maxZoom: 10, padding: [50, 50, 50, 50] });
          }

          if (fixZoomLevel) {
            view.setZoom(fixZoomLevel);
          }
        }
      });

      stream.onError((error) =>
        this.setState({
          errorMessage: maybe.Just(error),
          isLoading: false,
        })
      );

      stream.onEnd(() => {
        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
        }
      });

      if (this.props.id) {
        trigger({
          eventType: BuiltInEvents.ComponentLoading,
          source: this.props.id,
          data: stream,
        });
      }
    }
  };

  private updateFeatures = (features: Feature[]) => {
    if (this.masterSource) {
      this.masterSource.clear();
      this.masterSource.addFeatures(features);
    }
  };

  private calculateExtent = () => {
    return this.masterSource ? this.masterSource.getExtent() : createEmpty();
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
    if (this.masterSource) {
      const elementDiv = this.refs['ref-map-widget-elements'];
      const features = this.masterSource.getFeatures();
      const d = findDOMNode(elementDiv);
      const template = this.state.tupleTemplate;

      _.forEach(features, (f) => {
        const html = SemanticMap.createPopupContent(f.getProperties(), template);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (doc.body.firstChild) {
          d.appendChild(doc.body.firstChild);
        }
      });
    }
  };

  private compileTemplatesInConfig = (config: SemanticMapConfig): void => {
    const defaultTemplate = `
        <semantic-link class="map-resource-link" iri="{{link.value}}">
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

/**
 * A threshold in screen pixels. If a polygon's largest dimension is smaller
 * than this value, it will be rendered as a point marker for better visibility
 * and clickability.
 */
const PIXEL_THRESHOLD = 20;

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

  return function (feature: Feature, resolution: number) {
    const features = feature.get('features');
    const size = features.length;

    if (size > 1) {
      // It's a true cluster: draw a circle.
      const { value: color } = features[0].get('color') || { value: '#000' };
      const cacheKey = `cluster_${size}_${color}`;
      let style = styleCache[cacheKey];
      if (!style) {
        const radius = Math.max(8, Math.min(size * 0.75, 20));
        style = clusterStyle(size, radius, color);
        styleCache[cacheKey] = style;
      }
      return style;
    } else {
      // It's a single feature. The style now depends on resolution, so we don't cache it.
      const originalFeature = features[0];
      const geometry = originalFeature.getGeometry();
      const color = originalFeature.get('color');
      return getFeatureStyle(geometry, color ? color.value : undefined, resolution);
    }
  };
}


/**
 * This function provides the specific style for an individual geometry.
 * The critical part is setting geometry: geometry on the polygon style.
 * This forces the style to render the original polygon shape, overriding
 * the cluster's default point geometry for single-item clusters.
 */
function getFeatureStyle(geometry: Geometry, color: string | undefined, resolution: number): Style | Style[] {
  if (geometry instanceof Point || geometry instanceof MultiPoint) {
    return new Style({
      text: new Text({
        text: '\uf041',
        font: 'normal 22px FontAwesome',
        textBaseline: 'bottom',
        fill: new Fill({ color: color || '#000' }),
      }),
    });
  } else if (geometry instanceof GeometryCollection) {
    return _.flatten(geometry.getGeometries().map((geom) => getFeatureStyle(geom, color, resolution)));
  }

  // Handle both Polygon and MultiPolygon.
  const extent = geometry.getExtent();
  const widthInPixels = (extent[2] - extent[0]) / resolution;
  const heightInPixels = (extent[3] - extent[1]) / resolution;

  // Check if the feature is too small to be rendered as a polygon.
  if (Math.max(widthInPixels, heightInPixels) < PIXEL_THRESHOLD) {
    // High resolution (zoomed out): Render a point-style marker for the polygon.
    return new Style({
      text: new Text({
        text: '\uf041',
        font: 'normal 22px FontAwesome',
        textBaseline: 'bottom',
        fill: new Fill({ color: color || '#3399CC' }),
      }),
    });
  } else {
    // Low resolution (zoomed in): Render the actual polygon shape.
    return new Style({
      geometry: geometry, // CRITICAL: This forces the polygon's shape to be rendered.
      fill: new Fill({ color: color || 'rgba(255, 255, 255, 0.5)' }),
      stroke: new Stroke({
        color: color || '#3399CC',
        width: 1.25,
      }),
    });
  }
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
    return geometry.getInteriorPoints().getCoordinates()[0];
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
