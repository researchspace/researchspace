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

import { DOM as D, Props, createElement } from 'react';
import { findDOMNode } from 'react-dom';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as ol from 'openlayers';

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component } from 'platform/api/components';

import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';


import 'openlayers/css/ol.css';
import './lib/ol3-popup.css';
import './lib/ol3-popup.js';

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
   */
  query: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> for marker popup. By default shows `<semantic-link>` to the resource with a short textual description
   * **The template MUST have a single HTML root element.**
   */
  tupleTemplate?: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results
   * **The template MUST have a single HTML root element.**
   */
  noResultTemplate?: string;
}

export type SemanticMapProps = SemanticMapConfig & Props<any>;

interface MapState {
  tupleTemplate?: Data.Maybe<HandlebarsTemplateDelegate>;
  errorMessage: Data.Maybe<string>;
  noResults?: boolean;
  isLoading?: boolean;
}

const MAP_REF = 'metaphacts-map-widget';

export class SemanticMap extends Component<SemanticMapProps, MapState> {
  private markersLayer: ol.layer.Vector;
  private map: ol.Map;

  constructor(props: SemanticMapProps, context: any) {
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
          <semantic-link uri="${props.link}"></semantic-link>
          <p>${props.description}</p>
      `;
    }

    return tupleTemplate.map(template => template(props)).getOrElse(defaultContent);
  }

  public componentDidMount() {
    this.createMap();
  }

  public componentWillReceiveProps(props) {
    this.addMarkersFromQuery();
  }

  public componentWillMount() {
    this.compileTemplatesInConfig(this.props);
  }

  public render() {
    if (!this.state.errorMessage.isNothing) {
      return D.div({ className: 'metaphacts-map-widget' },
        createElement(ErrorNotification, { errorMessage: this.state.errorMessage.get() })
      );
    } else if (this.state.tupleTemplate === undefined) {
      return createElement(Spinner);
    } else if (this.state.noResults) {
      return createElement(TemplateItem, {template: {source: this.props.noResultTemplate}});
    }
    return D.div({},
      D.div({
          ref: MAP_REF,
          className: 'metaphacts-map-widget',
          style: {
            height: '100%',
            width: '100%',
            visibility: this.state.noResults ? 'hidden' : 'visible',
          },
        },
        D.div({ // this div is for testing purpose only
          className: 'metaphacts-map-widget-elements',
          ref: 'ref-map-widget-elements',
          onClick: this.getMarkerFromMapAsElements.bind(this),
          style: {display: 'none'},
        })
      ),
      this.state.isLoading ? createElement(Spinner) : null
    );
  }

  private initializeMarkerPopup(map) {

    // Popup is actually only an extension and propagates the options to overlay
    const overlayOptions = {
      // Stop even propagation to the map viewport. If not set explitilty,
      // is set to true by default. Consequently the overlay will catch all events
      // and, for example, clicking on a semantic-link within the popup does not have any effect
      stopEvent: false,
    };
    const popup = new ol.Overlay.Popup(overlayOptions);
    map.addOverlay(popup);

    map.on('click', (evt) => {
      // Hide existing popup and reset it's offset
      popup.hide();
      popup.setOffset([0, 0]);

      // Attempt to find a feature in one of the visible vector layers
      const feature = map.forEachFeatureAtPixel(evt.pixel, function(f, layer) {
        return f;
      });

      if (feature) {
        const coord = feature.getGeometry().getCoordinates();
        const props = feature.getProperties();

        const popupContent = SemanticMap.createPopupContent(props, this.state.tupleTemplate);

        // info += "<p>" + props.locationtext + "</p>";
        // Offset the popup so it points at the middle of the marker not the tip
        popup.setOffset([0, -22]);
        popup.show(coord, `<mp-template-item>${popupContent}</mp-template-item>`);
      }
    });
  }

  private transformToMercator(lng: number, lat: number): number[] {
    return ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
  }

  private readWKT(wkt: string) {
    const format = new ol.format.WKT();
    return format.readGeometry(wkt, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
  }

  private createGeometries = (markersData: any[]) => {
    return _.map(markersData, marker => {
      const f = new ol.Feature(marker);
      let geo = undefined;
      if (!_.isUndefined(marker['lat']) && !_.isUndefined(marker['lng'])) {
        geo = new ol.geom.Point(
          this.transformToMercator(
            parseFloat(marker['lng'].value),
            parseFloat(marker['lat'].value)
          )
        );
      } else if (!_.isUndefined(marker['wkt']) && _.isUndefined(geo)) {
        geo = this.readWKT(marker['wkt'].value);
      }

      if (_.isUndefined(geo)) {
        const msg = `Result of SPARQL Select query does have neither
                    lat,lng nor wkt projection variable. `;
        this.setState({ errorMessage: maybe.Just(msg) });
      } else {
        f.setGeometry(geo);
        return f;
      }

    }
    );
  }

  private renderMap(node, props, center, markers) {
    window.setTimeout(() => {
      const markersSource =
        new ol.source.Vector({
          features: this.createGeometries(markers),
        });

      const markerStyle =
        new ol.style.Style({
          text: new ol.style.Text({
            text: '\uf041',
            font: 'normal 22px FontAwesome',
            textBaseline: 'Bottom',
            fill: new ol.style.Fill({
              color: 'black',
            }),
          }),
        });


      const markersLayer =
        new ol.layer.Vector({
          source: markersSource,
          style: markerStyle,
        });

      const map = new ol.Map({
        controls: ol.control.defaults({
          attributionOptions: {
            collapsible: false,
          },
        }),
        interactions: ol.interaction.defaults({ mouseWheelZoom: false }),
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM(),
          }),
          markersLayer,
        ],
        target: node,
        view: new ol.View({
          center: this.transformToMercator(parseFloat(center.lng), parseFloat(center.lat)),
          zoom: 1,
        }),
      });

      // asynch execute query and add markers
      this.addMarkersFromQuery();

      this.markersLayer = markersLayer;
      this.map = map;

      this.initializeMarkerPopup(map);
      // map.getView().fit(markersSource.getExtent(), map.getSize());

      window.addEventListener('resize', () => {
        map.updateSize();
      });
    }, 1000);
  }

  private addMarkersFromQuery = () => {

    if (this.props.query) {
      const stream = SparqlClient.select(this.props.query);

      stream.onValue(
        res => {
          const m = _.map(res.results.bindings, v =>
            <any>_.mapValues(v, x => x)
          );
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
            this.markersLayer.getSource().clear();
            this.markersLayer.getSource().addFeatures(this.createGeometries(m));
            const view = this.map.getView();
            view.fit(this.markersLayer.getSource().getExtent(), this.map.getSize());
            // TODO this is just a workaround since fitExtent does not consider
            // maxZoom for the time being
            if (view.getZoom() > 15) {
              view.setZoom(10);
            }
          }
        }
      );

      stream.onError(
        error => this.setState({
          errorMessage: maybe.Just(error),
          isLoading: false,
        })
      );

    }
  }

  private createMap = () => {
    this.renderMap(findDOMNode(this.refs[MAP_REF]), this.props, {
      lng: parseFloat('0'),
      lat: parseFloat('0'),
    }, []);
  }

  private getMarkerFromMapAsElements = () => {
    if (!_.isUndefined(this.markersLayer)) {
      const elementDiv = this.refs['ref-map-widget-elements'];
      const source = this.markersLayer.getSource();
      const features = source.getFeaturesInExtent(source.getExtent());
      const d = findDOMNode(elementDiv);
      const template = this.state.tupleTemplate;

      _.forEach(features, (f) => {
        const html = SemanticMap.createPopupContent(f.getProperties(), template);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        d.appendChild(doc.body.firstChild);
      });

    }
  }

  private compileTemplatesInConfig = (config: SemanticMapConfig): void => {
    const defaultTemplate = `
        <semantic-link class="map-resource-link" data-uri="{{link.value}}">
        </semantic-link>
        <p>{{description.value}}</p>
    `;

    const template = maybe.fromNullable(
      this.handleDeprecatedLayout(config)
    ).chain(
      tupleTemplate => maybe.fromNullable(tupleTemplate)
    ).getOrElse(defaultTemplate);

    this.appliedTemplateScope.compile(template).then(tupleTemplate => {
      this.setState({
        tupleTemplate: maybe.Just(tupleTemplate),
        errorMessage: maybe.Nothing<string>(),
      });
    }).catch(error => {
      this.setState({errorMessage: maybe.Just(error)});
    });
  }

  private handleDeprecatedLayout(props: SemanticMapConfig): string {
    if (_.has(props, 'layout')) {
      console.warn(
        'layout property in semantic-map is deprecated, please use flat properties instead'
      );
      return props['layout']['tupleTemplate'];
    } else {
      return props.tupleTemplate;
    }
  }

}

export default SemanticMap;
