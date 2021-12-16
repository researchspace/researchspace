import * as React from 'react';
import { CSSProperties } from 'react';
import { Component, ComponentContext } from 'platform/api/components';
import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import {
  SemanticMapControlsOverlayVisualization,
  SemanticMapControlsOverlaySwipe,
  SemanticMapControlsFeatureColor,
  SemanticMapSendMapLayers,
  SemanticMapControlsSyncFromMap,
  SemanticMapControlsSendMapLayersToMap,
  SemanticMapControlsSendMaskIndexToMap,
  SemanticMapControlsSendFeaturesLabelToMap,
  SemanticMapControlsSendFeaturesColorTaxonomyToMap,
  SemanticMapControlsSendGroupColorsAssociationsToMap,
  SemanticMapControlsSendToggle3d
} from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';

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
}

interface Props {
  targetMapId: string;
  id: string;
  featuresTaxonomies: string;
  featuresColorTaxonomies: string;
  featuresOptionsEnabled: boolean;
  //TODO: optionals
  filtersInitialization: Filters;
  showFilters: boolean;
}

export class SemanticMapControls extends Component<Props, State> {
  private cancelation = new Cancellation();
  private featuresTaxonomies = [];
  private featuresColorTaxonomies = [];
  private defaultFeaturesColor = 'rgba(200,50,50,0.5)';
  //TODO: optionals
  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
      overlayOpacity: 1,
      swipeValue: 100,
      overlayVisualization: 'normal',
      color: 'rgba(200,50,50,0.5)',
      setColor: 'rgba(200,50,50,0.5)',
      mapLayers: [],
      maskIndex: -1,
      filters: this.props.filtersInitialization,
      selectedFeaturesLabel: '',
      featuresColorTaxonomy: this.featuresColorTaxonomies[0],
      featuresColorGroups: [],
      displayColorPicker: {},
      groupColorAssociations: {},
      year: 1500,
    };

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
      .onValue(this.initializeMapLayers);

    this.onDragEnd = this.onDragEnd.bind(this);
  }

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
    let groupColorAssociationsClone = this.state.groupColorAssociations;
    groupColorAssociationsClone[group] = color;
    this.setState(
      {
        groupColorAssociations: groupColorAssociationsClone,
      },
      () => {
        console.log(this.state.groupColorAssociations);
        this.triggerSendFeaturesColorsAssociationsToMap();
      }
    );
  }

  private onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    //Drag also the mask in case it corresponds to the dragged layer
    if (result.source.index == this.state.maskIndex) {
      this.setMaskIndex(result.destination.index);
    }

    //TODO: if destination position is occupied by a masklayer, remove the visualization mode
    if (result.destination.index == this.state.maskIndex) {
      this.setMaskIndex(-1);
    }

    const mapLayers = this.reorder(this.state.mapLayers, result.source.index, result.destination.index);

    this.setState(
      {
        mapLayers,
      },
      () => {
        this.triggerSendLayersToMap();
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

  private triggerSendMaskIndexToMap(index: number) {
    trigger({
      eventType: SemanticMapControlsSendMaskIndexToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: index,
    });
  }

  public componentDidMount() {
    trigger({ eventType: SemanticMapControlsSyncFromMap, source: this.props.id, targets: [this.props.targetMapId] });
    console.log("MONTO e setto color taxonomy")
    this.setFeaturesColorTaxonomy();
    this.initializeGroupColorAssociations(this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, this.getAllVectorLayers(this.state.mapLayers)));
  }

  public componentWillMount() {
    this.featuresTaxonomies = this.props.featuresTaxonomies.split(',');
    this.featuresColorTaxonomies = this.props.featuresColorTaxonomies.split(',');
    console.log(this.props.filtersInitialization);
  }

  public componentWillUnmount() {}

  public componentDidUpdate(PrevProps, prevState) {
    //Group Color associations
    if (JSON.stringify(this.state.groupColorAssociations) !== JSON.stringify(prevState.groupColorAssociations)) {
      console.log('%cGroupColors Associations  È Cambiato! Prima era:', 'color: green; font-size: 20px');
      console.log(JSON.stringify(prevState.groupColorAssociations));
      console.log('Ora è: ');
      console.log(JSON.stringify(this.state.groupColorAssociations));
      console.log('%c************************', 'color: green; font-size: 20px');

      this.triggerSendFeaturesColorsAssociationsToMap();
    } else {
      console.log('%cGroupColors Associations NON È Cambiato! Prima era:', 'color: red; font-size: 20px');
      console.log(JSON.stringify(prevState.groupColorAssociations));
      console.log('Ora è: ');
      console.log(JSON.stringify(this.state.groupColorAssociations));
      console.log('%c************************', 'color: red; font-size: 20px');
    }

    //Color Taxonomy
    if (JSON.stringify(this.state.featuresColorTaxonomy) !== JSON.stringify(prevState.featuresColorTaxonomy)) {
      console.log('%cÈ Cambiato! Prima era:', 'color: orange; font-size: 20px');
      console.log(prevState.featuresColorTaxonomy);
      this.triggerSendFeaturesColorTaxonomy();
    }

    //Map Layers, check for taxonomyGroups updates
    let newFeatures = this.getAllVectorLayers(this.state.mapLayers);
    let oldFeatures = this.getAllVectorLayers(prevState.mapLayers);
    let newGroups = this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, newFeatures);
    let oldGroups = this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, oldFeatures);
    if (this.arraysMatch(newGroups, oldGroups)) {
      console.log('I TAXONOMYGROUPS Sono UGUALI: ');
    } else {
      console.log('I TAXONOMYGROUPS Sono DIVERSI: ');
    }
    console.log(newGroups);
    console.log(oldGroups);
  }

  private arraysMatch(arr1, arr2) {
    // Check if the arrays are the same length
    if (arr1.length !== arr2.length) return false;

    arr1 = arr1.sort();
    arr2 = arr2.sort();

    // Check if all items exist and are in the same order
    for (var i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }

    // Otherwise, return true
    return true;
  }

  //COLOR PICKER

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

  //TODO: MOVE ALL THE STYLING TO RS

  public render() {
    const styles = reactCSS({
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

    return D.div(
      null,
      // <div className={'featuresOptionsContainer'}>
      //   {/* <h3 className={'mapOptionsSectionTitle'}>3D</h3> */}
      // </div>,
      <div style={{display: 'none'}}
      className={'timeSliderContainer'}>
        <input
          type={'range'}
          className={'timelineSlider'}
          min={1500}
          max={1800}
          step={1}
          value={this.state.year}
          onChange={(event) => {
            const input = event.target as HTMLInputElement;
            const value = parseInt(input.value);
            console.log(value);
            this.setState({
              year: value

            })
          }}
        ></input>
        <div style={{position: 'fixed', bottom:'10', left:'10', fontSize:'20pt'}}>{this.state.year}</div>
      </div>,
      (this.props.featuresOptionsEnabled && <div className={'featuresOptionsContainer'}>
        <h3 className={'mapOptionsSectionTitle'}>Options</h3>
        <div
          className={'toggle3dBtn'}
          onClick={() => this.triggerSendToggle3d()}
          style={{cursor: "pointer"}}
        ><i className="fa fa-cube" aria-hidden="true"></i> Toggle 3d</div>
        <div className={'mapLayersFiltersContainer'}>
          <div>
        <label style={{ marginRight: '10px', userSelect: 'none'}}>Label by: </label>
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
        <div className={'mapControlsSeparator'} style={{ margin: '0px !important' }}></div>
        <div>
        <label style={{ marginRight: '10px', userSelect: 'none'}}>Color by: </label>
        <select name="featuresColorsList" id="featuresColorsList" onChange={this.handleColorTaxonomyChange}>
          {this.featuresColorTaxonomies.map((taxonomy) => (
            <option key={taxonomy} value={taxonomy}>
              {this.capitalizeFirstLetter(taxonomy)}
            </option>
          ))}
        </select>
        <OverlayTrigger
          key={'random'}
          placement={'top'}
          overlay={
            <Tooltip id={'tooltip-right'}>
              Generate a random color palette.
            </Tooltip>
          }
        >
          <i
            className={'fa fa-refresh'}
            style={{ display: 'inline-block', cursor: 'pointer', marginLeft: '10px', userSelect: 'none'}}
            onClick={this.handleGenerateColorPalette}
          ></i>
        </OverlayTrigger>
        <OverlayTrigger
          key={'reset'}
          placement={'top'}
          overlay={
            <Tooltip id={'tooltip-right'}>
              Restart palette to a single color.
            </Tooltip>
          }
        >
        <i
          className={'fa fa-paint-brush'}
          style={{ display: 'inline-block', cursor: 'pointer', marginLeft: '10px', userSelect: 'none'}}
          onClick={this.handleRestartColorPalette}
        ></i>
        </OverlayTrigger>
        <div>
          {this.state.featuresColorGroups.map((group, index) => (
            <div key={group} id={'color-' + group} style={{ display: 'flex', alignItems: 'center', margin: '5px' }}>
              <div
                style={styles.swatch}
                onClick={() => {
                  this.handleColorpickerClick(group);
                }}
              >
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: this.getRgbaString(group),
                  }}
                />
              </div>
              <label style={{ marginLeft: '5px', marginBottom: '0px' }}>{group}</label>
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
          ))}
          </div>
        </div>
        </div>
      </div>),
      D.br(),
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={'layersContainer'}>
              {/* <h3 className={'mapLayersTitle'}>Map Layers</h3> */}
              {this.props.showFilters && <div className="mapLayersFiltersContainer">
                <label>Filter:</label>
                <input
                  className="mapLayersFilters"
                  name={'overlay-visualization'}
                  type={'checkbox'}
                  checked={this.state.filters.feature}
                  onChange={(event) => {
                    this.setState({ filters: { ...this.state.filters, feature: event.target.checked } }, () => {});
                  }}
                ></input>
                <label className="fitersLabel">Features</label>
                <input
                  className="mapLayersFilters"
                  name={'overlay-visualization'}
                  type={'checkbox'}
                  checked={this.state.filters.overlay}
                  onChange={(event) => {
                    this.setState({ filters: { ...this.state.filters, overlay: event.target.checked } }, () => {});
                  }}
                ></input>
                <label className="fitersLabel">Overlays</label>
                <input
                  className="mapLayersFilters"
                  name={'overlay-visualization'}
                  type={'checkbox'}
                  checked={this.state.filters.basemap}
                  onChange={(event) => {
                    this.setState({ filters: { ...this.state.filters, basemap: event.target.checked } }, () => {});
                  }}
                ></input>
                <label className="fitersLabel">Basemaps</label>
              </div>}
              {/* <hr className={'mapControlsSeparator'} style={{ margin: '0px !important' }}></hr> */}
              {this.state.mapLayers.map(
                (mapLayer, index) =>
                  this.state.filters[mapLayer.get('level')] && (
                    <Draggable key={mapLayer.get('identifier')} draggableId={mapLayer.get('identifier')} index={index}>
                      {(provided, snapshot) => (
                        <div
                          className={`draggableLayer ${mapLayer.get('visible') ? 'visible' : 'nonvisible'}`}
                          ref={provided.innerRef}
                          style={{ border: '1px solid red !important;', borderRadius: '2px' }}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div className="togglesColumnLeft">
                            <i className="fa fa-bars"></i>
                          </div>
                          <div style={{ verticalAlign: 'middle', display: 'inline-block' }}>
                            <img src={mapLayer.get('thumbnail')} className={'layerThumbnail'}></img>
                          </div>
                          <div style={{ display: 'inline-block', verticalAlign: 'middle', padding: '10px' }}>
                            <div style={{ width: '250px' }}>
                              <label className={'layerTitle'}>{mapLayer.get('author')}</label>
                              <div>
                                <label className={'layerLabel'}><span>{mapLayer.get('name')}</span></label>
                                <label className={'layerLabel'}>{mapLayer.get('year')}</label>
                                {/*<label className={'layerLabel'}>{mapLayer.get('location')}</label>*/}
                                <input
                                  type={'range'}
                                  className={'opacitySlider'}
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
                          </div>
                          <div className="togglesColumnRight" style={{ display: 'inline-block' }}>
                            {mapLayer.get('visible') && (
                              <i
                                className="fa fa-toggle-on layerCheck"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  this.setMapLayerProperty(mapLayer.get('identifier'), 'visible', false);
                                  if (this.state.maskIndex == index) {
                                    this.setMaskIndex(-1);
                                  }
                                }}
                              ></i>
                            )}
                            {!mapLayer.get('visible') && (
                              <i
                                className="fa fa-toggle-off layerCheck"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  this.setMapLayerProperty(mapLayer.get('identifier'), 'visible', true);
                                }}
                              ></i>
                            )}
                            {this.state.maskIndex == index && (
                              <i
                                className="fa fa-eye layerMaskIcon"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  this.setMaskIndex(-1);
                                }}
                              ></i>
                            )}
                            {this.state.maskIndex !== index && (
                              <i
                                className="fa fa-eye-slash layerMaskIcon"
                                style={{ cursor: 'pointer', color: 'rgba(200,200,200,1)' }}
                                onClick={() => {
                                  if (!mapLayer.get('visible')) {
                                    this.setMapLayerProperty(mapLayer.get('identifier'), 'visible', true);
                                  }
                                  this.setMaskIndex(index);
                                }}
                              ></i>
                            )}
                          </div>
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
                              {this.state.overlayVisualization === 'swipe' && (
                                <input
                                  id={'swipe'}
                                  type={'range'}
                                  min={0}
                                  max={100}
                                  step={1}
                                  style={{ width: '100%' }}
                                  value={this.state.swipeValue as any}
                                  onChange={(event) => {
                                    const input = event.target as HTMLInputElement;
                                    const input2 = input.value;
                                    this.setState({ swipeValue: Number(input2) }, () =>
                                      this.triggerSwipe(this.state.swipeValue)
                                    );
                                  }}
                                ></input>
                              )}
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
      </DragDropContext>,
      D.br()
    );
  }

  private reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  private initializeMapLayers = (event: any) => {
    this.setState(
      {
        mapLayers: event.data,
      },
      () => {
        console.log("Controls '" + this.props.id + "': layers synced from map '" + this.props.targetMapId + "'");
        console.log(event.data);
      }
    );
  };

  private setFeaturesColorTaxonomy() {
    let groups = this.getGroupsFromTaxonomy(this.state.featuresColorTaxonomy, this.getAllVectorLayers());
    this.setState(
      {
        featuresColorGroups: groups,
      },
      () => {
        console.log("Settate oclortaxonomi")
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
            let grouping = feature.get(taxonomy).value;
            if (!groups.includes(grouping)) {
              groups.push(grouping);
            }
          });
      });
    }
    return groups;
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
    let colorNumbers = this.state.featuresColorGroups.length;
    let palette = [];
    let hueFraction = 360 / colorNumbers;
    let seed = Math.floor(Math.random() * 360);
    for (let i = 0; i < colorNumbers; i++) {
      let generatedAngle = hueFraction * i + seed;
      if (generatedAngle > 360) {
        generatedAngle -= 360;
      }
      palette.push({
        h: generatedAngle.toString(),
        s: '0.8',
        l: '0.7',
        a: '0.4',
      });
    }
    //Update state with generated palette
    let groupColorAssociationsClone = this.state.groupColorAssociations;
    let _i = 0;
    for (let association in groupColorAssociationsClone) {
      //groupColorAssociationsClone[association] = "hsv(" + palette[_i].h + ","+palette[_i].s+","+palette[_i].v+",0.4)";
      let rgbstring = 'hsl(' + palette[_i].h + ',70%, 40%, 0.5)';
      groupColorAssociationsClone[association] = rgbstring;
      _i++;
    }
    console.log('NEW ASSOCIATIONS BEFORE STATE:');
    console.log(groupColorAssociationsClone);
    this.setState(
      {
        groupColorAssociations: groupColorAssociationsClone,
      },
      () => {
        console.log('Ecco il nuovo associationsssssssss');
        console.log(this.state.groupColorAssociations);
        this.triggerSendFeaturesColorsAssociationsToMap();
      }
    );
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

  private capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private getRgbaString(group) {
    let rgba_string = '';
    if (
      group in this.state.groupColorAssociations &&
      this.state.groupColorAssociations[group] &&
      this.state.groupColorAssociations[group] !== this.defaultFeaturesColor &&
      this.state.groupColorAssociations[group] !== ''
    ) {
      if (typeof this.state.groupColorAssociations[group] === 'string') {
        return this.state.groupColorAssociations[group];
      } else {
        let color = this.state.groupColorAssociations[group];
        let color_rgba = color.rgb;
        rgba_string = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + '0.4' + ')';
      }
    } else {
      rgba_string = this.defaultFeaturesColor;
    }
    return rgba_string;
  }

  private initializeGroupColorAssociations(groups: string[]) {
    let colorGroups = {};
    let displayColorPickerNew = {};
    groups.forEach((group) => {
      colorGroups[group] = this.defaultFeaturesColor;
      displayColorPickerNew[group] = false;
    });
    this.setState(
      {
        groupColorAssociations: colorGroups,
        displayColorPicker: displayColorPickerNew,
      },
      () => {
        console.log('GroupColorassociations intialized.');
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

    this.setState({ mapLayers: mapLayersClone }, () => {
      this.triggerSendLayersToMap();
    });
  }

  private triggerSendToggle3d() {
    console.log("fired 3d");
    trigger({
      eventType: SemanticMapControlsSendToggle3d,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: "toggle"
    });
  }

  private triggerSendFeaturesColorsAssociationsToMap() {
    //console.log('%cSENDING FEATURES COLORS ASSOCIATIONS', 'color: yellow; font-size: 15px');
    //console.log(this.state.groupColorAssociations);
    //console.log('%c*************************', 'color: yellow; font-size: 15px');
    trigger({
      eventType: SemanticMapControlsSendGroupColorsAssociationsToMap,
      source: this.props.id,
      data: this.state.groupColorAssociations,
      targets: [this.props.targetMapId],
    });
  }
  /*
  private triggerFeatureColor = (color: any) => {
    let color_rgba = color.rgb;
    let rgba_string: string;
    rgba_string = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + '0.3' + ')';
    trigger({
      eventType: SemanticMapControlsFeatureColor,
      source: this.props.id,
      data: rgba_string,
      targets: [this.props.targetMapId],
    });
  };
  */

  private triggerSwipe = (swipeValue: number) => {
    trigger({
      eventType: SemanticMapControlsOverlaySwipe,
      source: this.props.id,
      data: swipeValue,
      targets: [this.props.targetMapId],
    });
  };

  private triggerSendLayersToMap() {
    trigger({
      eventType: SemanticMapControlsSendMapLayersToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.mapLayers,
    });
  }

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
        this.triggerSwipe(this.state.swipeValue);
      }
    }
  };
}

export default SemanticMapControls;
