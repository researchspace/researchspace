import * as React from 'react';
import { CSSProperties, createElement } from 'react';
import { Component, ComponentContext } from 'platform/api/components';
import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import * as TemplateService from 'platform/api/services/template';
import { TemplateItem } from 'platform/components/ui/template';
import * as styles from './SemanticMapControls.scss';
import {
  SemanticMapControlsOverlayVisualization,
  SemanticMapControlsOverlaySwipe,
  SemanticMapSendMapLayers,
  SemanticMapControlsSyncFromMap,
  SemanticMapControlsSendMapLayersToMap,
  SemanticMapControlsSendMaskIndexToMap,
  SemanticMapControlsSendFeaturesLabelToMap,
  SemanticMapControlsSendFeaturesColorTaxonomyToMap,
  SemanticMapControlsSendGroupColorsAssociationsToMap,
  SemanticMapControlsSendToggle3d,
  SemanticMapControlsSendYear,
  SemanticMapControlsSendVectorLevels,
  SemanticMapControlsRegister,
  SemanticMapControlsUnregister,
} from './SemanticMapControlsEvents';
import { SemanticMapRequestControlsRegistration, SemanticMapSendSelectedFeature, SemanticMapClearSelectedFeature } from './SemanticMapEvents';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { CirclePicker, GithubPicker, SwatchesPicker } from 'react-color';
import reactCSS from 'reactcss';
import _ = require('lodash');
import VectorLayer from 'ol/layer/Vector';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const sliderbar: CSSProperties = {
  width: '100%',
};

interface Filters {
  feature: boolean;
  overlay: boolean;
  basemap: boolean;
}

interface Timeline {
  mode: 'marked' | 'normal';
  min: number;
  max: number;
  default: number;
  locked?: boolean;
  tour?: boolean;
}

interface State {
  overlayOpacity?: number;
  swipeValue?: number;
  overlayVisualization?: string;
  loading?: boolean;
  color: any;
  setColor: any;
  mapLayers: Array<any>;
  maskIndex: number;
  filters: Filters;
  selectedFeaturesLabel: string;
  featuresColorTaxonomy: string;
  featuresColorGroups: string[];
  groupColorAssociations: {};
  displayColorPicker: {};
  year: number;
  yearMarks: number[];
  registeredMap: string;
  groupDisabled: { [group: string]: boolean };
  selectedFeature?: any;
  activePanel: string | null; // Track which panel is currently active
  isPlaying?: boolean; // For timeline animation
  animationInterval?: number; // For timeline animation
}

interface Props {
  targetMapId: string;
  id: string;
  featuresTaxonomies: string;
  featuresColorTaxonomies: string;
  featuresOptionsEnabled: boolean;
  filtersInitialization: Filters;
  showFilters?: boolean;
  timeline: Timeline;
  featuresColorsPalette?: string;
  /**
   * When true, disables timeline interaction
   */
  locked?: boolean;
  /**
   * When true, enables auto-play functionality
   */
  tour?: boolean;
  /**
   * Template reference to use for rendering the component.
   * Should be a handlebars expression like {{> templateName}}
   */
  renderTemplate?: string;
  /**
   * Fallback template to use when renderTemplate is not provided or cannot be resolved.
   */
  fallbackTemplate?: string;
  /**
   * Children elements, which may include template elements
   */
  children?: React.ReactNode;
  /**
   * Template for historical maps panel
   */
  historicalMapTemplate?: string;
  /**
   * Template for base maps panel
   */
  baseMapTemplate?: string;
  /**
   * Template for buildings panel
   */
  buildingsTemplate?: string;
}

