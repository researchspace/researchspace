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
  SemanticMapControlsSendLabelBackgroundToMap,
  SemanticMapControlsSendFeaturesColorTaxonomyToMap,
  SemanticMapControlsSendGroupColorsAssociationsToMap,
  SemanticMapControlsSendToggle3d,
  SemanticMapControlsSendSunHeight,
  SemanticMapControlsSendSunDirection,
  SemanticMapControlsSendYear,
  SemanticMapControlsSendVectorLevels,
  SemanticMapControlsRegister,
  SemanticMapControlsUnregister,
  SemanticMapControlsToggleMeasurement,
  SemanticMapControlsHandleGeneralizedData,
  SemanticMapControlsHighlightFeatures,
  GeneralizedEventData,
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
  generalizedData?: GeneralizedEventData; // For generalized data handling
  stylingEnabled: boolean; // Controls whether feature styling (coloring/labeling) is enabled
  labelBackgroundEnabled: boolean; // Controls whether labels have a soft background
  sunHeightDeg: number;
  sunDirectionDeg: number;
  is3dEnabled: boolean;
}

interface Props {
  targetMapId: string;
  id: string;
  featuresTaxonomies: string;
  featuresColorTaxonomies: string;
  featuresOptionsEnabled: boolean;
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
   * Template for details maps panel
   */
  detailsMapTemplate?: string;
  /**
   * Template for base maps panel
   */
  baseMapTemplate?: string;
  /**
   * Template for buildings panel
   */
  buildingsTemplate?: string;
  /**
   * Mapping of data kinds to template references.
   * Used for the generalized data handling functionality.
   * Example: { "Person": "{{> person-template}}", "Building": "{{> building-template}}" }
   */
  templateMapping?: { [kind: string]: string };
  /**
   * Template to render inside the details panel when no feature or
   * generalized data is selected (i.e. the "default" / idle content).
   * Accepts a handlebars template string.
   */
  defaultDetailsTemplate?: string;
  /**
   * Default color for geometries/features when no specific color is assigned.
   * Format: rgba string e.g. 'rgba(200,50,50,0.5)'
   */
  defaultFeaturesColor?: string;
  /**
   * When true, shows the palette control buttons (generate random, restart palette).
   * Default: false
   */
  showPaletteControls?: boolean;
  /**
   * Default color taxonomy to use when styling is enabled.
   * Should match one of the values in featuresColorTaxonomies.
   * If not specified, defaults to 'default' (no taxonomy coloring).
   */
  defaultColorTaxonomy?: string;
  /**
   * Title for the geometries section in the layers panel.
   * Default: "Geometries"
   */
  geometriesSectionTitle?: string;
  /**
   * Title for the maps/tile layers section in the layers panel.
   * Default: "Maps"
   */
  mapsSectionTitle?: string;
}

