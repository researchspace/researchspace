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
import { Control } from 'ol/control';
import MultiPoint from 'ol/geom/MultiPoint';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import WKT from 'ol/format/WKT';
import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import { getLength } from 'ol/sphere';
import { Draw, Modify, Snap } from 'ol/interaction';
import { transform } from 'ol/proj';
import { defaults as controlDefaults } from 'ol/control';
import { Interaction } from 'ol/interaction';
import { defaults as interactionDefaults } from 'ol/interaction';
import { Extent } from 'ol/extent';
import { extend, buffer, getWidth, containsExtent } from 'ol/extent';
import { createEmpty } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import OSM from 'ol/source/OSM';
import { getRenderPixel } from 'ol/render';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import XYZ from 'ol/source/XYZ';

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
  SemanticMapSendSelectedFeature,
  SemanticMapRequestControlsRegistration,
  SemanticMapClearSelectedFeature,
} from './SemanticMapEvents';
import { Dictionary } from 'platform/api/sparql/SparqlClient';
import QueryConstantParameter from '../search/web-components/QueryConstant';
import { Cancellation } from 'platform/api/async';
import { listen, Event } from 'platform/api/events';
import { WindowScroller } from 'react-virtualized';
import { zoomByDelta } from 'ol/interaction/Interaction';
import {
  SemanticMapControlsOverlayOpacity,
  SemanticMapControlsOverlaySwipe,
  SemanticMapControlsOverlayVisualization,
  SemanticMapControlsFeatureColor,
  SemanticMapToggleEditingMode,
  SemanticMapSendMapLayers,
  SemanticMapControlsSyncFromMap,
  SemanticMapControlsSendMapLayersToMap,
  SemanticMapControlsSendMaskIndexToMap,
  SemanticMapControlsSendFeaturesLabelToMap,
  SemanticMapControlsSendFeaturesColorTaxonomyToMap,
  SemanticMapControlsSendGroupColorsAssociationsToMap,
  SemanticMapControlsSendToggle3d,
  SemanticMapControlsSendYear,
  SemanticMapControlsRegister,
  SemanticMapControlsUnregister,
  SemanticMapControlsSendVectorLevels,
  SemanticMapControlsToggleMeasurement,
} from './SemanticMapControlsEvents';
import { none } from 'ol/centerconstraint';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import { options } from 'superagent';
import GeometryType from 'ol/geom/GeometryType';
import { __values } from 'tslib';
import { year } from 'platform/components/search/date/SimpleDateInput.scss';

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

export interface SemanticMapAdvancedConfig {
  /**
   * SPARQL Select query. Query should project `lat` and `lng`, with the WKT point.
   * Or `wkt` letiable with WKT point literal.
   *
   * Also to use default marker template one need to project `link` with IRI of
   * the corresponding resource and `description` with some short textual
   * marker description text.
   *
   * One can customize color of the marker/polygon using `color` projection letiable
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
   * Optional numeric zoom between 0-18 (max zoom level may lety depending on the resolution)
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
   * Optional JSON object containing letious user provided options
   */
  providerOptions?: ProviderOptions;

  /**
   * Optional array of strings containing IDs of SemanticMapControls component(s) the map should sync with.
   */
  targetControls?: Array<string>;

  /**
   * Optional array of strings containing IDs of targets for events of the features selection functionality (map as input)
   */
  featureSelectionTargets?: Array<string>;

  /**
   * False by default. Set true to activate the filter by parameter "year" to use it with controls
   */
  yearFiltering?: boolean;
  /**
   *  Lists the possible levels of features (geometries) in the map (Eg. terrain, buildings, waterways, etc.)
   */
  vectorLevels?: [];

  /**
   * Optional style configuration for selected features.
   * Allows customization of how selected features appear on the map.
   */
  selectedFeatureStyle?: {
    color?: string;           // Fill color (e.g., 'rgba(255, 165, 0, 0.6)')
    borderColor?: string;     // Stroke color (e.g., '#FFFFFF')
    borderWidth?: number;     // Stroke width (e.g., 3)
    pointRadius?: number;     // Circle radius for points (e.g., 10)
    pointFontSize?: number;   // Font size for point markers (e.g., 26)
    labelFontSize?: number;   // Font size for labels (e.g., 14)
    labelColor?: string;      // Text color (e.g., '#000')
    labelStrokeColor?: string; // Text outline color (e.g., '#fff')
    labelStrokeWidth?: number; // Text outline width (e.g., 3)
  };
}

export type SemanticMapAdvancedProps = SemanticMapAdvancedConfig & Props<any>;

interface MapState {
  tupleTemplate?: Data.Maybe<HandlebarsTemplateDelegate>;
  errorMessage: Data.Maybe<string>;
  noResults?: boolean;
  isLoading?: boolean;
  baseMapLoaded?: boolean;
  overlayVisualization?: string;
  featureColor?: string;
  mapLayers?: Array<any>;
  maskIndex?: number;
  featuresLabel: string;
  featuresColorTaxonomy: string;
  groupColorAssociations: {};
  year: string;
  yearFiltering: boolean;
  registeredControls: Array<any>;
  selectedFeature: Feature | null;
  vectorLevels: {};
}

const MAP_REF = 'researchspace-map-widget';

export class SemanticMapAdvanced extends Component<SemanticMapAdvancedProps, MapState> {
  private layers: { [id: string]: VectorLayer<any> };
  private map: Map;
  private cancelation = new Cancellation();
  private mousePosition = null;
  private swipeValue: number;
  registrationIntervalId: number | null = null;

  private source: VectorSource;
  private vector: VectorLayer<any>;
  private modify: Modify;

  private draw: Interaction;
  private snap: Interaction;
  private defaultFeaturesColor = 'rgba(200,80,20,0.3)';

  // Performance optimization properties
  private styleCache: { [key: string]: Style } = {};
  private visibleFeatures: Set<string> = new Set();
  private debouncedUpdateVisibleFeatures: any;