export class SemanticMapControls extends Component<Props, State> {
  private cancelation = new Cancellation();
  private featuresTaxonomies = [];
  private featuresColorTaxonomies = [];
  private defaultFeaturesColor = 'rgba(200,50,50,0.5)';
  //TODO: fix optionals
  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
      overlayOpacity: 1,
      swipeValue: 50,
      overlayVisualization: 'normal',
      color: 'rgba(200,50,50,0.5)',
      setColor: 'rgba(200,50,50,0.5)',
      mapLayers: [],
      maskIndex: -1,
      groupDisabled: {},
      filters: this.props.filtersInitialization
        ? this.props.filtersInitialization
        : { feature: true, overlay: true, basemap: true },
      selectedFeaturesLabel: '',
      featuresColorTaxonomy: this.props.featuresColorTaxonomies ? this.props.featuresColorTaxonomies.split(',')[0] : '',
      featuresColorGroups: [],
      displayColorPicker: {},
      groupColorAssociations: {},
      year: this.props.timeline ? this.props.timeline.default : new Date().getFullYear(), // Todo fix optional timeline props.
      yearMarks: [],
      registeredMap: '',
      activePanel: null,
    };
    this.toggleGroupDisabled = this.toggleGroupDisabled.bind(this);
    this.handleSelectedLabelChange = this.handleSelectedLabelChange.bind(this);
    this.handleColorTaxonomyChange = this.handleColorTaxonomyChange.bind(this);
    this.handleColorPickerChange = this.handleColorPickerChange.bind(this);
    this.handleGenerateColorPalette = this.handleGenerateColorPalette.bind(this);
    this.handleRestartColorPalette = this.handleRestartColorPalette.bind(this);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapSendMapLayers,
        })
      )
      .onValue(this.receiveMapLayers);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapRequestControlsRegistration,
        })
      )
      .onValue(this.handleRequestRegistration);

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapSendSelectedFeature,
          target: this.props.id,
        })
      )
      .onValue(this.handleSelectedFeature);

    this.onDragEnd = this.onDragEnd.bind(this);
  }

  /** REACT COMPONENT LOGIC */
  public componentDidMount() {
    //this.triggerRegisterToMap();
    //this.triggerSyncFromMap();
    //TODO: the map will send the first levels autonomously after the registration
    this.processTemplateChildren();

    // Add event listener for the feature-close-clicked custom event
    document.addEventListener('feature-close-clicked', this.clearSelectedFeature);

    // Start animation if tour is enabled
    if (this.props.timeline && this.props.timeline.tour) {
      // Use setTimeout to ensure the component is fully mounted
      setTimeout(() => {
        this.handleTimelinePlay();
      }, 1000);
    }
  }

  /**
   * Process template children and register them as partials
   */
  private processTemplateChildren() {
    // Create a template scope builder
    const builder = TemplateService.TemplateScope.builder();
    let hasTemplates = false;

    // Extract templates from children
    React.Children.forEach(this.props.children, (child) => {
      if (React.isValidElement(child) && child.type === 'template') {
        const id = child.props.id;
        const content = child.props.children;
        if (id && content) {
          // Register the template content as a partial
          console.log(`Registering template with id: ${id}`);
          builder.registerPartial(id, content);
          hasTemplates = true;
        }
      }
    });

    // If we found templates, build a new template scope and update the component's props
    if (hasTemplates) {
      const scope = builder.build();
      // We can't directly modify props, but we can use the existing markupTemplateScope
      // property that's already part of the component system
      (this.props as any).markupTemplateScope = scope;
    }
  }

  /**
   * Get template context for rendering
   */
  private getTemplateContext() {
    // Return component state and props as context for the template
    return {
      ...this.state,
      ...this.props,
      // Ensure selectedFeature is explicitly included in the context
      selectedFeature: this.state.selectedFeature,
    };
  }

  public componentWillMount() {
    if (this.props.featuresTaxonomies) {
      this.featuresTaxonomies = this.props.featuresTaxonomies.split(',');
    }
    if (this.props.featuresColorTaxonomies) {
      this.featuresColorTaxonomies = this.props.featuresColorTaxonomies.split(',');
    }
    console.log('Filters initialization: ', this.props.filtersInitialization);
  }

  public componentWillUnmount() {
    console.log('Will unmount: ', this.props.id);
    this.triggerUnregisterToMap();

    // Remove event listener when component unmounts
    document.removeEventListener('feature-close-clicked', this.clearSelectedFeature);
  }

  public componentDidUpdate(prevProps, prevState) {
    // TODO: if we care about colors (i.e. historical maps controls don't)
    if (this.state.groupColorAssociations !== prevState.groupColorAssociations) {
      console.log('Groupcolors changed. Sending...');
      this.triggerSendFeaturesColorsAssociationsToMap();
    } else {
      // console.log("Groupcolors NOT changed.")
    }
  }

  /** EVENTS */

  private handleRequestRegistration = (event: any) => {
    if (this.state.registeredMap == '') {
      this.setState(
        {
          registeredMap: event.data,
        },
        () => {
          console.log('Controls', this.props.id, 'registered map', this.state.registeredMap);
          //TODO: trigger registrationconfirmation
          this.triggerRegisterToMap();
        }
      );
    } else {
      // console.warn("Controls", this.props.id, "already has a registered map")
    }
  };

  private handleSelectedFeature = (event: any) => {
    console.log('Received selected feature:', event.data);
    this.setState(
      {
        selectedFeature: event.data,
      },
      () => {
        // If we have a renderTemplate, we need to re-render the template with the new selectedFeature
        if (this.props.renderTemplate) {
          this.forceUpdate();
        }
      }
    );
  };

  private clearSelectedFeature = () => {
    this.setState(
      {
        selectedFeature: null,
      },
      () => {
        // If we have a renderTemplate, we need to re-render the template with the null selectedFeature
        if (this.props.renderTemplate) {
          this.forceUpdate();
        }
        
        // Trigger event to clear the selected feature style on the map
        trigger({
          eventType: SemanticMapClearSelectedFeature,
          source: this.props.id,
          targets: [this.props.targetMapId],
        });
        
        console.log('Cleared selected feature and triggered style reset');
      }
    );
  };

  private receiveMapLayers = (event: any) => {
    this.setState(
      {
        mapLayers: event.data,
      },
      () => {
        console.log("Map Controls: '" + this.props.id + "': layers synced from map '" + this.props.targetMapId + "'");
        console.log(event.data);
        if (this.props.timeline) {
          if (this.props.timeline.mode == 'marked') {
            this.extractYearMarks(this.getAllVectorLayers());
          }
        }
        this.triggerSendYear();
        if (this.props.featuresTaxonomies) {
          this.setFeaturesColorTaxonomy();
        }
      }
    );
  };

  private triggerRegisterToMap() {
    console.log('Registration request confirmed. Registering ' + this.props.id + ' to ' + this.props.targetMapId);
    trigger({
      eventType: SemanticMapControlsRegister,
      source: this.props.id,
      targets: [this.props.targetMapId],
    });
  }

  private triggerUnregisterToMap() {
    console.log('Asking unregistering of controls' + this.props.id + ' to ' + this.props.targetMapId);
    trigger({
      eventType: SemanticMapControlsUnregister,
      source: this.props.id,
      targets: [this.props.targetMapId],
    });
  }

  // TODO: we're trying to avoid using this
  private triggerSyncFromMap() {
    console.log('Syncing ' + this.props.id + ' from ' + this.props.targetMapId);
    trigger({
      eventType: SemanticMapControlsSyncFromMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
    });
  }

  private triggerSendLayers() {
    trigger({
      eventType: SemanticMapControlsSendMapLayersToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.mapLayers,
    });
  }

  private triggerSendYear() {
    const year = this.state.year;
    console.log('Sending year ' + year + ' to map.');
    trigger({
      eventType: SemanticMapControlsSendYear,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: year.toString() + '-01-01',
    });
  }

  private triggerSendToggle3d() {
    console.log('fired 3d');
    trigger({
      eventType: SemanticMapControlsSendToggle3d,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: 'toggle',
    });
  }

  private triggerSendFeaturesColorsAssociationsToMap() {
    // Construct a new object with updated alpha values based on disabled state
    let finalAssociations = {};
    for (let group in this.state.groupColorAssociations) {
      finalAssociations[group] = this.getRgbaString(group);
    }

    trigger({
      eventType: SemanticMapControlsSendGroupColorsAssociationsToMap,
      source: this.props.id,
      data: finalAssociations,
      targets: [this.props.targetMapId],
    });
  }

  private triggerSendSwipeValue = (swipeValue: number) => {
    trigger({
      eventType: SemanticMapControlsOverlaySwipe,
      source: this.props.id,
      data: swipeValue,
      targets: [this.props.targetMapId],
    });
  };

  private triggerSendFeaturesLabelToMap() {
    console.log('SENDING FEATURE TAXONOMY');
    console.log(this.state.selectedFeaturesLabel);
    trigger({
      eventType: SemanticMapControlsSendFeaturesLabelToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.selectedFeaturesLabel,
    });
  }

  private triggerSendFeaturesColorTaxonomy() {
    console.log('%cSENDING FEATURE COLOR TAXONOMY', 'color: green');
    console.log(this.state.featuresColorTaxonomy);
    trigger({
      eventType: SemanticMapControlsSendFeaturesColorTaxonomyToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.featuresColorTaxonomy,
    });
  }

  private triggerVisualization = (visualization: string) => {
    trigger({
      eventType: SemanticMapControlsOverlayVisualization,
      source: this.props.id,
      data: visualization,
      targets: [this.props.targetMapId],
    });
    switch (visualization) {
      case 'swipe': {
        this.triggerSendSwipeValue(this.state.swipeValue);
      }
    }
  };

  private triggerSendMaskIndexToMap(index: number) {
    trigger({
      eventType: SemanticMapControlsSendMaskIndexToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: index,
    });
  }

  /** UI  */

  handleSelectedLabelChange(e) {
    this.setState(
      {
        selectedFeaturesLabel: e.target.value,
      },
      () => {
        this.triggerSendFeaturesLabelToMap();
      }
    );
  }

  handleColorTaxonomyChange(e) {
    this.setState(
      {
        featuresColorTaxonomy: e.target.value,
      },
      () => {
        this.setFeaturesColorTaxonomy();
      }
    );
  }

  handleColorPickerChange(color, group) {
    console.log('color object');
    console.log(color);
    let color_rgba = color.rgb;
    const rgba_string = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + '0.3' + ')';
    console.log(rgba_string + ' set for Group: ' + group);
    let groupColorAssociationsClone = JSON.stringify(this.state.groupColorAssociations);
    let groupColorAssociationsCloneObject = JSON.parse(groupColorAssociationsClone);
    groupColorAssociationsCloneObject[group] = color;
    this.setState(
      {
        groupColorAssociations: groupColorAssociationsCloneObject,
      },
      () => {
        console.log(this.state.groupColorAssociations);
      }
    );
  }

  private onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const mapLayers = this.reorder(this.state.mapLayers, result.source.index, result.destination.index);

    this.setState(
      {
        mapLayers,
        // Reset visualization mode to normal when layers are reordered
        overlayVisualization: 'normal'
      },
      () => {
        this.triggerSendLayers();
        
        // Trigger normal visualization mode
        this.triggerVisualization('normal');
      }
    );
  };

  private setMaskIndex(index: number) {
    this.setState(
      {
        maskIndex: index,
        overlayVisualization: 'normal',
      },
      () => {
        this.triggerVisualization(this.state.overlayVisualization);
        this.triggerSendMaskIndexToMap(index);
      }
    );
  }

  handleColorpickerClick = (group: string) => {
    let displayColorPickerClone = this.state.displayColorPicker;
    displayColorPickerClone[group] = !displayColorPickerClone[group];
    this.setState({ displayColorPicker: displayColorPickerClone }, () => {
      console.log('displaypickerclone');
    });
  };

  handleClose = () => {
    var displayColorPickerClone = this.state.displayColorPicker;
    for (let key in displayColorPickerClone) {
      displayColorPickerClone[key] = false;
    }
    this.setState({ displayColorPicker: displayColorPickerClone });
  };

  /**
   * Toggle a panel open/closed
   */
  private togglePanel = (panelName: string) => {
    this.setState((prevState) => ({
      activePanel: prevState.activePanel === panelName ? null : panelName,
    }));
  };
  
  /**
   * Toggle visualization mode on/off
   */
  private toggleVisualizationMode = (mode: string) => {
    this.setState((prevState) => {
      // If the mode is already active, turn it off (set to 'normal')
      // Otherwise, activate the requested mode
      const newMode = prevState.overlayVisualization === mode ? 'normal' : mode;
      return { overlayVisualization: newMode };
    }, () => {
      // Trigger the visualization change event
      this.triggerVisualization(this.state.overlayVisualization);
      
      // If swipe mode is activated, also send the swipe value
      if (this.state.overlayVisualization === 'swipe') {
        this.triggerSendSwipeValue(this.state.swipeValue);
      }
    });
  };

  /**
   * Render a template with fallback
   */
  private renderTemplate(templateName: string, fallbackContent: string = '') {
    // If templateName is a URL or path, use it directly
    // Otherwise, check if it's a handlebars expression
    const source = templateName || fallbackContent;

    // Log the template source for debugging
    console.log(`Rendering template with source: ${source}`);

    return createElement(TemplateItem, {
      template: {
        source: source,
        options: this.getTemplateContext(),
      },
    });
  }

  public render() {
    // Get template sources
    const historicalMapTemplate = this.props.historicalMapTemplate || '';

    const templateRef = this.props.renderTemplate;
    // Only create the template element if there's a selected feature
    const templateElement = this.state.selectedFeature
      ? createElement(TemplateItem, {
          template: {
            source: templateRef,
            options: this.getTemplateContext(),
          },
        })
      : null;

    const stylesSwatch = reactCSS({
      default: {
        swatch: {
          padding: '2px',
          background: '#fff',
          borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
          display: 'inline-block',
          cursor: 'pointer',
        },
      },
    });

    return (
      <React.Fragment>
        <div className={styles.mapControlsContainer}>
        {/* Sidebar with buttons */}
        <div className={styles.mapControlsSidebar}>
          {/* Historical Maps Button */}
          <button
            className={`${styles.mapControlsButton} ${
              this.state.activePanel === 'historical' ? styles.mapControlsButtonActive : ''
            }`}
            onClick={() => this.togglePanel('historical')}
            title="Historical Maps"
          >
            <i className="fa fa-map" style={{ fontSize: '24px' }}></i>
          </button>

          {/* Base Maps Button */}
          <button
            className={`${styles.mapControlsButton} ${
              this.state.activePanel === 'base' ? styles.mapControlsButtonActive : ''
            }`}
            onClick={() => this.togglePanel('base')}
            title="Base Maps"
          >
            <i className="fa fa-globe" style={{ fontSize: '24px' }}></i>
          </button>

          {/* Style Button */}
          <button
            className={`${styles.mapControlsButton} ${
              this.state.activePanel === 'buildings' ? styles.mapControlsButtonActive : ''
            }`}
            onClick={() => this.togglePanel('buildings')}
            title="Style"
          >
            <i className="fa fa-paint-brush" style={{ fontSize: '24px' }}></i>
          </button>
          
          {/* Spyglass Visualization Mode Button */}
          <button
            className={`${styles.mapControlsButton} ${
              this.state.overlayVisualization === 'spyglass' ? styles.mapControlsButtonActive : ''
            }`}
            onClick={() => this.toggleVisualizationMode('spyglass')}
            title="Spyglass Mode"
          >
            <i className="fa fa-search" style={{ fontSize: '24px' }}></i>
          </button>
          
          {/* Swipe Visualization Mode Button */}
          <button
            className={`${styles.mapControlsButton} ${
              this.state.overlayVisualization === 'swipe' ? styles.mapControlsButtonActive : ''
            }`}
            onClick={() => this.toggleVisualizationMode('swipe')}
            title="Swipe Mode"
          >
            <i className="fa fa-columns" style={{ fontSize: '24px' }}></i>
          </button>
        </div>

        {/* Panels */}
        {this.state.activePanel === 'historical' && (
          <div className={styles.mapControlsPanel}>
            {/* Standalone close button */}
            <button
              onClick={() => this.togglePanel('historical')}
              className={styles.mapControlsPanelCloseX}
              title="Close panel"
            >
              <i className="fa fa-times"></i>
            </button>

            <div className={styles.mapControlsPanelHeader}>
              <h3 className={styles.mapControlsPanelTitle}>Historical Maps</h3>
            </div>
            {this.renderTemplate(historicalMapTemplate, '<div>No historical map template specified</div>')}
          </div>
        )}

        {this.state.activePanel === 'base' && (
          <div className={styles.mapControlsPanel}>
            {/* Standalone close button */}
            <button
              onClick={() => this.togglePanel('base')}
              className={styles.mapControlsPanelCloseX}
              title="Close panel"
            >
              <i className="fa fa-times"></i>
            </button>

            <div className={styles.mapControlsPanelHeader}>
              <h3 className={styles.mapControlsPanelTitle}>Base Maps</h3>
            </div>

            <DragDropContext onDragEnd={this.onDragEnd}>
              <Droppable droppableId="droppable">
                {(provided, snapshot) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className={styles.layersContainer}>
                    {/* <h3 className={'mapLayersTitle'}>Map Layers</h3> */}
                    {this.props.showFilters && (
                      <div className={styles.mapLayersFiltersContainer}>
                        <label>Filter:</label>
                        <input
                          className={styles.mapLayersFilters}
                          name={'overlay-visualization'}
                          type={'checkbox'}
                          checked={this.state.filters.feature}
                          onChange={(event) => {
                            this.setState(
                              { filters: { ...this.state.filters, feature: event.target.checked } },
                              () => {}
                            );
                          }}
                        ></input>
                        <label className={styles.filtersLabel}>Features</label>
                        <input
                          className={styles.mapLayersFilters}
                          name={'overlay-visualization'}
                          type={'checkbox'}
                          checked={this.state.filters.overlay}
                          onChange={(event) => {
                            this.setState(
                              { filters: { ...this.state.filters, overlay: event.target.checked } },
                              () => {}
                            );
                          }}
                        ></input>
                        <label className={styles.filtersLabel}>Overlays</label>
                        <input
                          className={styles.mapLayersFilters}
                          name={'overlay-visualization'}
                          type={'checkbox'}
                          checked={this.state.filters.basemap}
                          onChange={(event) => {
                            this.setState(
                              { filters: { ...this.state.filters, basemap: event.target.checked } },
                              () => {}
                            );
                          }}
                        ></input>
                        <label className={styles.filtersLabel}>Basemaps</label>
                      </div>
                    )}
                    {/* <hr className={'mapControlsSeparator'} style={{ margin: '0px !important' }}></hr> */}
                    {this.state.mapLayers.map(
                      (mapLayer, index) =>
                        this.state.filters[mapLayer.get('level')] && (
                          <Draggable
                            key={mapLayer.get('identifier')}
                            draggableId={mapLayer.get('identifier')}
                            index={index}
                          >
                            {(provided, snapshot) => (
                                <div
                                  className={`${styles.draggableLayer} ${
                                    mapLayer.get('visible') ? 'visible' : 'nonvisible'
                                  } draggableLayerBorder`}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                >
                                  <div className="draggableLayerContainer">
                                    {/* Drag handle on the left */}
                                    <div className="dragHandleContainer" {...provided.dragHandleProps}>
                                      <i className="fa fa-bars"></i>
                                    </div>
                                    
                                    {/* Main content container */}
                                    <div className="layerContentContainer">
                                      {/* Thumbnail on the left */}
                                      <div className="thumbnailContainer">
                                        <img
                                          src={mapLayer.get('thumbnail')}
                                          className={`${styles.layerThumbnail} layerThumbnailStyle`}
                                        />
                                      </div>
                                      
                                      {/* Info container */}
                                      <div className="layerInfoContainer">
                                        {/* Date in top right */}
                                        <div className="layerDateContainer">
                                          <label className={styles.layerLabel}>{mapLayer.get('year')}</label>
                                        </div>
                                        
                                        {/* Title */}
                                        <div className="layerTitleContainer">
                                          <label className={styles.layerTitle}>{mapLayer.get('author')}</label>
                                        </div>
                                        
                                        {/* Slider at the bottom */}
                                        <div className="sliderContainer">
                                          <input
                                            type={'range'}
                                            className={styles.opacitySlider}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={mapLayer.get('opacity')}
                                            onChange={(event) => {
                                              const input = event.target as HTMLInputElement;
                                              const opacity = parseFloat(input.value);
                                              const capped = isNaN(opacity) ? 0.5 : Math.min(1, Math.max(0, opacity));
                                              this.setMapLayerProperty(mapLayer.get('identifier'), 'opacity', capped);
                                            }}
                                          ></input>
                                        </div>
                                      </div>
                                      
                                      {/* Toggle buttons on the right */}
                                      <div className="togglesColumnRightStyle">
                                        {mapLayer.get('visible') && (
                                          <i
                                            className="fa fa-toggle-on layerCheck cursorPointer"
                                            onClick={() => {
                                              this.setMapLayerProperty(mapLayer.get('identifier'), 'visible', false);
                                            }}
                                          ></i>
                                        )}
                                        {!mapLayer.get('visible') && (
                                          <i
                                            className="fa fa-toggle-off layerCheck cursorPointer"
                                            onClick={() => {
                                              this.setMapLayerProperty(mapLayer.get('identifier'), 'visible', true);
                                            }}
                                          ></i>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Visualization mode container */}
                                  {this.state.maskIndex == index && (
                                    <div id={'visualizationModeContainer'}>
                                      <input
                                        className="visualizationModeRadio"
                                        name={'overlay-visualization'}
                                        type={'radio'}
                                        value={'normal'}
                                        checked={this.state.overlayVisualization === 'normal'}
                                        onChange={(event) => {
                                          this.setState({ overlayVisualization: event.target.value }, () =>
                                            this.triggerVisualization(this.state.overlayVisualization)
                                          );
                                        }}
                                      ></input>
                                      <label style={{ margin: '2px' }}>Normal</label>
                                      <input
                                        className="visualizationModeRadio"
                                        name={'overlay-visualization'}
                                        type={'radio'}
                                        value={'spyglass'}
                                        checked={this.state.overlayVisualization === 'spyglass'}
                                        onChange={(event) => {
                                          this.setState({ overlayVisualization: event.target.value }, () =>
                                            this.triggerVisualization(this.state.overlayVisualization)
                                          );
                                        }}
                                      ></input>
                                      <label style={{ margin: '2px' }}>Spyglass</label>
                                      <input
                                        className="visualizationModeRadio"
                                        name={'overlay-visualization'}
                                        type={'radio'}
                                        value={'swipe'}
                                        checked={this.state.overlayVisualization === 'swipe'}
                                        onChange={(event) => {
                                          this.setState({ overlayVisualization: event.target.value }, () =>
                                            this.triggerVisualization(this.state.overlayVisualization)
                                          );
                                        }}
                                      ></input>
                                      <label style={{ margin: '2px' }}>Swipe</label>
                                      {/* Swipe slider removed from here - now rendered as a button in SemanticMapAdvanced */}
                                    </div>
                                  )}
                                </div>
                            )}
                          </Draggable>
                        )
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
        {this.state.activePanel === 'buildings' && (
          <div className={styles.mapControlsPanel}>
            {/* Standalone close button */}
            <button
              onClick={() => this.togglePanel('buildings')}
              className={styles.mapControlsPanelCloseX}
              title="Close panel"
            >
              <i className="fa fa-times"></i>
            </button>

            <div className={styles.mapControlsPanelHeader}>
              <h3 className={styles.mapControlsPanelTitle}>Style</h3>
            </div>

            {this.props.featuresOptionsEnabled && (
              <div className={styles.featuresOptionsContainer}>
                <div className={styles.mapLayersFiltersContainer}>
                  <div className={styles.featuresOptionsDiv}>
                    <label style={{ marginRight: '10px', userSelect: 'none' }}>Label by: </label>
                    <select name="featuresLabelList" id="featuresLabelList" onChange={this.handleSelectedLabelChange}>
                      <option key={'none'} value={'none'}>
                        None
                      </option>
                      {this.featuresTaxonomies.map((taxonomy) => (
                        <option key={taxonomy} value={taxonomy}>
                          {this.capitalizeFirstLetter(taxonomy)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.featuresOptionsDiv}>
                    <label style={{ marginRight: '10px', userSelect: 'none' }}>Color by: </label>
                    <select
                      name="featuresColorsList"
                      style={{ width: '100px' }}
                      id="featuresColorsList"
                      onChange={this.handleColorTaxonomyChange}
                    >
                      {this.featuresColorTaxonomies.map((taxonomy) => (
                        <option key={taxonomy} value={taxonomy}>
                          {this.capitalizeFirstLetter(taxonomy)}
                        </option>
                      ))}
                    </select>
                    <OverlayTrigger
                      key={'random'}
                      placement={'top'}
                      overlay={<Tooltip id={'tooltip-right'}>Generate a random color palette.</Tooltip>}
                    >
                      <i
                        className={'fa fa-refresh'}
                        style={{ display: 'inline-block', cursor: 'pointer', marginLeft: '10px', userSelect: 'none' }}
                        onClick={this.handleGenerateColorPalette}
                      ></i>
                    </OverlayTrigger>
                    <OverlayTrigger
                      key={'reset'}
                      placement={'top'}
                      overlay={<Tooltip id={'tooltip-right'}>Restart palette to a single color.</Tooltip>}
                    >
                      <i
                        className={'fa fa-paint-brush'}
                        style={{ display: 'inline-block', cursor: 'pointer', marginLeft: '10px', userSelect: 'none' }}
                        onClick={this.handleRestartColorPalette}
                      ></i>
                    </OverlayTrigger>
                    <div className={styles.colorsLegend}>
                      <div style={{ marginBottom: '10px' }}>
                        <button onClick={() => this.enableAllGroups()}>
                          <i className="fa fa-check-circle" style={{ marginRight: '5px' }}></i>
                          Select All
                        </button>
                        <button onClick={() => this.disableAllGroups()} style={{ marginLeft: '10px' }}>
                          <i className="fa fa-times-circle" style={{ marginRight: '5px' }}></i>
                          Clear All
                        </button>
                      </div>
                      {this.state.featuresColorGroups.map((group, index) => {
                        const isDisabled = this.state.groupDisabled[group];
                        return (
                          <div
                            key={group}
                            id={'color-' + group}
                            style={{ display: 'flex', alignItems: 'center', margin: '5px' }}
                          >
                            <div style={stylesSwatch.swatch} onClick={() => this.handleColorpickerClick(group)}>
                              <div
                                style={{
                                  width: '15px',
                                  height: '15px',
                                  borderRadius: '50%',
                                  backgroundColor: this.getRgbaString(group, true),
                                  opacity: this.state.groupDisabled[group] ? 0.3 : 1, // lower opacity when disabled
                                  position: 'relative',
                                }}
                              >
                                {this.state.groupDisabled[group] && false && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      width: '150%', // full width of the circle
                                      height: '1px', // thickness of the line
                                      backgroundColor: 'black', // or any color you prefer
                                      transform: 'translate(-50%, -50%) rotate(45deg)',
                                    }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Clicking the label toggles disabled */}
                            <label
                              style={{
                                marginLeft: '5px',
                                marginBottom: '0px',
                                cursor: 'pointer',
                                opacity: isDisabled ? 0.3 : 1,
                              }}
                              onClick={() => this.toggleGroupDisabled(group)}
                            >
                              {group}
                            </label>
                            {this.state.displayColorPicker[group] && (
                              <div style={{ position: 'absolute', zIndex: 2 }}>
                                <div
                                  style={{ position: 'fixed', top: '0px', right: '0px', left: '0px', bottom: '0px' }}
                                  onClick={this.handleClose}
                                />
                                <SwatchesPicker
                                  color={this.state.groupColorAssociations[group]}
                                  onChange={(color) => {
                                    this.handleColorPickerChange(color, group);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature template moved out of sidebar to appear on the map */}

        {this.props.timeline && (
          <div className={styles.timeSliderContainer}>
            {/* Play button */}
            {this.props.timeline.tour && (
              <button
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  background: this.props.timeline.locked && !this.props.timeline.tour ? '#999' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: this.props.timeline.locked && !this.props.timeline.tour ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: this.props.timeline.locked && !this.props.timeline.tour ? 0.6 : 1,
                }}
                title={
                  this.props.timeline.locked && !this.props.timeline.tour ? 'Timeline is locked' : 'Animate timeline'
                }
                onClick={this.handleTimelinePlay}
                disabled={this.props.timeline.locked && !this.props.timeline.tour}
              >
                <i className={`fa ${this.state.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
            )}

            {this.props.timeline.mode === 'marked' && (
              <React.Fragment>
                <div className={styles.yearLabel}>{this.state.year}</div>
              </React.Fragment>
            )}

            {this.props.timeline.mode === 'normal' && (
              <React.Fragment>
                <input
                  type={'range'}
                  className={styles.timelineSlider}
                  min={this.props.timeline.min}
                  max={this.props.timeline.max}
                  step={1}
                  value={this.state.year}
                  onChange={this.handleTimelineChange}
                  disabled={this.props.timeline.locked}
                />
                <div className={styles.yearLabel}>{this.state.year}</div>

                {/* Tick marks */}
                <div className={styles['timeline-ticks']}>
                  {this.generateTickMarks().map((year) => (
                    <div key={year} style={{ fontSize: '12px', color: '#666' }}>
                      {year}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            )}
          </div>
        )}
        </div>

        {/* Feature template positioned to appear on the map */}
        {this.state.selectedFeature ? (
          <div className={styles['featureTemplateContainer']}>
            <button
              onClick={this.clearSelectedFeature}
              className={styles['featureTemplateCloseButton']}
              title="Close"
            >
              <i className="fa fa-times"></i>
            </button>
            {templateElement}
          </div>
        ) : null}
      </React.Fragment>
    );
  }

  private reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  private setFeaturesColorTaxonomy() {
    let groups = this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, this.getAllVectorLayers());
    this.setState(
      {
        featuresColorGroups: groups,
      },
      () => {
        this.triggerSendFeaturesColorTaxonomy();
        this.initializeGroupColorAssociations(this.state.featuresColorGroups);
      }
    );
  }

  private getGroupsFromTaxonomy(taxonomy, vectorLayers) {
    let groups = [];
    if (taxonomy) {
      vectorLayers.forEach((vectorLayer) => {
        vectorLayer
          .getSource()
          .getFeatures()
          .forEach((feature) => {
            if (feature.get(taxonomy)) {
              let grouping = feature.get(taxonomy).value;
              if (!groups.includes(grouping)) {
                groups.push(grouping);
              }
            }
          });
      });
    }
    return groups;
  }

  /**
   * Enable (activate) all groups at once
   */
  private enableAllGroups() {
    this.setState(
      (prevState) => {
        const newDisabled = {};
        for (const group in prevState.groupDisabled) {
          newDisabled[group] = false; // mark all as enabled
        }
        return { groupDisabled: newDisabled };
      },
      () => {
        // After updating state, push color changes to the map
        this.triggerSendFeaturesColorsAssociationsToMap();
      }
    );
  }

  /**
   * Disable (deactivate) all groups at once
   */
  private disableAllGroups() {
    this.setState(
      (prevState) => {
        const newDisabled = {};
        for (const group in prevState.groupDisabled) {
          newDisabled[group] = true; // mark all as disabled
        }
        return { groupDisabled: newDisabled };
      },
      () => {
        // After updating state, push color changes to the map
        this.triggerSendFeaturesColorsAssociationsToMap();
      }
    );
  }

  /* accepts parameters
   * h  Object = {h:x, s:y, v:z}
   * OR
   * h, s, v
   */
  private HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
      (s = h.s), (v = h.v), (h = h.h);
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        (r = v), (g = t), (b = p);
        break;
      case 1:
        (r = q), (g = v), (b = p);
        break;
      case 2:
        (r = p), (g = v), (b = t);
        break;
      case 3:
        (r = p), (g = q), (b = v);
        break;
      case 4:
        (r = t), (g = p), (b = v);
        break;
      case 5:
        (r = v), (g = p), (b = q);
        break;
    }
    let rgb = {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.4)';
  }

  private handleGenerateColorPalette() {
    this.generateColorPalette();
  }

  private handleRestartColorPalette() {
    this.initializeGroupColorAssociations(
      this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, this.getAllVectorLayers(this.state.mapLayers))
    );
  }

  private generateColorPalette() {
    let groupColorAssociationsClone = { ...this.state.groupColorAssociations };

    // Check the type of the prop
    console.log('featuresColorsPalette prop:', this.props.featuresColorsPalette);
    console.log('Type of featuresColorsPalette prop:', typeof this.props.featuresColorsPalette);

    let featuresColorsPaletteParsed: { [label: string]: string } = {};

    if (this.props.featuresColorsPalette) {
      if (typeof this.props.featuresColorsPalette === 'string') {
        // It's a string; parse it
        try {
          featuresColorsPaletteParsed = JSON.parse(this.props.featuresColorsPalette);
        } catch (e) {
          console.error('Error parsing featuresColorsPalette prop:', e);
          featuresColorsPaletteParsed = {};
        }
      } else if (typeof this.props.featuresColorsPalette === 'object') {
        // It's already an object; use it directly
        featuresColorsPaletteParsed = this.props.featuresColorsPalette;
      } else {
        console.error('Unexpected type for featuresColorsPalette prop:', typeof this.props.featuresColorsPalette);
        featuresColorsPaletteParsed = {};
      }
    }

    // Create a version with lowercase keys for case-insensitive matching
    let featuresColorsPaletteLowercased: { [label: string]: string } = {};
    for (let key in featuresColorsPaletteParsed) {
      featuresColorsPaletteLowercased[key.toLowerCase()] = featuresColorsPaletteParsed[key];
    }

    // Define the default color
    const defaultColor = this.defaultFeaturesColor;

    // Iterate over each label in groupColorAssociations
    for (let label in groupColorAssociationsClone) {
      let labelLowercased = label.toLowerCase();

      if (featuresColorsPaletteLowercased.hasOwnProperty(labelLowercased)) {
        // Use the color from featuresColorsPalette
        groupColorAssociationsClone[label] = featuresColorsPaletteLowercased[labelLowercased];
      } else {
        // Assign the default color
        groupColorAssociationsClone[label] = defaultColor;
      }
    }

    // Update the state
    this.setState({ groupColorAssociations: groupColorAssociationsClone });
  }

  private getAllVectorLayers(allLayers?) {
    if (!allLayers) {
      allLayers = this.state.mapLayers;
    }
    let vectorLayers = [];
    allLayers.forEach((layer) => {
      if (layer instanceof VectorLayer) {
        vectorLayers.push(layer);
      }
    });
    return vectorLayers;
  }

  private extractYearMarks(vectorLayers) {
    let marks = [];
    console.log('Extracting year marks for: ', vectorLayers);
    vectorLayers.forEach((vectorLayer) => {
      vectorLayer
        .getSource()
        .getFeatures()
        .forEach((feature) => {
          if (feature.get('bob').value) {
            marks.push(Number(feature.get('bob').value));
          }
        });
    });
    console.log('Extracted marks', marks);
    this.setState(
      {
        yearMarks: marks.sort(),
      },
      () => {
        console.log('Now marks are:', this.state.yearMarks);
      }
    );
  }

  findClosestMark(value, marks) {
    return marks.reduce((prev, curr) => {
      return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
    });
  }

  private capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private getRgbaString(group: string, preview: boolean = false) {
    let baseColor = this.defaultFeaturesColor;
    // Check if we have a custom color assigned
    if (
      group in this.state.groupColorAssociations &&
      this.state.groupColorAssociations[group] &&
      this.state.groupColorAssociations[group] !== this.defaultFeaturesColor &&
      this.state.groupColorAssociations[group] !== ''
    ) {
      if (typeof this.state.groupColorAssociations[group] === 'string') {
        baseColor = this.state.groupColorAssociations[group];
      } else {
        let color = this.state.groupColorAssociations[group];
        let color_rgba = color.rgb;
        baseColor = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + '0.4' + ')';
      }
    }

    // If this is for a preview, ignore the disabled state and return the base color as is.
    if (preview) {
      return baseColor;
    }

    // Adjust alpha based on disabled state for other uses
    const disabled = this.state.groupDisabled[group] === true;
    const matches = baseColor.match(/rgba?\((\d+),\s?(\d+),\s?(\d+),?\s?([\d.]+)?\)/);
    if (matches) {
      let r = matches[1];
      let g = matches[2];
      let b = matches[3];
      let a = disabled ? '0' : '0.5';
      return `rgba(${r},${g},${b},${a})`;
    }

    return disabled ? 'rgba(200,50,50,0)' : 'rgba(200,50,50,0.5)';
  }

  private initializeGroupColorAssociations(groups: string[]) {
    let colorGroups = {};
    let displayColorPickerNew = {};
    let groupDisabled = {};
    groups.forEach((group) => {
      colorGroups[group] = this.defaultFeaturesColor;
      displayColorPickerNew[group] = false;
      groupDisabled[group] = false;
    });
    this.setState(
      {
        groupColorAssociations: colorGroups,
        displayColorPicker: displayColorPickerNew,
        groupDisabled: groupDisabled,
      },
      () => {
        console.log('GroupColorassociations initialized. Here are the associations:');
        console.log(this.state.groupColorAssociations);
        this.generateColorPalette();
      }
    );
  }

  private toggleGroupDisabled(group: string) {
    this.setState(
      (prevState) => {
        const currentlyDisabled = prevState.groupDisabled[group];
        const newDisabledState = !currentlyDisabled;
        return {
          groupDisabled: {
            ...prevState.groupDisabled,
            [group]: newDisabledState,
          },
        };
      },
      () => {
        // After state is updated, re-trigger the event to send updated colors (with new alpha)
        this.triggerSendFeaturesColorsAssociationsToMap();
      }
    );
  }

  private setMapLayerProperty(identifier, propertyName, propertyValue) {
    let mapLayersClone = this.state.mapLayers;
    mapLayersClone.forEach(function (mapLayer) {
      if (mapLayer.get('identifier') === identifier) {
        mapLayer.set(propertyName, propertyValue);
      }
    });

    // If we're changing visibility, reset visualization mode to normal
    if (propertyName === 'visible') {
      this.setState(
        { 
          mapLayers: mapLayersClone,
          overlayVisualization: 'normal'
        }, 
        () => {
          this.triggerSendLayers();
          // Trigger normal visualization mode
          this.triggerVisualization('normal');
        }
      );
    } else {
      // For other property changes, just update layers
      this.setState({ mapLayers: mapLayersClone }, () => {
        this.triggerSendLayers();
      });
    }
  }

  /**
   * Generate tick marks for the timeline
   */
  private generateTickMarks = () => {
    if (!this.props.timeline) return [];

    const { min, max } = this.props.timeline;
    const range = max - min;

    // For small ranges, show more ticks
    if (range <= 100) {
      return Array.from({ length: Math.floor(range / 10) + 1 }, (_, i) => min + i * 10);
    }

    // For medium ranges
    if (range <= 500) {
      return Array.from({ length: Math.floor(range / 50) + 1 }, (_, i) => min + i * 50);
    }

    // For large ranges, show century marks
    const startCentury = Math.ceil(min / 100) * 100;
    const numCenturies = Math.floor((max - startCentury) / 100) + 1;
    return Array.from({ length: numCenturies }, (_, i) => startCentury + i * 100);
  };

  /**
   * Handle timeline slider change
   */
  private handleTimelineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // If timeline is locked, don't allow changes
    if (this.props.timeline && this.props.timeline.locked) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);

    // Add pulse animation class to year label
    const yearLabel = document.querySelector(`.${styles.yearLabel}`) as HTMLElement;
    if (yearLabel) {
      yearLabel.classList.add('pulse');
      setTimeout(() => {
        yearLabel.classList.remove('pulse');
      }, 500);
    }

    this.setState(
      {
        year: value,
      },
      () => {
        this.triggerSendYear();
      }
    );
  };

  /**
   * Handle timeline play button click
   */
  private handleTimelinePlay = () => {
    // If timeline is locked and not in tour mode, don't allow changes
    if (this.props.timeline && this.props.timeline.locked && !this.props.timeline.tour) {
      return;
    }

    if (this.state.isPlaying) {
      // Stop animation
      if (this.state.animationInterval) {
        window.clearInterval(this.state.animationInterval);
      }
      this.setState({ isPlaying: false, animationInterval: undefined });
    } else {
      // Start animation
      const min = this.props.timeline.min;
      const max = this.props.timeline.max;
      let current = this.state.year;

      const interval = window.setInterval(() => {
        current += 10;
        if (current > max) {
          current = min;
        }

        // Update year and send to map
        this.setState({ year: current }, () => {
          this.triggerSendYear();

          // Add pulse animation to year label
          const yearLabel = document.querySelector(`.${styles.yearLabel}`) as HTMLElement;
          if (yearLabel) {
            yearLabel.classList.add('pulse');
            setTimeout(() => {
              yearLabel.classList.remove('pulse');
            }, 500);
          }
        });
      }, 500);

      this.setState({ isPlaying: true, animationInterval: interval });
    }
  };
}

export default SemanticMapControls;