export class SemanticMapControls extends Component<Props, State> {
  private cancelation = new Cancellation();
  private featuresTaxonomies = [];
  private featuresColorTaxonomies = [];
  private defaultFeaturesColor: string;
  //TODO: fix optionals
  constructor(props: any, context: ComponentContext) {
    super(props, context);
    // Use the prop if provided, otherwise use the default gray value
    this.defaultFeaturesColor = this.props.defaultFeaturesColor || 'rgba(128,128,128,0.5)';
    this.state = {
      overlayOpacity: 1,
      swipeValue: 50,
      overlayVisualization: 'normal',
      color: 'rgba(200,50,50,0.5)',
      setColor: 'rgba(200,50,50,0.5)',
      mapLayers: [],
      maskIndex: -1,
      groupDisabled: {},
      selectedFeaturesLabel: '',
      featuresColorTaxonomy: this.props.defaultColorTaxonomy || '',
      featuresColorGroups: [],
      displayColorPicker: {},
      groupColorAssociations: {},
      year: this.props.timeline ? this.props.timeline.default : new Date().getFullYear(), // Todo fix optional timeline props.
      yearMarks: [],
      registeredMap: '',
      activePanel: null,
      stylingEnabled: false, // Default to OFF
      labelBackgroundEnabled: false, // Default to OFF
      sunHeightDeg: 45,
      sunDirectionDeg: 180,
      is3dEnabled: false,
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
      
    // Listen for visualization mode changes from the map (e.g., when ESC is pressed)
    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsOverlayVisualization,
          target: this.props.id,
        })
      )
      .onValue(this.handleVisualizationModeChange);
      
    // Listen for generalized data events
    this.cancelation
      .map(
        listen({
          eventType: SemanticMapControlsHandleGeneralizedData,
          target: this.props.id,
        })
      )
      .onValue(this.handleGeneralizedData);

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
      // Include generalizedData in the context
      generalizedData: this.state.generalizedData,
    };
  }
  
  /**
   * Get the appropriate template reference based on the current data
   */
  private getTemplateForCurrentData(): string {
    // If we have generalized data and a template mapping, use the appropriate template
    if (this.state.generalizedData && this.props.templateMapping) {
      const kind = this.state.generalizedData.kind;
      if (this.props.templateMapping[kind]) {
        console.log(`Using template for kind: ${kind}`);
        return this.props.templateMapping[kind];
      }
    }
    
    // Fall back to the default render template
    return this.props.renderTemplate;
  }

  public componentWillMount() {
    if (this.props.featuresTaxonomies) {
      this.featuresTaxonomies = this.props.featuresTaxonomies.split(',');
    }
    if (this.props.featuresColorTaxonomies) {
      this.featuresColorTaxonomies = this.props.featuresColorTaxonomies.split(',');
    }
  }

  public componentWillUnmount() {
    console.log('Will unmount: ', this.props.id);
    this.triggerUnregisterToMap();

    // Remove event listener when component unmounts
    document.removeEventListener('feature-close-clicked', this.clearSelectedFeature);
  }

  public componentDidUpdate(prevProps, prevState) {
    // TODO: if we care about colors (i.e. details maps controls don't)
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
    
    // If we're receiving a feature (not null)
    if (event.data) {
      // Check if the panel is currently closed
      const isPanelClosed = this.state.activePanel === null;
      
      // Set animation state for opening if panel is currently closed
      if (isPanelClosed) {
        this.isPanelOpening = true;
        this.isPanelClosing = false;
        this.panelAnimationState = 'opening';
        
        // Immediately start moving the legend with the panel
        this.animateLegendPosition('withPanel');
      }
      
      // Update state with the new feature and open the panel
      this.setState(
        {
          selectedFeature: event.data,
          activePanel: 'details' // Always open the details panel when a feature is selected
        },
        () => {
          // If we have a renderTemplate, we need to re-render the template with the new selectedFeature
          if (this.props.renderTemplate) {
            this.forceUpdate();
          }
        }
      );
    } else {
      // If we're receiving null (no feature selected)
      this.setState(
        {
          selectedFeature: null
          // Don't change the panel state here - that's handled by togglePanel
        },
        () => {
          // If we have a renderTemplate, we need to re-render the template with the null selectedFeature
          if (this.props.renderTemplate) {
            this.forceUpdate();
          }
        }
      );
    }
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
    this.setState(
      (prevState) => ({ is3dEnabled: !prevState.is3dEnabled }),
      () => {
        trigger({
          eventType: SemanticMapControlsSendToggle3d,
          source: this.props.id,
          targets: [this.props.targetMapId],
          data: 'toggle',
        });

        // Re-send current sun controls after enabling 3D so Cesium receives the latest values.
        if (this.state.is3dEnabled) {
          this.triggerSendSunHeight();
          this.triggerSendSunDirection();
        }
      }
    );
  }

  private triggerSendSunHeight() {
    trigger({
      eventType: SemanticMapControlsSendSunHeight,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.sunHeightDeg,
    });
  }

  private triggerSendSunDirection() {
    trigger({
      eventType: SemanticMapControlsSendSunDirection,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.sunDirectionDeg,
    });
  }

  private handleSunHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sunHeightDeg = parseInt(event.target.value, 10);
    this.setState({ sunHeightDeg }, () => this.triggerSendSunHeight());
  };

  private handleSunDirectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sunDirectionDeg = parseInt(event.target.value, 10);
    this.setState({ sunDirectionDeg }, () => this.triggerSendSunDirection());
  };

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

  // Store the timeout ID so we can clear it if needed
  private closeTimeoutId: number | null = null;

  handleClose = () => {
    // Clear any existing timeout to prevent conflicts
    if (this.closeTimeoutId !== null) {
      window.clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }

    // Find the swatches-picker element
    const swatchesPicker = document.querySelector('.swatches-picker') as HTMLElement;
    if (!swatchesPicker) {
      // If no picker is found, just close it immediately
      this.closePickerImmediately();
      return;
    }

    // Set up the transition directly on the element
    swatchesPicker.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    
    // Start with full opacity
    swatchesPicker.style.opacity = '1';
    swatchesPicker.style.transform = 'scale(1)';
    
    // Force a reflow to ensure the transition starts fresh
    void swatchesPicker.offsetWidth;
    
    // Apply the fade-out effect
    swatchesPicker.style.opacity = '0';
    swatchesPicker.style.transform = 'scale(0.95)';

    // Listen for the transition end event
    const handleTransitionEnd = () => {
      // Remove the event listener
      swatchesPicker.removeEventListener('transitionend', handleTransitionEnd);
      
      // Close the picker
      this.closePickerImmediately();
    };

    // Add the event listener
    swatchesPicker.addEventListener('transitionend', handleTransitionEnd);
    
    // Set a backup timeout in case the transition event doesn't fire
    this.closeTimeoutId = window.setTimeout(() => {
      this.closePickerImmediately();
      this.closeTimeoutId = null;
    }, 600); // Slightly longer than the transition duration
  };

  // Helper method to close the picker immediately
  private closePickerImmediately = () => {
    var displayColorPickerClone = this.state.displayColorPicker;
    for (let key in displayColorPickerClone) {
      displayColorPickerClone[key] = false;
    }
    this.setState({ displayColorPicker: displayColorPickerClone });
  };

  // Cancel the close timeout if the user moves back to the color picker
  handleColorPickerMouseEnter = () => {
    // Clear the timeout to prevent the picker from closing
    if (this.closeTimeoutId !== null) {
      window.clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
      
      // Reset the opacity and transform
      const swatchesPicker = document.querySelector('.swatches-picker') as HTMLElement;
      if (swatchesPicker) {
        swatchesPicker.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        swatchesPicker.style.opacity = '1';
        swatchesPicker.style.transform = 'scale(1)';
      }
    }
  };

  // Track if we're opening, closing, or switching panels
  private isPanelOpening = false;
  private isPanelClosing = false;
  private previousPanel = null;
  private panelAnimationState = ''; // Track animation state for CSS
  private legendPosition = 'external'; // Track legend position for direct DOM manipulation

  /**
   * Toggle a panel open/closed
   */
  private togglePanel = (panelName: string) => {
    // If we're closing the current panel
    if (this.state.activePanel === panelName) {
      // Set animation state for CSS
      this.panelAnimationState = 'closing';
      this.isPanelClosing = true;
      this.isPanelOpening = false;
      
      // Immediately start moving the legend with the panel
      this.animateLegendPosition('external');
      
      // When closing the details panel, clear both generalizedData and selectedFeature
      // Do this BEFORE the animation starts to ensure immediate visual feedback
      if (panelName === "details") {
        console.log('Closing details panel - clearing feature selection');
        // Clear both generalizedData and selectedFeature when closing the details panel
        this.setState({ 
          generalizedData: null,
          // Keep the activePanel value so the panel stays in DOM during animation
        }, () => {
          // After state update, trigger the clear selected feature event
          this.clearSelectedFeature();
        });
      } else {
        // For other panels, just update state to trigger re-render with animation
        this.setState({
          // Keep the activePanel value so the panel stays in DOM during animation
        });
      }
      
      // Listen for the animation end event
      const panel = document.querySelector(`.${styles.mapControlsPanel}`);
      if (panel) {
        const handleAnimationEnd = () => {
          // Remove the event listener
          panel.removeEventListener('animationend', handleAnimationEnd);
          
          // Now actually close the panel by setting activePanel to null
          this.setState({
            activePanel: null,
          });
          
          // Reset animation state
          this.panelAnimationState = '';
        };
        
        // Add the event listener
        panel.addEventListener('animationend', handleAnimationEnd);
      } else {
        // Fallback if we can't find the panel element
        this.setState({
          activePanel: null,
        });
      }
    } 
    // If we're opening a panel when none is open
    else if (this.state.activePanel === null) {
      this.isPanelOpening = true;
      this.isPanelClosing = false;
      this.panelAnimationState = 'opening';
      this.previousPanel = null;
      
      // Immediately start moving the legend with the panel
      this.animateLegendPosition('withPanel');
      
      this.setState({
        activePanel: panelName,
      });
    }
    // If we're switching from one panel to another
    else {
      this.previousPanel = this.state.activePanel;
      this.isPanelOpening = false;
      this.isPanelClosing = false;
      this.panelAnimationState = '';
      this.setState({
        activePanel: panelName,
      });
    }
  };
  
  /**
   * Directly animate the legend position using DOM manipulation
   * This ensures perfect synchronization with panel animations
   */
  private animateLegendPosition = (position: 'external' | 'withPanel') => {
    this.legendPosition = position;
    
    // Find the legend element
    const legend = document.querySelector(`.${styles.colorsLegend}`) as HTMLElement;
    if (!legend) return;
    
    // Remove any existing animation
    legend.classList.remove(styles.colorsLegendExternal, styles.colorsLegendWithPanel);
    
    // Force a reflow to ensure the animation starts fresh
    void legend.offsetWidth;
    
    // Add the appropriate class to trigger the animation
    if (position === 'external') {
      legend.classList.add(styles.colorsLegendExternal);
    } else {
      legend.classList.add(styles.colorsLegendWithPanel);
    }
  };
  
  /**
   * Determine if a panel should have the opening animation class
   */
  private getPanelAnimationClass = (panelName: string) => {
    if (this.state.activePanel === panelName) {
      if (this.panelAnimationState === 'opening' || this.isPanelOpening) {
        return styles.mapControlsPanelOpening;
      } else if (this.panelAnimationState === 'closing' || this.isPanelClosing) {
        return styles.mapControlsPanelClosing;
      }
    }
    return '';
  };
  
  /**
   * Toggle visualization mode on/off
   */
  private toggleVisualizationMode = (mode: string) => {
    // Get the current mode before updating state
    const currentMode = this.state.overlayVisualization;
    
    // If the mode is already active, turn it off (set to 'normal')
    // Otherwise, activate the requested mode
    const newMode = currentMode === mode ? 'normal' : mode;
    
    console.log(`Toggling visualization mode from ${currentMode} to ${newMode}`);
    
    // First, deactivate the current mode if it's not 'normal'
    if (currentMode !== 'normal') {
      // If we're in measurement mode, explicitly deactivate it
      if (currentMode === 'measure') {
        this.triggerMeasurement('deactivated');
      }
      
      // If we're in swipe mode, reset swipe
      if (currentMode === 'swipe') {
        // No specific action needed here as the map will handle cleanup
      }
    }
    
    // Update state with the new mode
    this.setState({ overlayVisualization: newMode }, () => {
      // Trigger the visualization change event to update the map
      this.triggerVisualization(newMode);
      
      // If swipe mode is activated, also send the swipe value
      if (newMode === 'swipe') {
        this.triggerSendSwipeValue(this.state.swipeValue);
      }
      
      // If measurement mode is activated, trigger measurement
      if (newMode === 'measure') {
        this.triggerMeasurement('toggle');
      }
    });
  };
  
  private triggerMeasurement = (action: string) => {
    trigger({
      eventType: SemanticMapControlsToggleMeasurement,
      source: this.props.id,
      data: action,
      targets: [this.props.targetMapId],
    });
  };
  
  /**
   * Handle label background toggle - sends event to map
   */
  private handleLabelBackgroundToggle = () => {
    const newLabelBackgroundEnabled = !this.state.labelBackgroundEnabled;
    this.setState({ labelBackgroundEnabled: newLabelBackgroundEnabled }, () => {
      // Send the label background setting to the map
      trigger({
        eventType: SemanticMapControlsSendLabelBackgroundToMap,
        source: this.props.id,
        targets: [this.props.targetMapId],
        data: newLabelBackgroundEnabled,
      });
    });
  };
  
  /**
   * Handle styling toggle - when disabled, reset label by and color by to none/default
   */
  private handleStylingToggle = () => {
    const newStylingEnabled = !this.state.stylingEnabled;
    
    if (newStylingEnabled) {
      // Just enable styling
      this.setState({ stylingEnabled: true });
    } else {
      // Disable styling and reset options to none/default
      this.setState(
        {
          stylingEnabled: false,
          selectedFeaturesLabel: '', // Reset label by to 'none'
          featuresColorTaxonomy: '', // Reset color by to 'default'
        },
        () => {
          // Trigger updates to the map
          this.triggerSendFeaturesLabelToMap();
          this.triggerSendFeaturesColorTaxonomy();
        }
      );
    }
  };
  
  /**
   * Handle visualization mode changes from the map (e.g., when ESC is pressed)
   */
  private handleVisualizationModeChange = (event: any) => {
    const newMode = event.data;
    console.log(`Received visualization mode change from map: ${newMode}`);
    
    // Update the state to match the map's visualization mode
    this.setState({ overlayVisualization: newMode });
  };
  
  /**
   * Handle generalized data events
   * This method processes events with different kinds of data (e.g., Person, Building)
   * and triggers appropriate template rendering and feature highlighting
   */
  private handleGeneralizedData = (event: any) => {
    console.log('Received generalized data:', event.data);
    
    // Check if we have data (not null)
    if (event.data && event.data.data) {
      // Store the generalized data in state and always open the details panel
      this.setState(
        {
          generalizedData: event.data,
          activePanel: 'details' // Always open the details panel when data is received
        },
        () => {
          // If there's a highlight pattern, trigger feature highlighting
          if (event.data.highlightPattern) {
            console.log('Triggering highlight with pattern:', event.data.highlightPattern);
            this.triggerHighlightFeatures(event.data.highlightPattern);
          } else {
            console.log('No highlight pattern provided in the generalized data');
          }
          
          // If the panel is opening, animate it
          if (this.state.activePanel === 'details' && !this.isPanelOpening && !this.isPanelClosing) {
            this.isPanelOpening = true;
            this.panelAnimationState = 'opening';
            
            // Immediately start moving the legend with the panel
            this.animateLegendPosition('withPanel');
          }
          
          // Force re-render to update template with the new data
          this.forceUpdate();
        }
      );
    } else {
      // If data is null, just update the state without changing the panel
      this.setState(
        {
          generalizedData: event.data
        },
        () => {
          // Force re-render to update template with the new data
          this.forceUpdate();
        }
      );
    }
  };
  
  /**
   * Trigger feature highlighting based on a SPARQL pattern
   */
  private triggerHighlightFeatures = (pattern: string) => {
    trigger({
      eventType: SemanticMapControlsHighlightFeatures,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: pattern,
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
    const detailsMapTemplate = this.props.detailsMapTemplate || '';

    // Get the appropriate template reference based on the current data
    const templateRef = this.getTemplateForCurrentData();
    
    // Create the template element if there's a selected feature or generalized data
    const templateElement = (this.state.selectedFeature || this.state.generalizedData)
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
        {/* Visualization mode notification */}
        {this.state.overlayVisualization !== 'normal' && (
          <div className={styles.visualizationModeNotification}>
            <strong>{this.state.overlayVisualization.toUpperCase()}</strong> mode active. Press <kbd>ESC</kbd> to exit
            {this.state.overlayVisualization === 'spyglass' && (
              <span>. Right click (or Ctrl+click) to change radius.</span>
            )}
          </div>
        )}
        
        <div className={styles.mapControlsContainer}>
        {/* Sidebar with buttons */}
        <div className={styles.mapControlsSidebar}>

        <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-base-maps">Details</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} ${
                this.state.activePanel === 'details' ? styles.mapControlsButtonActive : ''
              } map-control-button-details`}
              onClick={() => this.togglePanel('details')}
            >
              <span className="map-control-icon-details">
                <i className="fa fa-home" style={{ fontSize: '24px' }}></i>
              </span>
            </button>
          </OverlayTrigger>

          {/* Layers Button */}
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-base-maps">Layers</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} ${
                this.state.activePanel === 'base' ? styles.mapControlsButtonActive : ''
              } map-control-button-basemap`}
              onClick={() => this.togglePanel('base')}
            >
              <span className="material-icons-round" style={{ fontSize: '24px' }}>
                layers
              </span>
            </button>
          </OverlayTrigger>

          {/* Style Button */}
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-style">Style</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} ${
                this.state.activePanel === 'buildings' ? styles.mapControlsButtonActive : ''
              } map-control-button-style`}
              onClick={() => this.togglePanel('buildings')}
            >
              <span className="map-control-icon-style">
                <i className="fa fa-paint-brush" style={{ fontSize: '24px' }}></i>
              </span>
            </button>
          </OverlayTrigger>
          
          {/* Divider between panel buttons and visualization mode buttons */}
          <hr className={styles.mapControlsSeparator} />
          
          {/* Spyglass Visualization Mode Button */}
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-spyglass">Spyglass Mode</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} ${
                this.state.overlayVisualization === 'spyglass' ? styles.mapControlsButtonActive : ''
              } map-control-button-spyglass`}
              onClick={() => this.toggleVisualizationMode('spyglass')}
            >
              <span className="map-control-icon-spyglass">
                <i className="fa fa-search" style={{ fontSize: '24px' }}></i>
              </span>
            </button>
          </OverlayTrigger>
          
          {/* Swipe Visualization Mode Button */}
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-swipe">Swipe Mode</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} ${
                this.state.overlayVisualization === 'swipe' ? styles.mapControlsButtonActive : ''
              } map-control-button-swipe`}
              onClick={() => this.toggleVisualizationMode('swipe')}
            >
              <span className="map-control-icon-swipe">
                <i className="fa fa-columns" style={{ fontSize: '24px' }}></i>
              </span>
            </button>
          </OverlayTrigger>
          
          {/* 3D View Toggle Button */}
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip-3d">Toggle 3D View</Tooltip>}
          >
            <button
              className={`${styles.mapControlsButton} map-control-button-3d`}
              onClick={() => this.triggerSendToggle3d()}
            >
              <span className="map-control-icon-3d">
                <i className="fa fa-cube" style={{ fontSize: '24px' }}></i>
              </span>
            </button>
          </OverlayTrigger>

          
          {/* Measurement Tool moved to SemanticMapAdvanced map component directly */}
        </div>

        {/* Panels */}
        {this.state.activePanel === 'details' && (
          <div className={`${styles.mapControlsPanel} ${this.getPanelAnimationClass('details')}`}>
            {/* Standalone close button */}
            <button
              onClick={() => this.togglePanel('details')}
              className={styles.mapControlsPanelCloseX}
              title="Close panel"
            >
              <i className="fa fa-times"></i>
            </button>

            <div className={styles.mapControlsPanelHeader}>
              
            </div>
            {/* Feature / generalized-data template, or default idle template */}
            {(this.state.selectedFeature || this.state.generalizedData) ? (
              <div className={styles['featureTemplateContainer']}>
                {templateElement}
              </div>
            ) : this.props.defaultDetailsTemplate ? (
              <div className={styles['defaultDetailsContainer']}>
                {createElement(TemplateItem, {
                  template: {
                    source: this.props.defaultDetailsTemplate,
                    options: this.getTemplateContext(),
                  },
                })}
              </div>
            ) : null}
          </div>
        )}

        {this.state.activePanel === 'base' && (
          <div className={`${styles.mapControlsPanel} ${this.getPanelAnimationClass('base')}`}>
            {/* Standalone close button */}
            <button
              onClick={() => this.togglePanel('base')}
              className={styles.mapControlsPanelCloseX}
              title="Close panel"
            >
              <i className="fa fa-times"></i>
            </button>

            <div className={styles.mapControlsPanelHeader}>
              
            </div>

            {/* Geometry Layers Section */}
            {this.getGeometryLayers().length > 0 && (
              <div className={styles.geometryLayersSection}>
                <h4 className={styles.layersSectionTitle}>
                  {this.props.geometriesSectionTitle || 'Geometries'}
                </h4>
                <div className={styles.geometryLayersList}>
                  {this.getGeometryLayers()
                    .sort((a, b) => {
                      // Sort by z-index descending (higher z on top)
                      const zIndexA = a.get('zIndex') || 0;
                      const zIndexB = b.get('zIndex') || 0;
                      return zIndexB - zIndexA;
                    })
                    .map((layer) => (
                      <div 
                        key={layer.get('identifier')} 
                        className={`${styles.geometryLayerItem} ${layer.get('visible') ? '' : styles.geometryLayerItemHidden}`}
                      >
                        <div className={styles.geometryLayerContent}>
                          <span className={styles.geometryLayerName}>
                            {layer.get('name') || layer.get('t') || layer.get('identifier')}
                          </span>
                          <div className={styles.geometryLayerControls}>
                            <i
                              className={`fa ${layer.get('visible') ? 'fa-eye' : 'fa-eye-slash'} ${styles.geometryLayerToggle}`}
                              onClick={() => this.setMapLayerProperty(layer.get('identifier'), 'visible', !layer.get('visible'))}
                              title={layer.get('visible') ? 'Hide layer' : 'Show layer'}
                            ></i>
                          </div>
                        </div>
                        <div className={styles.geometryLayerOpacity}>
                          <input
                            type="range"
                            className={styles.geometryOpacitySlider}
                            min={0}
                            max={1}
                            step={0.01}
                            value={layer.get('opacity') ?? 1}
                            onChange={(event) => {
                              const opacity = parseFloat((event.target as HTMLInputElement).value);
                              this.setMapLayerProperty(layer.get('identifier'), 'opacity', opacity);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* Separator between geometry and tile layers */}
            {this.getGeometryLayers().length > 0 && this.getOverlayLayers().length > 0 && (
              <div className={styles.layersSectionSeparator}>
                <span className={styles.layersSectionSeparatorLine}></span>
                <span className={styles.layersSectionSeparatorText}>
                  {this.props.mapsSectionTitle || 'Maps'}
                </span>
                <span className={styles.layersSectionSeparatorLine}></span>
              </div>
            )}
            
            {/* Tile/Overlay Layers Section (Draggable) */}
            <DragDropContext onDragEnd={this.onDragEnd}>
              <Droppable droppableId="droppable">
                {(provided, snapshot) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className={styles.layersContainer}>
                    {this.getOverlayLayers().map(
                      (mapLayer, index) => (
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
                                  <div className={styles.draggableLayerContainer}>
                                    {/* Left column with drag handle */}
                                    <div className={styles.leftColumnContainer} {...provided.dragHandleProps}>
                                      <i className="fa fa-bars"></i>
                                    </div>
                                    
                                    {/* Main content container */}
                                    <div className={styles.layerContentContainer}>
                                      {/* Thumbnail */}
                                        <div className={styles.thumbnailContainer}>
                                        {mapLayer.get('identifier') === 'Buildings' ? (
                                          <i className={`buildings ${styles.layerThumbnail} ${styles.layerThumbnailStyle}`}
                                            style={{ fontSize: '40px', textAlign: 'center', verticalAlign: 'middle', lineHeight: '60px' }}
                                          ></i>
                                        ) : (
                                          <img
                                          src={mapLayer.get('thumbnail')}
                                          className={`${styles.layerThumbnail} ${styles.layerThumbnailStyle}`}
                                          />
                                        )}
                                        </div>
                                      
                                      {/* Info container */}
                                      <div className={styles.layerInfoContainer}>
                                        {/* Date in top right */}
                                        <div className={styles.layerDateContainer}>
                                          <label className={styles.layerLabel}>{mapLayer.get('year')}</label>
                                        </div>
                                        
                                        {/* Title */}
                                        <div className={styles.layerTitleContainer}>
                                          <label className={styles.layerTitle}>{mapLayer.get('author')}</label>
                                        </div>
                                      </div>
                                      
                                      {/* Toggle buttons on the right */}
                                      <div className={styles.togglesColumnRightStyle}>
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
                                  
                                  {/* Opacity slider at the bottom with label above */}
                                  <div className={styles.opacitySliderContainer}>
                                    <label className={styles.opacitySliderLabel}>Opacity:</label>
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
          <div className={`${styles.mapControlsPanel} ${this.getPanelAnimationClass('buildings')}`}>
            {/* Header with title and close button */}
            <div className={styles.mapControlsPanelHeader}>
              <h3 className={styles.mapControlsPanelTitle}>Geometries Styling</h3>
              <button
                onClick={() => this.togglePanel('buildings')}
                className={styles.mapControlsPanelCloseButton}
                title="Close panel"
              >
                <i className="fa fa-times"></i>
              </button>
            </div>

            {this.props.featuresOptionsEnabled && (
              <div className={styles.featuresOptionsContainer}>
                {/* Enable Styling Toggle */}
                <div className={styles.stylingToggleContainer}>
                  <label className={styles.stylingToggleLabel}>
                    <span>Enable Feature Styling</span>
                    <div 
                      className={`${styles.toggleSwitch} ${this.state.stylingEnabled ? styles.toggleSwitchOn : ''}`}
                      onClick={() => this.handleStylingToggle()}
                    >
                      <div className={styles.toggleSwitchHandle}></div>
                    </div>
                  </label>
                </div>

                {/* Label and Color options - only shown when styling is enabled */}
                {this.state.stylingEnabled && (
                  <div className={styles.stylingOptionsSection}>
                    {/* Label by section */}
                    <div className={styles.stylingOptionGroup}>
                      <label className={styles.stylingOptionTitle}>Label by</label>
                      {/* Label background toggle - only show when a label is selected */}
                      {this.state.selectedFeaturesLabel && this.state.selectedFeaturesLabel !== '' && this.state.selectedFeaturesLabel !== 'none' && (
                        <div className={styles.labelBackgroundToggle}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={this.state.labelBackgroundEnabled}
                              onChange={() => this.handleLabelBackgroundToggle()}
                            />
                            <span>Show label background</span>
                          </label>
                        </div>
                      )}
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="featuresLabelList"
                            value="none"
                            checked={this.state.selectedFeaturesLabel === '' || this.state.selectedFeaturesLabel === 'none'}
                            onChange={this.handleSelectedLabelChange}
                          />
                          <span>None</span>
                        </label>
                        {this.featuresTaxonomies.map((taxonomy) => (
                          <label key={taxonomy} className={styles.radioLabel}>
                            <input
                              type="radio"
                              name="featuresLabelList"
                              value={taxonomy}
                              checked={this.state.selectedFeaturesLabel === taxonomy}
                              onChange={this.handleSelectedLabelChange}
                            />
                            <span>{this.capitalizeFirstLetter(taxonomy)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Color by section */}
                    <div className={styles.stylingOptionGroup}>
                      <label className={styles.stylingOptionTitle}>Color by</label>
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="featuresColorsList"
                            value="default"
                            checked={this.state.featuresColorTaxonomy === '' || this.state.featuresColorTaxonomy === 'default'}
                            onChange={this.handleColorTaxonomyChange}
                          />
                          <span>Default</span>
                        </label>
                        {this.featuresColorTaxonomies.map((taxonomy) => (
                          <label key={taxonomy} className={styles.radioLabel}>
                            <input
                              type="radio"
                              name="featuresColorsList"
                              value={taxonomy}
                              checked={this.state.featuresColorTaxonomy === taxonomy}
                              onChange={this.handleColorTaxonomyChange}
                            />
                            <span>{this.capitalizeFirstLetter(taxonomy)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Palette controls - only shown when showPaletteControls prop is true */}
                    {this.props.showPaletteControls && (
                      <div className={styles.paletteControlsContainer}>
                        <OverlayTrigger
                          key={'random'}
                          placement={'top'}
                          overlay={<Tooltip id={'tooltip-right'}>Generate a random color palette.</Tooltip>}
                        >
                          <button className={styles.paletteButton} onClick={this.handleGenerateColorPalette}>
                            <i className={'fa fa-refresh'}></i>
                            <span>Random Palette</span>
                          </button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          key={'reset'}
                          placement={'top'}
                          overlay={<Tooltip id={'tooltip-right'}>Restart palette to a single color.</Tooltip>}
                        >
                          <button className={styles.paletteButton} onClick={this.handleRestartColorPalette}>
                            <i className={'fa fa-paint-brush'}></i>
                            <span>Reset Palette</span>
                          </button>
                        </OverlayTrigger>
                      </div>
                    )}
                  </div>
                )}
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

        {/* Colors Legend positioned outside the panel - only visible when styling is enabled AND a taxonomy (not default) is selected */}
        {this.props.featuresOptionsEnabled && this.state.stylingEnabled && 
         this.state.featuresColorTaxonomy && 
         this.state.featuresColorTaxonomy !== '' && 
         this.state.featuresColorTaxonomy !== 'default' && 
         this.state.featuresColorGroups.length > 0 && (
          <div className={`${styles.colorsLegend} ${this.state.activePanel === null ? styles.colorsLegendExternal : styles.colorsLegendWithPanel}`}>
            {/* Button container - will be hidden/shown on hover */}
            <div>
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
                  className={isDisabled ? styles.disabledColorGroup : ''}
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
                    <div className={styles.colorPickerContainer}>
                      {/* Invisible overlay to capture clicks outside the picker */}
                      <div
                        style={{ position: 'fixed', top: '0px', right: '0px', left: '0px', bottom: '0px' }}
                        onClick={this.handleClose}
                      />
                      
                      <div 
                        onMouseLeave={this.handleClose}
                        onMouseEnter={this.handleColorPickerMouseEnter}
                        style={{
                          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                          opacity: 1,
                          transform: 'scale(1)'
                        }}
                        className="swatches-picker-wrapper"
                      >
                        <SwatchesPicker
                          color={this.state.groupColorAssociations[group]}
                          onChange={(color) => {
                            this.handleColorPickerChange(color, group);
                            // Close the color picker after selecting a color
                            this.handleClose();
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        
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
    // Only set colors for groups that have the default color (no custom user selection)
    for (let label in groupColorAssociationsClone) {
      let labelLowercased = label.toLowerCase();
      
      // Check if this group already has a user-selected custom color
      // (i.e., not the default color and not a palette-assigned color from props)
      const existingColor = groupColorAssociationsClone[label];
      const isDefaultOrEmpty = !existingColor || 
                              existingColor === this.defaultFeaturesColor || 
                              existingColor === '';
      
      // Only apply palette/default colors to groups that don't have custom colors
      if (isDefaultOrEmpty) {
        if (featuresColorsPaletteLowercased.hasOwnProperty(labelLowercased)) {
          // Use the color from featuresColorsPalette
          groupColorAssociationsClone[label] = featuresColorsPaletteLowercased[labelLowercased];
        } else {
          // Assign the default color
          groupColorAssociationsClone[label] = defaultColor;
        }
      }
      // If not default/empty, preserve the existing user-selected color
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
    // Preserve existing color associations for groups that already have custom colors
    let colorGroups = { ...this.state.groupColorAssociations };
    let displayColorPickerNew = { ...this.state.displayColorPicker };
    let groupDisabled = { ...this.state.groupDisabled };
    
    // Only initialize NEW groups, preserve existing ones
    groups.forEach((group) => {
      if (!(group in colorGroups)) {
        colorGroups[group] = this.defaultFeaturesColor;
      }
      if (!(group in displayColorPickerNew)) {
        displayColorPickerNew[group] = false;
      }
      if (!(group in groupDisabled)) {
        groupDisabled[group] = false;
      }
    });
    
    this.setState(
      {
        groupColorAssociations: colorGroups,
        displayColorPicker: displayColorPickerNew,
        groupDisabled: groupDisabled,
      },
      () => {
        console.log('GroupColorassociations initialized (preserving existing). Here are the associations:');
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

  /**
   * Get geometry/feature layers from the map layers
   * These are VectorLayers with level='feature'
   */
  private getGeometryLayers(): any[] {
    return this.state.mapLayers.filter(layer => 
      layer.get('level') === 'feature' || layer instanceof VectorLayer
    );
  }
  
  /**
   * Get overlay/tile layers from the map layers
   * These are TileLayers with level='overlay'
   */
  private getOverlayLayers(): any[] {
    return this.state.mapLayers.filter(layer => layer.get('level') === 'overlay');
  }

  private setMapLayerProperty(identifier, propertyName, propertyValue) {
    // Find and update the specific layer using proper OpenLayers methods
    const layer = this.state.mapLayers.find(l => l.get('identifier') === identifier);
    
    if (!layer) {
      console.warn(`Layer with identifier "${identifier}" not found`);
      return;
    }
    
    // Use proper OpenLayers methods for visibility and opacity
    // This ensures the actual layer rendering is updated, not just metadata
    if (propertyName === 'visible') {
      layer.setVisible(propertyValue);
      console.log(`[MapControls] Set layer "${identifier}" visible: ${propertyValue}`);
    } else if (propertyName === 'opacity') {
      layer.setOpacity(propertyValue);
      console.log(`[MapControls] Set layer "${identifier}" opacity: ${propertyValue}`);
    } else {
      // For other properties, use the generic set method
      layer.set(propertyName, propertyValue);
    }
    
    // Check if this is a features/geometry layer vs a tile/overlay layer
    const isFeatureLayer = layer.get('level') === 'feature' || layer instanceof VectorLayer;
    
    // For features layers, don't reset visualization mode - just update the layer directly
    // Features layers are independent of the tile layer visualization modes
    if (isFeatureLayer) {
      // Force re-render without changing any other state
      this.forceUpdate();
    } else {
      // For tile/overlay layers, reset visualization mode when changing visibility
      if (propertyName === 'visible') {
        this.setState(
          { 
            overlayVisualization: 'normal'
          }, 
          () => {
            this.triggerSendLayers();
            // Trigger normal visualization mode
            this.triggerVisualization('normal');
          }
        );
      } else {
        // For other property changes on tile layers, just sync with map
        this.triggerSendLayers();
      }
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