  constructor(props: SemanticMapAdvancedProps, context: ComponentContext) {
    super(props, context);

    // Initialize debounced update function
    this.debouncedUpdateVisibleFeatures = _.debounce(() => {
      this.updateVisibleFeatures();
    }, 100);
    this.state = {
      tupleTemplate: maybe.Nothing<HandlebarsTemplateDelegate>(),
      noResults: false,
      isLoading: true,
      baseMapLoaded: false,
      errorMessage: maybe.Nothing<string>(),
      overlayVisualization: 'normal',
      featureColor: 'rgba(180,100,20,0.2)',
      mapLayers: [new TileLayer({ source: new OSM() })],
      maskIndex: 1,
      featuresLabel: '',
      featuresColorTaxonomy: '',
      groupColorAssociations: {},
      registeredControls: [],
      selectedFeature: null,
      year: '',
      yearFiltering: this.props.yearFiltering ? this.props.yearFiltering : false,
      vectorLevels: this.props.vectorLevels
        ? this.props.vectorLevels.reduce((acc, val, id) => ({ ...acc, [val]: { id, visible: true } }), {})
        : {},
    };

    // this.initEditingModeInteractions();

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
          eventType: SemanticMapControlsOverlaySwipe,
          target: this.props.id,
        })
      )
      .onValue(this.setOverlaySwipe);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsOverlayVisualization,
          target: this.props.id,
        })
      )
      .onValue(this.setOverlayVisualizationFromEvent);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsFeatureColor,
          target: this.props.id,
        })
      )
      .onValue(this.setFeatureColor);

    // this.cancelation
    //   .map(
    //     listen({
    //       eventType: SemanticMapToggleEditingMode,
    //     })
    //   )
    //   .onValue(this.handleEditingMode);

    // this.cancelation
    //   .map(
    //     listen({
    //       eventType: SemanticMapControlsSyncFromMap,
    //     })
    //   )
    //   .onValue(this.syncControlsFromEvent);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendMapLayersToMap,
        })
      )
      .onValue(this.updateMapLayersFromControls);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendMaskIndexToMap,
        })
      )
      .onValue(this.setMaskIndex);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendFeaturesLabelToMap,
        })
      )
      .onValue(this.setFeaturesLabel);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendFeaturesColorTaxonomyToMap,
        })
      )
      .onValue(this.setFeaturesColorTaxonomy);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendGroupColorsAssociationsToMap,
        })
      )
      .onValue(this.triggerUpdateFeatureColorsByGroups);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendToggle3d,
        })
      )
      .onValue(this.toggle3d);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendYear,
        })
      )
      .onValue(this.setYear);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsSendVectorLevels,
        })
      )
      .onValue(this.setVectorLevels);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsRegister,
        })
      )
      .onValue(this.registerControlsFromEvent);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsUnregister,
        })
      )
      .onValue(this.unregisterControlsFromEvent);
      
    // Listen for the clear selected feature event
    this.cancelation
      .map(
        listen({
          eventType: SemanticMapClearSelectedFeature,
          target: this.props.id,
        })
      )
      .onValue(this.handleClearSelectedFeature);
      
    // Listen for measurement tool toggle event
    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsToggleMeasurement,
          target: this.props.id,
        })
      )
      .onValue(this.handleMeasurementToggle);
  }

  /** REACT COMPONENT FUNCTIONS **/

  public componentDidMount() {
    requestAnimationFrame(() => {
      this.createMap();
    });
    this.setState({
      mapLayers: this.setTilesLayersFromTemplate(),
    });
  }

  public componentWillUnmount() {
    if (this.registrationIntervalId !== null) {
      clearInterval(this.registrationIntervalId);
    }
  }

  public componentWillReceiveProps(props: SemanticMapAdvancedProps, context: ComponentContext) {
    if (props.query !== this.props.query) {
      this.addMarkersFromQuery(props, context);
    }
  }

  public componentWillMount() {
    this.compileTemplatesInConfig(this.props);
  }

  public componentDidUpdate(prevProps, prevState) {
    if (this.state.selectedFeature !== prevState.selectedFeature) {
      console.log('Selected feature CHANGED. sending new');
      this.triggerSendSelectedFeature();
    } else {
      //console.log("Groupcolors NOT changed.")
    }
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

    const isMapLoading = this.state.isLoading || !this.state.baseMapLoaded;

    return D.div(
      { style: { height: '100%', width: '100%', position: 'relative' } },
      // Visualization mode notification
      this.state.overlayVisualization !== 'normal' && D.div(
        {
          style: {
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            zIndex: 1000,
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            pointerEvents: 'none',
          }
        },
      `${this.state.overlayVisualization.charAt(0).toUpperCase() + this.state.overlayVisualization.slice(1).toLowerCase()} mode active. Press ESC to exit${this.state.overlayVisualization === 'spyglass' ? '. Right click (or Ctrl+click) to change radius.' : ''}`
      ),
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
      isMapLoading ? this.renderLoadingOverlay() : null
    );
  }

  private renderLoadingOverlay() {
    return D.div(
      {
        className: 'semantic-map-loading-overlay',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          borderRadius: '4px',
        },
      },
      D.div(
        {
          className: 'semantic-map-loading-spinner',
          style: {
            marginBottom: '10px',
          },
        },
        createElement(Spinner)
      ),
      D.div(
        {
          className: 'semantic-map-loading-text',
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
          },
        },
      )
    );
  }

  private initializeMarkerPopup(map) {
    const popup = new Popup();
    map.addOverlay(popup);

    // Add the click handler to the map
    map.on('click', (evt) => {
      // Skip feature selection if measurement tool, spyglass or swipe mode is active
      if (this.state.overlayVisualization === 'measure' || 
          this.state.overlayVisualization === 'spyglass' || 
          this.state.overlayVisualization === 'swipe') {
        return; // Early return to prevent feature selection during special visualization modes
      }
      
      // Hide existing popup and reset it's offset
      popup.hide();
      popup.setOffset([0, 0]);

      // Attempt to find a feature in one of the visible vector layers
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (f, layer) {
        return f;
      });

      if (feature) {
        console.log('Clicked feature.');
        console.log(feature);
        // Store the entire feature object
        this.setState({ selectedFeature: feature }, () => {
          console.log(this.state.selectedFeature);
          this.triggerSendSelectedFeature();

          // Zoom to the selected feature
          this.zoomToFeature(feature);

          // Apply the highlight style by refreshing the layer
          this.applyFeaturesFilteringFromControls();
        });

        // Only show the popup if tupleTemplate prop is present
        if (this.props.tupleTemplate) {
          const geometry = feature.getGeometry();
          const coord = getPopupCoordinate(geometry, evt.coordinate);
          const { features = [feature] } = feature.getProperties();

          const popupContent = features.map((feature) => {
            const props = feature.getProperties();
            return `<div>${SemanticMapAdvanced.createPopupContent(props, this.state.tupleTemplate)}</div>`;
          });

          // Offset the popup so it points at the middle of the marker not the tip
          popup.setOffset([0, -22]);
          popup.show(coord, `<mp-template-item>${popupContent.join('')}</mp-template-item>`);
        }
      } else {
        // No feature was clicked, reset selectedFeature to null
        this.setState({ selectedFeature: null }, () => {
          console.log('No feature selected, reset selectedFeature to null');
          this.triggerSendSelectedFeature();

          // Apply normal styles to all features (remove any highlight)
          this.applyFeaturesFilteringFromControls();
        });
      }
    });

    map.on('pointermove', (e) => {
      // Change cursor based on active visualization mode
      if (this.state.overlayVisualization === 'measure') {
        map.getTarget().style.cursor = 'crosshair';
      } else if (this.state.overlayVisualization === 'swipe') {
        // Use move cursor for swipe mode
        map.getTarget().style.cursor = 'move';
      } else if (this.state.overlayVisualization === 'spyglass') {
        // For spyglass mode, only show ns-resize cursor during resizing
        if (this.isResizingSpyglass) {
          map.getTarget().style.cursor = 'ns-resize';
        } else {
          map.getTarget().style.cursor = ''; // Default cursor when not resizing
        }
      } else {
        const hasFeatureAtPixel = map.hasFeatureAtPixel(e.pixel);
        map.getTarget().style.cursor = hasFeatureAtPixel ? 'pointer' : '';
      }
    });
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

  /** CONTROLS EVENTS **/

  startRegistrationProcess() {
    this.registrationIntervalId = (setInterval(() => {
      // console.log(this.props.id, "triggering loop for registration...")
      trigger({
        eventType: SemanticMapRequestControlsRegistration,
        data: this.props.id,
        source: this.props.id,
        targets: this.props.targetControls,
      });

      if (this.areArraysEqual(this.state.registeredControls, this.props.targetControls)) {
        console.log(this.props.id, 'all controls registered, closing registration loop.');
        clearInterval(this.registrationIntervalId);
      }
    }, 200) as unknown) as number;
  }

  // From Map

  private sendLayersToControls() {
    console.log(this.props.id, 'Syncing controls ', this.state.registeredControls);
    if (this.state.registeredControls.length > 0) {
      console.log('Sending layers: ', Array.from(_.values(this.state.mapLayers)), 'to', this.state.registeredControls);
      trigger({
        eventType: SemanticMapSendMapLayers,
        data: Array.from(_.values(this.state.mapLayers)),
        source: this.props.id,
        targets: this.state.registeredControls,
      });
    } else {
      console.warn('There are no controls registered yet.');
    }
  }

  // // Triggered from Controls events (but this won't get called for now)
  // private syncControlsFromEvent = (event: Event<any>) => {
  //   console.log(this.props.id, " map received sync request from controls ", event.source)
  //   this.sendLayersToControls();
  // };

  private unregisterControl(control): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.state.registeredControls.includes(control)) {
        // Use filter to remove the control from the array
        var newRegisteredControls = this.state.registeredControls.filter((c) => c !== control);
        this.setState(
          {
            registeredControls: newRegisteredControls,
          },
          () => {
            console.log(
              this.props.id,
              'Unregistered a control. Now registered Controls are:',
              this.state.registeredControls
            );
            resolve(); // Resolve the promise when setState callback is executed
          }
        );
      } else {
        console.warn(control + ' Control asked for unregistration, but was not registered.');
        resolve(); // Resolve the promise even if control is not registered
      }
    });
  }

  private registerControl(control): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.state.registeredControls.includes(control)) {
        var newRegisteredControls = this.state.registeredControls.concat(control);
        this.setState(
          {
            registeredControls: newRegisteredControls,
          },
          () => {
            console.log(
              this.props.id,
              'Registered a new control. Now registered Controls are:',
              this.state.registeredControls
            );
            resolve(); // Resolve the promise when setState callback is executed
          }
        );
      } else {
        console.log(control + ' Control is already registered.');
        resolve(); // Resolve the promise even if control is already registered
      }
    });
  }

  // Modified registerAllControls to use Promise.all
  private registerAllControls() {
    console.log('Registering all controls for', this.props.id);
    let promises = this.props.targetControls.map((control) => {
      if (!this.state.registeredControls.includes(control)) {
        return this.registerControl(control);
      }
      return Promise.resolve(); // Immediately resolve if control is already registered
    });

    return Promise.all(promises);
  }

  private registerControlsFromEvent = (event: Event<any>) => {
    this.registerControl(event.source).then(() => {
      console.log('Layers updated and map view fitted to extents');
      this.sendLayersToControls();
    });
    console.log('MapControls ' + event.source + ' Mounted and registered to', this.props.id);
  };

  private unregisterControlsFromEvent = (event: Event<any>) => {
    this.unregisterControl(event.source).then(() => {
      console.log('Confirmed unregistered control:', event.source);
    });
  };

  private setYear = (event: Event<any>) => {
    if (this.state.yearFiltering) {
      this.setState(
        {
          year: event.data,
        },
        () => {
          this.applyFeaturesFilteringFromControls();
        }
      );
    } else {
      //TODO: add possibility for levels too
      console.log('Yearfiltering is set to false.');
    }
  };

  private setVectorLevels = (event: Event<any>) => {
    this.setState(
      {
        vectorLevels: event.data,
      },
      () => {
        this.applyFeaturesFilteringFromControls();
      }
    );
  };

  private triggerUpdateFeatureColorsByGroups = (event: Event<any>) => {
    const groupColorsAssociationsNew = event.data;
    console.log('Map received groupcolorsassociations:');
    console.log(event.data);
    if (this.map) {
      this.updateFeatureColorsByGroups(groupColorsAssociationsNew);
    } else {
      console.log('Map is not yeat ready for ', this.props.id, '. Will not update feature colors.');
    }
  };

  private setFeaturesColorTaxonomy = (event: Event<any>) => {
    this.setState(
      {
        featuresColorTaxonomy: event.data,
      },
      () => {
        this.applyFeaturesFilteringFromControls();
      }
    );
  };

  private setFeaturesLabel = (event: Event<any>) => {
    this.setState(
      {
        featuresLabel: event.data,
      },
      () => {
        this.applyFeaturesFilteringFromControls();
      }
    );
  };

  // This sets the visualizations mask index correctly
  private setMaskIndex = (event: Event<any>) => {
    this.setState({ maskIndex: event.data });
  };

  // This applies changes for all layers from the controls to the map
  private updateMapLayersFromControls = (event: Event<any>) => {
    const incomingLayers = event.data;

    this.setState(
      {
        mapLayers: incomingLayers,
      },
      () => {
        incomingLayers.forEach((value, index) => {
          let layer = this.getMapLayerByIdentifier(value.get('identifier'));
          //Calculate Z-index reverting the order (i.e. top layer has highest z index)
          layer.setZIndex(Math.abs(index - event.data.length));
        });
      }
    );
  };

  // Local functions

  private createHiddenFeatureStyle() {
    return new Style({});
  }

  private createFeatureStyle(feature) {
    const geometry = feature.getGeometry();
    let label = '';
    if (feature.get(this.state.featuresLabel) !== undefined) {
      if (this.state.featuresLabel && this.state.featuresLabel !== 'none') {
        label = feature.get(this.state.featuresLabel).value;
      }
    }
    let color = this.defaultFeaturesColor;
    //TODO: Manage object color (in groupcolorassociations there can be strings or a color objects)
    if (this.state.registeredControls.length > 0 && this.state.featuresColorTaxonomy) {
      let feature_group = feature.get(this.state.featuresColorTaxonomy).value;
      var group_color = this.state.groupColorAssociations[feature_group];
      if (
        this.state.featuresColorTaxonomy &&
        feature.get(this.state.featuresColorTaxonomy).value in this.state.groupColorAssociations &&
        group_color !== this.defaultFeaturesColor
      ) {
        if (typeof group_color === 'string') {
          color = group_color;
        } else {
          let color_rgba = group_color.rgb;
          let rgba_string = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + '0.3' + ')';
          color = rgba_string;
        }
      }
    }
    let featureStyle = getFeatureStyle(geometry, color);
    if (label) {
      featureStyle.getText().setText(label);
    }
    return featureStyle;
  }

  private applyFeaturesFilteringFromControls() {
    if (!this.map) return;

    console.log('Setting year: ' + this.state.year);
    const year = this.state.year;
    const vectorLayers = this.getVectorLayersFromMap();

    // Clear style cache when filtering changes
    this.styleCache = {};

    // Process only features in the current viewport for better performance
    this.updateVisibleFeatures();

    vectorLayers.forEach((vectorLayer) => {
      const source = vectorLayer.getSource();
      let features;

      if (source instanceof Cluster) {
        features = source.getSource().getFeatures();
      } else {
        features = source.getFeatures();
      }

      features.forEach((feature) => {
        try {
          // Use the optimized style function that includes caching
          feature.setStyle(this.getFeatureStyleWithFilters(feature));
        } catch (ex) {
          console.log('Error styling feature: ', feature);
          console.log(ex);
          feature.setStyle(this.createHiddenFeatureStyle());
        }
      });
    });
  }

  private updateFeatureColorsByGroups(groupColorsAssociationsNew) {
    console.log('Updating feature colors by groups');

    // Clear style cache when color groups change
    this.styleCache = {};

    this.setState(
      {
        groupColorAssociations: groupColorsAssociationsNew,
      },
      () => {
        // Apply the new styles using our optimized method
        this.applyFeaturesFilteringFromControls();
      }
    );
  }

  /*** UTILITIES */
  private dateInclusion(bob, eob, boe, eoe, year) {
    let bob_year = parseInt(bob);
    let eoe_year = parseInt(eoe);
    let eob_year = parseInt(eob);
    let boe_year = parseInt(boe);
    year = parseInt(year);
    return eob_year <= year && year <= boe_year;
  }

  private transformToMercator(lng: number, lat: number): Coordinate {
    return transform([lng, lat], this.getInputCrs(), 'EPSG:3857');
  }

  private readWKT(wkt: string) {
    const format = new WKT();
    let geometry = format.readGeometry(wkt, {
      dataProjection: this.getInputCrs(),
      featureProjection: 'EPSG:3857',
    });

    return geometry;
  }

  private areArraysEqual(arr1: string[], arr2: string[]): boolean {
    return arr1.every((item) => arr2.includes(item)) && arr2.every((item) => arr1.includes(item));
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
                    lat,lng nor wkt projection letiable. `;
        this.setState({ errorMessage: maybe.Just(msg) });
      } else {
        f.setGeometry(geo);

        const type = geo.getType();
        geometries[type] = geometries[type] ? geometries[type].concat(f) : [f];
      }
    });

    return geometries;
  };

  private getClusterDistance(zoom: number): number {
    if (zoom < 6) return 100; // Far zoom: Large clusters
    if (zoom < 10) return 60;
    if (zoom < 14) return 40;
    return 20; // Close zoom: Minimal clustering
  }

  private getClusterStyle(feature: Feature): Style {
    const size = feature.get('features').length;

    return new Style({
      image: new CircleStyle({
        radius: size > 1 ? 10 + Math.min(size, 20) : 6, // Scale based on cluster size
        fill: new Fill({ color: size > 1 ? 'rgba(255, 140, 0, 0.8)' : 'rgba(0, 255, 0, 0.6)' }),
        stroke: new Stroke({ color: 'white', width: 2 }),
      }),
      text:
        size > 1
          ? new Text({
              text: size.toString(),
              fill: new Fill({ color: '#fff' }),
              stroke: new Stroke({ color: '#000', width: 2 }),
            })
          : null,
    });
  }

  /**
   * Zooms to a feature on the map
   * @param feature The feature to zoom to
   */
  private zoomToFeature(feature: Feature) {
    if (!feature || !this.map) return;

    // Get the geometry of the feature
    const geometry = feature.getGeometry();
    if (!geometry) return;

    // Create an extent from the geometry
    const extent = geometry.getExtent();

    // Add some padding around the extent
    const padding = [50, 50, 50, 50]; // [top, right, bottom, left] padding in pixels

    // Get the current zoom level
    const currentZoom = this.map.getView().getZoom();

    // Calculate what the zoom level would be for the feature extent
    const view = this.map.getView();
    const resolution = view.getResolutionForExtent(extent, this.map.getSize());
    const featureZoom = view.getZoomForResolution(resolution);

    // Only zoom if the current zoom is less than what would be calculated
    // (i.e., don't "dezoom" if we're already zoomed in more)
    if (currentZoom && featureZoom && currentZoom < featureZoom) {
      // Animate to the feature with a smooth transition and zoom
      this.map.getView().fit(extent, {
        padding: padding,
        duration: 500, // Animation duration in milliseconds
        maxZoom: 18, // Limit maximum zoom level
      });
    } else {
      // Just center on the feature without changing zoom
      const center = [
        (extent[0] + extent[2]) / 2, // X center
        (extent[1] + extent[3]) / 2, // Y center
      ];
      this.map.getView().animate({
        center: center,
        duration: 500,
      });
    }
  }

  /**
   * Creates a highlighted style for the selected feature
   * @param geometry The geometry of the feature
   * @param color The base color to use
   */
  /**
   * Creates a highlighted style for the selected feature
   * @param geometry The geometry of the feature
   * @param color The base color to use
   */
  private createHighlightedFeatureStyle(geometry: Geometry, color: string): Style {
    // Get custom style from props if available
    const customStyle = this.props.selectedFeatureStyle || {};
    
    if (geometry instanceof Point || geometry instanceof MultiPoint) {
      return new Style({
        geometry,
        image: new CircleStyle({
          radius: customStyle.pointRadius || 10, // Default: 10
          fill: new Fill({ color: customStyle.color || color }),
          stroke: new Stroke({
            color: customStyle.borderColor || '#FFFFFF',
            width: customStyle.borderWidth || 3,
          }),
        }),
        text: new Text({
          text: '\uf041',
          font: `normal ${customStyle.pointFontSize || 26}px FontAwesome`, // Default: 26px
          textBaseline: 'bottom',
          fill: new Fill({ color: customStyle.borderColor || '#FFFFFF' }),
          stroke: new Stroke({
            color: '#000000',
            width: customStyle.labelStrokeWidth || 2,
          }),
        }),
      });
    } else if (geometry instanceof GeometryCollection) {
      // For geometry collections, we'll use the first geometry's style
      // This is a simplification - in a real app you might want to handle this differently
      const geometries = geometry.getGeometries();
      if (geometries.length > 0) {
        return this.createHighlightedFeatureStyle(geometries[0], color);
      }
      // Fallback if no geometries
      return new Style({
        fill: new Fill({ color: customStyle.color || 'rgba(255, 165, 0, 0.6)' }),
        stroke: new Stroke({ 
          color: customStyle.borderColor || '#FFFFFF', 
          width: customStyle.borderWidth || 3 
        }),
      });
    }

    // For polygons and other geometries
    return new Style({
      geometry,
      fill: new Fill({
        color: customStyle.color || 'rgba(255, 165, 0, 0.6)', // Default: orange with opacity
      }),
      stroke: new Stroke({
        color: customStyle.borderColor || '#FFFFFF', // Default: white border
        width: customStyle.borderWidth || 3, // Default: 3px width
      }),
      text: new Text({
        font: `${customStyle.labelFontSize || 14}px Calibri,sans-serif`, // Default: 14px
        overflow: true,
        fill: new Fill({
          color: customStyle.labelColor || '#000',
        }),
        stroke: new Stroke({
          color: customStyle.labelStrokeColor || '#fff',
          width: customStyle.labelStrokeWidth || 3,
        }),
      }),
    });
  }

  private getFeatureStyleWithFilters(feature: Feature): Style {
    // Check if this is the selected feature
    if (this.state.selectedFeature && feature === this.state.selectedFeature) {
      // Use highlighted style for selected feature
      const geometry = feature.getGeometry();
      return this.createHighlightedFeatureStyle(geometry, 'rgba(255, 165, 0, 0.6)'); // Orange highlight
    }

    // Check if year filtering is enabled and we have a year set
    if (this.state.yearFiltering && this.state.year) {
      // Extract year from YYYY-MM-DD format
      const currentYear = parseInt(this.state.year.split('-')[0]);
      
      // Only apply date filtering if the feature has temporal properties
      if (feature.get('bob') && feature.get('eob') && feature.get('boe') && feature.get('eoe')) {
        const bob = feature.get('bob').value;
        const eob = feature.get('eob').value;
        const boe = feature.get('boe').value;
        const eoe = feature.get('eoe').value;
        
        // Check if the current year is within the feature's date range
        if (!this.dateInclusion(bob, eob, boe, eoe, currentYear)) {
          // If not, hide the feature
          return this.createHiddenFeatureStyle();
        }
      }
    }

    // Check if feature has a group and if that group is toggled on
    if (this.state.registeredControls.length > 0 && this.state.featuresColorTaxonomy) {
      if (feature.get(this.state.featuresColorTaxonomy) !== undefined) {
        let feature_group = feature.get(this.state.featuresColorTaxonomy).value;

        // If the feature's group is in groupColorAssociations
        if (feature_group in this.state.groupColorAssociations) {
          // Get the color for this group
          let color = this.state.groupColorAssociations[feature_group];

          // Check if the color is a string with rgba format
          if (typeof color === 'string' && color.startsWith('rgba')) {
            // Extract the alpha value
            const alphaMatch = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
            if (alphaMatch && parseFloat(alphaMatch[1]) === 0) {
              // If alpha is 0, the group is toggled off, so hide the feature and its label
              return this.createHiddenFeatureStyle();
            }
          } else if (typeof color === 'object' && color.rgb && color.rgb.a === 0) {
            // If it's a color object with alpha 0
            return this.createHiddenFeatureStyle();
          }
        }
      }
    }

    // If we get here, the feature should be visible with normal style
    return this.createFeatureStyle(feature);
  }

  private createLayer = (features: Feature[], type: string): VectorLayer<any> => {
    console.log('Create Layer');

    const source = new Vector({ features });

    if (type === 'Point') {
      // Create a Cluster Source with Dynamic Zoom Adjustment
      const clusterSource = new Cluster({
        distance: this.getClusterDistance(this.map.getView().getZoom()), // Initial clustering distance
        source,
      });

      const clusteredLayer = new AnimatedCluster({
        distance: 80, // Default distance
        minDistance: 40, // Ensures spacing between clusters
        source: clusterSource,
        style: (feature) => this.getClusterStyle(feature),
        zIndex: 1, // Keep clusters on top
      });

      // Listen for zoom changes and update clustering dynamically
      this.map.getView().on('change:resolution', () => {
        const zoom = this.map.getView().getZoom();
        clusterSource.setDistance(this.getClusterDistance(zoom));
      });

      return clusteredLayer;
    }

    const vectorLayer = new VectorLayer({
      source,
      style: (feature: Feature) => this.getFeatureStyleWithFilters(feature),
      zIndex: 0,
      declutter: true,
    });
    // Set level property to ensure it appears in controls
    vectorLayer.set('level', 'feature');
    vectorLayer.set('name', 'Buildings');
    vectorLayer.set('author', 'Buildings');
    vectorLayer.set('identifier', 'Buildings');
    return vectorLayer;
  };

  private setTilesLayersFromTemplate() {
    let tilesLayers = [];
    React.Children.forEach(this.props.children, (child: any) => {
      if (child.type.name === 'TilesLayer') {
        const tileslayer = new TileLayer({
          source: new XYZ({ url: child.props.url }),
        });
        tileslayer.set('level', child.props.level);
        tileslayer.set('name', child.props.name);
        tileslayer.set('year', child.props.year);
        tileslayer.set('location', child.props.location);
        tileslayer.set('author', child.props.author);
        tileslayer.set('identifier', child.props.identifier);
        tileslayer.set('thumbnail', child.props.thumbnail);
        tilesLayers.push(tileslayer);
      }
    });
    console.log('Map ', this.props.id, ' loaded tileslayers from template: ', tilesLayers);
    return tilesLayers;
  }

  private renderMap(node, center, markers) {
    window.setTimeout(() => {
      const geometries = this.createGeometries(markers);
      let layers = _.mapValues(geometries, this.createLayer);

      let basemapLayers = [];
      const overlayLayers = [];
      let newMapLayers = [];

      if (this.state.mapLayers.length) {
        this.state.mapLayers.forEach(function (tileslayer) {
          if (tileslayer.get('level') === 'basemap') {
            basemapLayers.push(tileslayer);
          } else if (tileslayer.get('level') === 'overlay') {
            overlayLayers.push(tileslayer);
          }
          tileslayer.set('visible', false);
        });

        basemapLayers[0].set('visible', true);
        basemapLayers[1].set('visible', true);


        let mapLayersClone = this.state.mapLayers;
        newMapLayers = _.values(mapLayersClone).concat(_.values(layers));
      } else {
        newMapLayers = _.values(layers);
        newMapLayers.unshift(
          new TileLayer({
            source: new OSM(),
          })
        );
      }

      this.setState(
        {
          mapLayers: newMapLayers,
        },
        () => {
          const map = new Map({
            controls: controlDefaults({
              attributionOptions: {
                collapsible: false,
              },
            }).extend([new AnnotateControl()]),
            // TODO: If we want to allow templating to disable interactions with map, we could read a prop and enable this:
            // interactions: interaction.defaults({ mouseWheelZoom: false }),
            interactions: interactionDefaults({}),

            //TODO: Extent property management
            layers: Object.values(this.state.mapLayers),
            target: node,
            view: new View({
              center: this.transformToMercator(parseFloat(center.lng), parseFloat(center.lat)),
              zoom: 3,
              extent: this.getInputExtent(),
            }),
          });
          console.log('Map ', this.props.id, ' setting layers', layers, ' and map ', map);
          this.layers = layers;
          this.map = map;

          // Set up viewport change listeners
          map.on('moveend', () => {
            if (this.debouncedUpdateVisibleFeatures) {
              this.debouncedUpdateVisibleFeatures();
            }
          });

          // Initial update of visible features
          this.updateVisibleFeatures();

          // Listen for base map loaded event
          const baseMapLayer = this.state.mapLayers.find((layer) => layer instanceof TileLayer);
          if (baseMapLayer) {
            const source = baseMapLayer.getSource();
            if (source) {
              // For OSM and XYZ sources
              source.on('tileloadend', () => {
                // Set a small timeout to ensure all tiles are loaded
                setTimeout(() => {
                  this.setState({ baseMapLoaded: true });
                }, 500);
              });
            }
          } else {
            // If no base map layer, consider it loaded
            this.setState({ baseMapLoaded: true });
          }

          this.startRegistrationProcess();

          /* Layer Spy functionality */
          node.addEventListener('mousemove', (event) => {
            // Update mouse position for spyglass to follow cursor when not resizing
            if (!this.isResizingSpyglass) {
              this.mousePosition = map.getEventPixel(event);
            }
            
            // Handle spyglass resizing if active
            if (this.isResizingSpyglass) {
              // Calculate Y-axis movement
              const deltaY = event.clientY - this.spyglassResizeStartY;
              
              // Adjust radius based on Y movement (negative deltaY means moving up, which increases radius)
              // Use a scaling factor to make the adjustment more natural
              const newRadius = Math.max(30, this.spyglassResizeStartRadius - deltaY * 0.5);
              
              // Update the radius
              this.spyglassRadius = newRadius;
            }
            
            // Always render the map to update spyglass position and/or size
            this.map.render();
          });

          node.addEventListener('mouseout', () => {
            this.mousePosition = null;
            this.map.render();
          });
          
          // Add event listener for right-click or ctrl+click to start resizing spyglass
          node.addEventListener('mousedown', (event) => {
            // Only handle if we're in spyglass mode
            if (this.state.overlayVisualization !== 'spyglass') {
              return;
            }
            
            // Check if it's a right-click (button 2) or ctrl+click
            if (event.button === 2 || (event.button === 0 && event.ctrlKey)) {
              event.preventDefault(); // Prevent context menu
              
              // Start resizing
              this.isResizingSpyglass = true;
              this.spyglassResizeStartY = event.clientY;
              this.spyglassResizeStartRadius = this.spyglassRadius;
              
              // Change cursor to indicate resizing
              node.style.cursor = 'ns-resize';
            }
          });
          
          // Add event listener to stop resizing on mouse up
          document.addEventListener('mouseup', () => {
            if (this.isResizingSpyglass) {
              this.isResizingSpyglass = false;
              
              // Reset cursor
              if (this.state.overlayVisualization === 'spyglass') {
                node.style.cursor = 'move';
              }
            }
          });
          
          // Prevent context menu when in spyglass mode
          node.addEventListener('contextmenu', (event) => {
            if (this.state.overlayVisualization === 'spyglass') {
              event.preventDefault();
            }
          });

          // asynch execute query and add markers
          this.addMarkersFromQuery(this.props, this.context);

          this.initializeMarkerPopup(map);
          //map.getView().fit(props.mapOptions.extent);

          window.addEventListener('resize', () => {
            map.updateSize();
          });

          /*
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
          */

          const zoom = this.props.fixZoomLevel ? this.props.fixZoomLevel : 12;
          const view = this.map.getView();

          if (this.props.fixCenter) {
            view.setCenter(this.props.fixCenter);
          }
          view.setZoom(zoom);

          // this.map.addInteraction(this.modify);
          this.map.updateSize();
        }
      );
    }, 1000);
  }

  private queryExecutionCount = 0;

  public BoundingBoxChanged(boundingBox: Dictionary<QueryConstantParameter>) {
    trigger({ eventType: SemanticMapBoundingBoxChanged, source: this.props.id, data: boundingBox });
  }

  addMarkersFromQuery = (props: SemanticMapAdvancedProps, context: ComponentContext) => {
    const { query } = props;

    if (!query) return;

    console.log(`[DEBUG] Query Fired - Timestamp: ${Date.now()}`);

    // Track multiple calls
    if (!this.queryExecutionCount) {
      this.queryExecutionCount = 0;
    }
    this.queryExecutionCount++;

    // Clear style cache when loading new data
    this.styleCache = {};

    const startTime = performance.now();
    const stream = SparqlClient.select(query, { context: context.semanticContext });

    stream.onValue((res) => {
      const endTime = performance.now();
      console.log(`[DEBUG] Query execution time: ${endTime - startTime}ms`);

      const result = _.map(res.results.bindings, (v) => _.mapValues(v, (x) => x) as any);

      if (SparqlUtil.isSelectResultEmpty(res)) {
        console.warn(`[DEBUG] No results found.`);
        this.setState({
          noResults: true,
          errorMessage: maybe.Nothing<string>(),
          isLoading: false,
        });
      } else {
        console.log(`[DEBUG] Processing ${result.length} features`);
        this.setState({
          noResults: false,
          errorMessage: maybe.Nothing<string>(),
          isLoading: false,
        });

        // Process features in batches for better performance with large datasets
        const processFeaturesInBatches = async (data) => {
          const geometries = this.createGeometries(data);
          await this.updateLayers(geometries);
          console.log(`[DEBUG] Layers updated.`);
          this.sendLayersToControls();

          // Update visible features after adding new data
          this.updateVisibleFeatures();
        };

        processFeaturesInBatches(result);
      }

      if (this.props.id) {
        trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id, data: { results: result } });
      }
    });

    stream.onError((error) => {
      console.error(`[DEBUG] Query Error: `, error);
      this.setState({
        errorMessage: maybe.Just(error),
        isLoading: false,
      });
    });

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: stream,
      });
    }
  };

  public combineExtentsFromLayers(layers) {
    var extent = createEmpty();
    layers.forEach(function (layer) {
      extend(extent, layer.getSource().getExtent());
    });
    return extent;
  }

  private isEmptyObject(obj: any): boolean {
    return typeof obj === 'object' && obj !== null && Object.keys(obj).length === 0;
  }

  private updateLayers = (geometries: { [type: string]: Feature[] }): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const currentExtent = this.map.getView().calculateExtent();

      console.log('Map', this.map, 'Updating Layers with geometries: ', geometries);

      const mapLayersClone = this.state.mapLayers;

      _.forEach(geometries, (features, type) => {
        let layer = this.getVectorLayerByType(type);
        if (layer) {
          let source = layer.getSource();
          if (source instanceof Cluster) {
            source = source.getSource();
          }
          source.refresh();
        } else {
          layer = this.createLayer(features, type);
          layer.set('type', type);
          mapLayersClone.unshift(layer);
          this.map.addLayer(layer);
        }
      });

      let newMapLayers = Object.values(mapLayersClone);
      console.log(this.props.id, 'setting new map layers: ', newMapLayers);
      this.setState(
        {
          mapLayers: newMapLayers,
        },
        () => {
          let vectorLayers = this.getVectorLayersFromMap();
          let combinedExtents = this.combineExtentsFromLayers(vectorLayers);
          console.log('Setting the extents to: ', combinedExtents);
          this.map.getView().fit(combinedExtents, { padding: [100, 100, 100, 100] });
          resolve(); // Resolve the promise once the state is set and the map view is updated
        }
      );
    });
  };

  private getAllVectorLayers() {
    const allLayers = this.state.mapLayers;
    let vectorLayers = [];
    allLayers.forEach((layer) => {
      if (layer instanceof VectorLayer) {
        vectorLayers.push(layer);
      }
    });
    return vectorLayers;
  }

  private calculateExtent() {
    const viewExtent = createEmpty();
    _.forEach(this.layers, (layer) => {
      let source = layer.getSource();
      console.log(source);
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
          const html = SemanticMapAdvanced.createPopupContent(f.getProperties(), template);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          d.appendChild(doc.body.firstChild);
        });
      });
    }
  };

  private compileTemplatesInConfig = (config: SemanticMapAdvancedConfig): void => {
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

  private handleDeprecatedLayout(props: SemanticMapAdvancedConfig): string {
    if (_.has(props, 'layout')) {
      console.warn('layout property in semantic-map is deprecated, please use flat properties instead');
      return props['layout']['tupleTemplate'];
    } else {
      return props.tupleTemplate;
    }
  }

  /** FORM MODE **/
  // This function sends selected feature
  private triggerSendSelectedFeature() {
    let targets = this.props.featureSelectionTargets;
    let feature = this.state.selectedFeature;
    console.log('Sending feature to', targets);

    // Always send the event, even if feature is null
    // This ensures the controls component is notified when no feature is selected
    if (targets && targets.length > 0) {
      trigger({
        eventType: SemanticMapSendSelectedFeature,
        data: feature, // This can be null
        source: this.props.id,
        targets: targets,
      });
    }
  }

  /*** SINGLE FEATURE COLORING */
  private setFeatureColor = (event: Event<any>) => {
    const newColor: string = event.data;
    this.setState(
      {
        featureColor: newColor,
      },
      () => {
        //this.updateVectorLayersStyle();
      }
    );
  };

  private updateFeatureColor = (event: Event<any>) => {
    /**
     *
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
    // It updates only the last layer, assuming it contains the features
    const layer = this.map.getLayers().getArray().slice(-1).pop() as VectorLayer<any>;

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

  /* This function was used only in Single feature coloring */
  // private updateVectorLayersStyle() {
  //   let vectorLayers = this.getVectorLayersFromMap();
  //   vectorLayers.forEach((vectorLayer) => {
  //     vectorLayer
  //       .getSource()
  //       .getFeatures()
  //       .forEach((feature) => {
  //         feature.setStyle();
  //       });
  //   });
  // }

  /** GETTERS */
  private getInputCrs() {
    return this.props.mapOptions === undefined || this.props.mapOptions.crs === undefined
      ? 'EPSG:3857'
      : this.props.mapOptions.crs;
  }

  private getInputExtent() {
    if (this.props.mapOptions === undefined || this.props.mapOptions.extent === undefined) {
      return createEmpty();
    } else {
      this.props.mapOptions.extent;
    }
  }

  private GetExtent() {
    return this.props.mapOptions.extent;
  }

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

  private getVectorLayerByType(type: string) {
    let foundVectorLayer;
    _.forEach(this.getAllVectorLayers(), (vectorLayer) => {
      if (vectorLayer.get('type') === type) {
        foundVectorLayer = vectorLayer;
      }
    });
    return foundVectorLayer;
  }

  private getMapLayerByIdentifier(identifier) {
    let result;
    this.map
      .getLayers()
      .getArray()
      .forEach(function (mapLayer) {
        if (mapLayer.get('identifier') === identifier) {
          result = mapLayer;
        }
      });
    return result;
  }

  private getVectorLayersFromMap() {
    if (this.map) {
      console.log('Getting Vector Layers from Map: ', this.map);
      const allLayers = this.map.getLayers().getArray();
      let vectorLayers = [];
      allLayers.forEach((layer) => {
        if (layer instanceof VectorLayer) {
          vectorLayers.push(layer);
        }
      });
      return vectorLayers;
    } else {
      console.log('Map', this.props.id, 'not yet ready.');
      return [];
    }
  }

  // Performance optimization methods
  private updateVisibleFeatures() {
    if (!this.map) return;

    try {
      // Get the current viewport extent with a buffer
      const extent = this.map.getView().calculateExtent(this.map.getSize());
      const bufferedExtent = buffer(extent, getWidth(extent) * 0.3);

      // Clear previous visible features
      this.visibleFeatures.clear();

      // Get features in current viewport
      this.getVectorLayersFromMap().forEach((vectorLayer) => {
        const source = vectorLayer.getSource();
        let features;

        if (source instanceof Cluster) {
          // For clustered layers, get features from the source of the cluster
          features = source.getSource().getFeatures();
        } else {
          features = source.getFeatures();
        }

        // Mark all features as visible for now to ensure they display
        features.forEach((feature) => {
          if (feature.getId()) {
            this.visibleFeatures.add(feature.getId().toString());
          }
        });
      });

      console.log(`Visible features: ${this.visibleFeatures.size}`);
    } catch (error) {
      console.error('Error updating visible features:', error);
    }
  }

  /*** VISUALIZATIONS  */

  private toggle3d = (event: Event<any>) => {};
  
  /**
   * Handler for the measurement tool toggle event
   * Activates or deactivates the measurement tool
   */
  private handleMeasurementToggle = (event: Event<any>) => {
    console.log('Measurement tool toggled:', event.data);
    
    if (event.data === 'deactivated' || this.state.overlayVisualization === 'measure') {
      // Deactivate measurement tool
      this.deactivateMeasurementTool();
      
      // Update the controls to show the button as inactive
      trigger({
        eventType: SemanticMapControlsToggleMeasurement,
        source: this.props.id,
        data: 'deactivated',
        targets: this.state.registeredControls,
      });
    } else {
      // Activate measurement tool
      this.activateMeasurementTool();
    }
  };
  
  // Variables for measurement tool
  private measureSource: VectorSource;
  private measureVector: VectorLayer<any>;
  private measureDraw: Draw;
  private measureTooltipElement: HTMLElement;
  private measureTooltip: Overlay;
  private helpTooltipElement: HTMLElement;
  private helpTooltip: Overlay;
  private measureSketch: Feature;
  private measureListener: any;
  private escKeyListener: any;
  
  /**
   * Activates the measurement tool
   */
  private activateMeasurementTool() {
    if (!this.map) return;
    
    // Set state to indicate measurement mode is active
    this.setState({ overlayVisualization: 'measure' });
    
    // Create vector source and layer for measurements if they don't exist
    if (!this.measureSource) {
      this.measureSource = new VectorSource();
      this.measureVector = new VectorLayer({
        source: this.measureSource,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 2,
          }),
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#ffcc33',
            }),
          }),
        }),
        zIndex: 1000, // Ensure it's on top
      });
      this.map.addLayer(this.measureVector);
    }
    
    // Create tooltips
    this.createMeasureTooltip();
    this.createHelpTooltip();
    
    // Add pointer move handler
    this.map.on('pointermove', this.measurePointerMoveHandler);
    
    // Add mouseout handler
    this.map.getViewport().addEventListener('mouseout', () => {
      if (this.helpTooltipElement) {
        this.helpTooltipElement.classList.add('hidden');
      }
    });
    
    // Create draw interaction with improved styling for both active and completed lines
    this.measureDraw = new Draw({
      source: this.measureSource,
      type: 'LineString',
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
        }),
      }),
    });
    
    // Apply a style to the vector layer for completed measurements
    this.measureVector.setStyle(new Style({
      stroke: new Stroke({
        color: '#ffcc33',
        width: 3,
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33',
        }),
      }),
    }));
    
    this.map.addInteraction(this.measureDraw);
    
    // Add keyboard event listener for Escape key
    this.addEscapeKeyListener();
    
    // Add keyboard event listener for Enter key to finish measurement
    this.addEnterKeyListener();
    
    // Set up draw start event
    this.measureDraw.on('drawstart', (evt: any) => {
      // Set sketch
      this.measureSketch = evt.feature;
      
      // Get the coordinate from the event
      let tooltipCoord = evt.coordinate || this.map.getView().getCenter();
      
      // Add listener to update tooltip while drawing
      this.measureListener = this.measureSketch.getGeometry().on('change', (e) => {
        const geom = e.target;
        let output;
        if (geom instanceof LineString) {
          output = this.formatLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        }
        
        if (this.measureTooltipElement) {
          this.measureTooltipElement.innerHTML = output;
          this.measureTooltip.setPosition(tooltipCoord);
        }
      });
    });
    
    // Set up draw end event
    this.measureDraw.on('drawend', () => {
      if (this.measureTooltipElement) {
        this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
        this.measureTooltip.setOffset([0, -7]);
      }
      
      // Unset sketch
      this.measureSketch = null;
      
      // Unset tooltip so that a new one can be created
      this.measureTooltipElement = null;
      this.createMeasureTooltip();
      
      // Remove listener
      if (this.measureListener) {
        unByKey(this.measureListener);
      }
    });
  }
  
  /**
   * Add keyboard event listener for Escape key to cancel measurement or any visualization mode
   */
  private addEscapeKeyListener() {
    // Store the original document keydown handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Escape is pressed and we're in any special visualization mode
      if (e.key === 'Escape' && this.state.overlayVisualization !== 'normal') {
        const previousMode = this.state.overlayVisualization;
        
        // First, clean up the current visualization mode
        this.cleanupVisualizationMode(previousMode);
        
        // Reset to normal mode
        this.setState({ overlayVisualization: 'normal' }, () => {
          // Reset all visualizations to ensure clean state
          this.resetAllVisualizations();
          
          // Force a re-render of the map
          this.map.render();
          
          // Notify controls that we've returned to normal mode
          // This will update all visualization buttons in the sidebar
          trigger({
            eventType: SemanticMapControlsOverlayVisualization,
            source: this.props.id,
            data: 'normal',
            targets: this.state.registeredControls,
          });
        });
      }
    };
    
    // Add the event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Store the handler so we can remove it later
    this.escKeyListener = handleKeyDown;
  }
  
  /**
   * Add keyboard event listener for Enter key to finish measurement
   */
  private addEnterKeyListener() {
    // Create a handler for the Enter key
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Enter is pressed and we're in measurement mode with an active sketch
      if (e.key === 'Enter' && 
          this.state.overlayVisualization === 'measure' && 
          this.measureSketch) {
        
        console.log('Enter key pressed - finishing measurement');
        
        // Finish the current drawing
        if (this.measureDraw) {
          // This simulates a double-click to finish the measurement
          this.measureDraw.finishDrawing();
        }
      }
    };
    
    // Add the event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // We don't need to store this handler separately since it will be removed
    // when the measurement tool is deactivated along with the escape key listener
  }
  
  /**
   * Deactivates the measurement tool
   */
  private deactivateMeasurementTool() {
    // Remove draw interaction
    if (this.measureDraw) {
      this.map.removeInteraction(this.measureDraw);
      this.measureDraw = null;
    }
    
    // Remove tooltips
    if (this.helpTooltip) {
      this.map.removeOverlay(this.helpTooltip);
      if (this.helpTooltipElement && this.helpTooltipElement.parentNode) {
        this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
      }
      this.helpTooltipElement = null;
      this.helpTooltip = null;
    }
    
    if (this.measureTooltip) {
      this.map.removeOverlay(this.measureTooltip);
      if (this.measureTooltipElement && this.measureTooltipElement.parentNode) {
        this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
      }
      this.measureTooltipElement = null;
      this.measureTooltip = null;
    }
    
    // Remove pointer move handler
    this.map.un('pointermove', this.measurePointerMoveHandler);
    
    // Note: We don't remove the ESC key listener here anymore
    // It will be removed only when going back to normal mode
    
    // Clear measurement layer
    if (this.measureSource) {
      this.measureSource.clear();
    }
    
    // Remove all static tooltips from the DOM
    const mapElement = findDOMNode(this.refs[MAP_REF]) as HTMLElement;
    if (mapElement) {
      // Find and remove all tooltip elements
      const tooltips = mapElement.querySelectorAll('.ol-tooltip-static');
      tooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      });
    }
    
    // Remove the measurement vector layer from the map
    if (this.measureVector) {
      this.map.removeLayer(this.measureVector);
      this.measureVector = null;
      this.measureSource = null;
    }
  }
  
  /**
   * Handle pointer move for measurement tool
   */
  private measurePointerMoveHandler = (evt) => {
    if (evt.dragging || !this.helpTooltipElement) {
      return;
    }
    
    let helpMsg = 'Click to start measuring';
    
    if (this.measureSketch) {
      const geom = this.measureSketch.getGeometry();
      if (geom instanceof LineString) {
        helpMsg = 'Click to continue measuring the line';
      }
    }
    
    this.helpTooltipElement.innerHTML = helpMsg;
    this.helpTooltip.setPosition(evt.coordinate);
    
    this.helpTooltipElement.classList.remove('hidden');
  };
  
  /**
   * Creates a new help tooltip
   */
  private createHelpTooltip() {
    if (this.helpTooltipElement && this.helpTooltipElement.parentNode) {
      this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
    }
    
    this.helpTooltipElement = document.createElement('div');
    this.helpTooltipElement.className = 'ol-tooltip hidden';
    
    this.helpTooltip = new Overlay({
      element: this.helpTooltipElement,
      offset: [15, 0],
      positioning: 'center-left',
    });
    
    this.map.addOverlay(this.helpTooltip);
  }
  
  /**
   * Creates a new measure tooltip
   */
  private createMeasureTooltip() {
    if (this.measureTooltipElement && this.measureTooltipElement.parentNode) {
      this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
    }
    
    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false,
    });
    
    this.map.addOverlay(this.measureTooltip);
  }
  
  /**
   * Format length output
   * @param {LineString} line The line
   * @return {string} The formatted length
   */
  private formatLength(line) {
    const length = getLength(line);
    let output;
    
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + ' km';
    } else {
      output = Math.round(length * 100) / 100 + ' m';
    }
    
    return output;
  }
  
  /**
   * Handler for the SemanticMapClearSelectedFeature event
   * Clears the selected feature and resets the styles
   */
  private handleClearSelectedFeature = (event: Event<any>) => {
    console.log('Received clear selected feature event');
    // Reset the selected feature to null
    this.setState({ selectedFeature: null }, () => {
      // Apply normal styles to all features (remove any highlight)
      this.applyFeaturesFilteringFromControls();
    });
  };

  private setOverlaySwipe = (event: Event<any>) => {
    const newSwipeValue = event.data;
    this.swipeValue = newSwipeValue;
    this.map.render();
  };

  /**
   * Sets the visualization mode for the map
   * @param mode The visualization mode to set: 'normal', 'spyglass', 'measure', or 'swipe'
   */
  private setVisualizationMode = (mode: string): void => {
    const currentMode = this.state.overlayVisualization;
    
    console.log(`Changing visualization mode from ${currentMode} to ${mode}`);
    
    // If we're already in this mode, do nothing
    if (currentMode === mode) {
      return;
    }
    
    // First, clean up the current mode
    this.cleanupVisualizationMode(currentMode);
    
    // Then set the new mode
    this.setOverlayVisualization(mode, this.state.maskIndex);
    
    // Notify controls about the mode change
    if (this.state.registeredControls.length > 0) {
      trigger({
        eventType: SemanticMapControlsOverlayVisualization,
        source: this.props.id,
        data: mode,
        targets: this.state.registeredControls,
      });
    }
  };
  
  private setOverlayVisualizationFromEvent = (event: Event<any>) => {
    const newMode = event.data;
    this.setVisualizationMode(newMode);
  };
  
  /**
   * Clean up a specific visualization mode
   */
  private cleanupVisualizationMode(mode: string) {
    console.log(`Cleaning up visualization mode: ${mode}`);
    
    // Clean up based on the mode
    switch (mode) {
      case 'measure':
        this.deactivateMeasurementTool();
        break;
      case 'swipe':
        this.removeSwipeControls();
        break;
      case 'spyglass':
        // No specific cleanup needed for spyglass beyond resetAllVisualizations
        break;
    }
    
    // Reset all visualizations to ensure clean state
    this.resetAllVisualizations();
  }

  private resetVisualization(layerIndex: number) {
    const overlayLayer = this.state.mapLayers[layerIndex];
    overlayLayer.un('prerender', this.spyglassFunction);
    overlayLayer.un('prerender', this.swipeFunction);
    overlayLayer.un('postrender', function (event) {
      const ctx = event.context;
      ctx.restore();
    });
  }

  private resetAllVisualizations() {
    this.state.mapLayers.forEach((tilesLayer, index) => {
      this.resetVisualization(index);
    });
    
    // Remove swipe button and line when changing visualization mode
    this.removeSwipeControls();
  }
  
  private removeSwipeControls() {
    const mapElement = findDOMNode(this.refs[MAP_REF]) as HTMLElement;
    if (!mapElement) return;
    
    // Remove swipe button if it exists
    const swipeButton = mapElement.querySelector('.swipe-button');
    if (swipeButton) {
      swipeButton.remove();
    }
    
    // Remove swipe line if it exists
    const swipeLine = mapElement.querySelector('.swipe-line');
    if (swipeLine) {
      swipeLine.remove();
    }
    
    // Reset swipe value to default
    this.swipeValue = 50;
  }

  private setOverlayVisualization(overlayVisualization: string, layerIndex: number) {
    // Get the first two visible layers
    const visibleLayers = this.state.mapLayers.filter(layer => layer.get('visible')).slice(0, 2);
    
    // Only proceed if we have at least two visible layers
    if (visibleLayers.length < 2 && overlayVisualization !== 'normal' && overlayVisualization !== 'measure') {
      console.warn('Visualization mode requires at least two visible layers');
      return;
    }
    
    // The top layer (index 0) will be the one that gets the visualization effect
    const overlayLayer = visibleLayers.length > 0 ? visibleLayers[0] : null;

    // Remove ESC key listener if we're going to normal mode
    if (overlayVisualization === 'normal' && this.escKeyListener) {
      document.removeEventListener('keydown', this.escKeyListener);
      this.escKeyListener = null;
    }

    this.setState(
      {
        overlayVisualization: overlayVisualization,
      },
      () => {
        switch (overlayVisualization) {
          case 'normal': {
            this.resetAllVisualizations();
            this.map.render();
            break;
          }
          case 'spyglass': {
            this.resetAllVisualizations();
            overlayLayer.on('prerender', this.spyglassFunction);
            overlayLayer.on('postrender', function (event) {
              event.context.restore();
            });
            // Add ESC key listener for spyglass mode
            if (!this.escKeyListener) {
              this.addEscapeKeyListener();
            }
            this.map.render();
            break;
          }
          case 'swipe': {
            this.resetAllVisualizations();
            overlayLayer.on('prerender', this.swipeFunction);
            overlayLayer.on('postrender', function (event) {
              event.context.restore();
            });
            // Add ESC key listener for swipe mode
            if (!this.escKeyListener) {
              this.addEscapeKeyListener();
            }
            this.map.render();
            break;
          }
        }
      }
    );
  }

  // Variables for spyglass functionality
  private spyglassRadius = 120; // Default radius
  private isResizingSpyglass = false;
  private spyglassResizeStartY = 0;
  private spyglassResizeStartRadius = 0;
  private spyglassFixedPosition = null; // Store fixed position during resize
  
  private spyglassFunction = (event) => {
    const ctx = event.context;
    ctx.save();
    ctx.beginPath();
    if (this.mousePosition) {
      const pixel = getRenderPixel(event, this.mousePosition);
      const offset = getRenderPixel(event, [this.mousePosition[0] + this.spyglassRadius, this.mousePosition[1]]);
      const canvasRadius = Math.sqrt(Math.pow(offset[0] - pixel[0], 2) + Math.pow(offset[1] - pixel[1], 2));
      ctx.arc(pixel[0], pixel[1], canvasRadius, 0, 2 * Math.PI);
      ctx.lineWidth = (2 * canvasRadius) / this.spyglassRadius;
      ctx.strokeStyle = 'rgba(102,0,0,0.5)';
      ctx.stroke();
    }
    ctx.clip();
  };

  private swipeFunction = (event) => {
    const ctx = event.context;
    const mapSize = this.map.getSize();
    const width = mapSize[0] * (this.swipeValue / 100);
    const tl = getRenderPixel(event, [0, 0]);
    const tr = getRenderPixel(event, [width, 0]);
    const bl = getRenderPixel(event, [0, mapSize[1]]);
    const br = getRenderPixel(event, [width, mapSize[1]]);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl[0], tl[1]);
    ctx.lineTo(bl[0], bl[1]);
    ctx.lineTo(br[0], br[1]);
    ctx.lineTo(tr[0], tr[1]);
    ctx.closePath();
    ctx.clip();
    
    // Create or update swipe button if it doesn't exist
    this.createOrUpdateSwipeButton(width);
  };
  
  // Create or update the swipe button
  private createOrUpdateSwipeButton(xPosition: number) {
    const mapElement = findDOMNode(this.refs[MAP_REF]) as HTMLElement;
    if (!mapElement) return;
    
    // Check if button already exists
    let swipeButton = mapElement.querySelector('.swipe-button') as HTMLDivElement;
    let swipeLine = mapElement.querySelector('.swipe-line') as HTMLDivElement;
    
    // Create button if it doesn't exist
    if (!swipeButton) {
      // Create vertical line first (so it appears behind the button)
      swipeLine = document.createElement('div');
      swipeLine.className = 'swipe-line';
      swipeLine.style.position = 'absolute';
      swipeLine.style.width = '1px';
      swipeLine.style.height = '100%';
      swipeLine.style.top = '0';
      swipeLine.style.backgroundColor = '#999';
      swipeLine.style.zIndex = '999';
      mapElement.appendChild(swipeLine);
      
      // Create the button
      swipeButton = document.createElement('div');
      swipeButton.className = 'swipe-button';
      swipeButton.style.position = 'absolute';
      swipeButton.style.width = '30px';
      swipeButton.style.height = '30px';
      swipeButton.style.backgroundColor = 'white';
      swipeButton.style.borderRadius = '50%';
      swipeButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
      swipeButton.style.cursor = 'grab';
      swipeButton.style.zIndex = '1000';
      swipeButton.style.display = 'flex';
      swipeButton.style.alignItems = 'center';
      swipeButton.style.justifyContent = 'center';
      swipeButton.style.userSelect = 'none';
      swipeButton.style.touchAction = 'none';
      swipeButton.style.border = '2px solid #3498db';
      
      // Add inner circle
      const innerCircle = document.createElement('div');
      innerCircle.style.width = '10px';
      innerCircle.style.height = '10px';
      innerCircle.style.backgroundColor = '#3498db';
      innerCircle.style.borderRadius = '50%';
      swipeButton.appendChild(innerCircle);
      
      // Add event listeners for dragging
      swipeButton.addEventListener('mousedown', this.handleSwipeButtonMouseDown);
      swipeButton.addEventListener('touchstart', this.handleSwipeButtonTouchStart, { passive: false });
      
      // Add to map
      mapElement.appendChild(swipeButton);
    }
    
    // Position the button and line at the swipe position
    swipeButton.style.left = `${xPosition}px`;
    swipeButton.style.top = '50%';
    swipeButton.style.transform = 'translate(-50%, -50%)';
    
    // Update line position
    if (swipeLine) {
      swipeLine.style.left = `${xPosition}px`;
      swipeLine.style.transform = 'translateX(-50%)';
    }
  }
  
  // Mouse event handlers for swipe button
  private handleSwipeButtonMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      
      const mapElement = findDOMNode(this.refs[MAP_REF]) as HTMLElement;
      if (!mapElement) return;
      
      const mapRect = mapElement.getBoundingClientRect();
      const mapWidth = mapRect.width;
      
      // Calculate new position relative to map
      let newX = moveEvent.clientX - mapRect.left;
      
      // Constrain to map bounds
      newX = Math.max(0, Math.min(mapWidth, newX));
      
      // Calculate new swipe value (0-100)
      const newSwipeValue = (newX / mapWidth) * 100;
      
      // Update swipe value directly
      this.swipeValue = newSwipeValue;
      this.map.render();
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Touch event handlers for swipe button
  private handleSwipeButtonTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      moveEvent.preventDefault();
      
      const mapElement = findDOMNode(this.refs[MAP_REF]) as HTMLElement;
      if (!mapElement) return;
      
      const mapRect = mapElement.getBoundingClientRect();
      const mapWidth = mapRect.width;
      
      // Calculate new position relative to map
      let newX = moveEvent.touches[0].clientX - mapRect.left;
      
      // Constrain to map bounds
      newX = Math.max(0, Math.min(mapWidth, newX));
      
      // Calculate new swipe value (0-100)
      const newSwipeValue = (newX / mapWidth) * 100;
      
      // Update swipe value directly
      this.swipeValue = newSwipeValue;
      this.map.render();
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // /** EDITING MODE */

  // initEditingModeInteractions = () => {
  //   this.source = new VectorSource();
  //   this.vector = new VectorLayer({
  //     source: this.source,
  //     style: new Style({
  //       fill: new Fill({
  //         color: 'rgba(255, 255, 255, 0.2)',
  //       }),
  //       stroke: new Stroke({
  //         color: '#ffcc33',
  //         width: 2,
  //       }),
  //       image: new CircleStyle({
  //         radius: 7,
  //         fill: new Fill({
  //           color: '#ffcc33',
  //         }),
  //       }),
  //     }),
  //   });

  //   this.modify = new Modify({ source: this.source });

  //   this.draw = new Draw({
  //     source: this.source,
  //     type: GeometryType.POLYGON,
  //   });

  //   this.snap = new Snap({ source: this.source });
  // };

  // private handleEditingMode = (event: Event<any>) => {
  //   if (event.data) this.setEditingMode();
  //   else this.revokeEditingMode();
  // };

  // private setEditingMode = () => {
  //   this.map.addInteraction(this.draw);
  //   this.map.addInteraction(this.snap);

  //   // Get feature just drawn
  //   this.draw.on('drawend', (event) => {
  //     console.log(event.feature);
  //   });
  // };

  // private revokeEditingMode = () => {
  //   this.map.removeInteraction(this.draw);
  //   this.map.removeInteraction(this.snap);
  // };
}

export class AnnotateControl extends Control {
  editingMode: boolean;

  constructor() {
    super({});

    // default editing mode
    //this.editingMode = false;

    // Create edit button
    //const button = document.createElement('button');
    //button.type = 'button';
    //button.className = 'ol-control editButton';
    //button.innerHTML = 'E';

    //
    const element = document.createElement('div');
    element.className = 'ol-feature ol-control';
    //element.appendChild(button);
    Control.call(this, {
      element: element,
    });
    //button.addEventListener('click', () => this.click());
  }
  /*
  click() {
    this.editingMode = !this.editingMode;

    trigger({
      eventType: SemanticMapToggleEditingMode,
      source: 'Annotate-button',
      data: this.editingMode,
    });
  }
  */
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

  return function (feature: Feature): Style {
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
    // Return the first style instead of an array
    return style;
  };
}

function getFeatureStyle(geometry: Geometry, color: string | undefined): Style {
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
    // For geometry collections, use the first geometry's style
    const geometries = geometry.getGeometries();
    if (geometries.length > 0) {
      return getFeatureStyle(geometries[0], color);
    }
    // Fallback if no geometries
    return new Style({
      fill: new Fill({ color: color || 'rgba(255, 255, 255, 0.5)' }),
      stroke: new Stroke({ color: color || 'rgba(202, 255, 36, .3)', width: 1.25 }),
    });
  }
  return new Style({
    geometry,
    text: new Text({
      font: '12px Calibri,sans-serif',
      overflow: true,
      fill: new Fill({
        color: '#000',
      }),
      stroke: new Stroke({
        color: '#fff',
        width: 2,
      }),
    }),
    fill: new Fill({ color: color || 'rgba(255, 255, 255, 0.5)' }),
    stroke: new Stroke({
      color: color || 'rgba(202, 255, 36, .3)',
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

export default SemanticMapAdvanced;
