import { createElement } from 'react';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Component, ComponentContext } from 'platform/api/components';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import SemanticMap, { SemanticMapConfig, SemanticMapProps } from 'platform/components/semantic/map/SemanticMap';
import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import {
  SemanticMapControlsOverlayOpacity,
  SemanticMapControlsOverlayVisualization,
  SemanticMapControlsOverlaySwipe,
  SemanticMapControlsFeatureColor,
  SemanticMapSendTilesLayers,
  SemanticMapControlsSyncFromMap,
  SemanticMapControlsSendTilesLayersToMap,
  SemanticMapControlsSendMaskIndexToMap,
} from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';
import ColorPicker, { RgbColor } from 'react-pick-color';
import ColorObject from 'react-pick-color';
import useColor from 'react-pick-color';
import { themes } from 'react-pick-color';
import { string } from 'prop-types';
import { check } from 'basil.js';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { identityTransform } from 'ol/proj';
import { source } from 'react-dom-factories';

const colorPickerComponent = React.createFactory(ColorPicker);

const DragDropContextComponent = React.createFactory(DragDropContext);
const DroppableComponent = React.createFactory(Droppable);
const DraggableComponent = React.createFactory(Draggable);

const b = block('overlay-comparison');

const sliderbar: CSSProperties = {
  width: '100%',
};

interface State {
  overlayOpacity?: number;
  swipeValue?: number;
  overlayVisualization?: string;
  loading?: boolean;
  color: any;
  setColor: any;
  tilesLayers: Array<any>;
  maskIndex: number;
}

interface Props {
  targetMapId: string;
  id: string;
}

export class SemanticMapControls extends Component<Props, State> {
  private cancelation = new Cancellation();

  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
      overlayOpacity: 1,
      swipeValue: 100,
      overlayVisualization: 'normal',
      color: 'rgba(200,50,50,0.5)',
      setColor: 'rgba(200,50,50,0.5)',
      tilesLayers: [],
      maskIndex: 1,
    };

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapSendTilesLayers,
        })
      )
      .onValue(this.initializeTilesLayers);

    this.onDragEnd = this.onDragEnd.bind(this);
  }

  private onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    //Drag also the mask in case it corresponds to the dragged layer
    if (result.source.index == this.state.maskIndex){
      this.setMaskIndex(result.destination.index)
    }

    //TODO: if destination has masklayer, do not attach to new layer (move it to the previous which should be index+1?)

    console.log('result');
    console.log(result);

    const tilesLayers = this.reorder(this.state.tilesLayers, result.source.index, result.destination.index);

    this.setState(
      {
        tilesLayers,
      },
      () => {
        this.triggerSendLayersToMap();
      }
    );
  };

  private setMaskIndex(index: number){  
    this.setState({
      maskIndex: index,
      overlayVisualization: 'normal'
    }, ()=>{
      this.triggerVisualization(this.state.overlayVisualization)
      this.triggerSendMaskIndexToMap(index);
    })
  }

  private triggerSendMaskIndexToMap(index: number){
    trigger({
      eventType: SemanticMapControlsSendMaskIndexToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: index
    })
  }

  public componentDidMount() {
    trigger({ eventType: SemanticMapControlsSyncFromMap, source: this.props.id, targets: [this.props.targetMapId] });
  }

  public render() {
    return D.div(
      null,
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={'layersContainer'}>
              <h3 className={'mapLayersTitle'}>Tiles Layers</h3>
              <hr id={'tilesLayerSeparator'} style={{ margin: '0px !important' }}></hr>
              {this.state.tilesLayers.map((tilesLayer, index) => (
                <Draggable key={tilesLayer.get('identifier')} draggableId={tilesLayer.get('identifier')} index={index}>
                  {(provided, snapshot) => (
                    <div
                      className="draggableLayer"
                      ref={provided.innerRef}
                      style={{ border: '1px solid red !important;', borderRadius: '2px' }}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div
                        className="togglesColumnLeft"
                      >
                        <i className="fa fa-bars"></i>
                        </div>
                      <div style={{verticalAlign: 'middle', display: 'inline-block'}}>
                        <img src={tilesLayer.get('thumbnail')} className={'layerThumbnail'}></img>
                      </div>
                      <div style={{ display: 'inline-block', verticalAlign: 'middle', padding: '10px' }}>
                        <div style={{ width: 'auto' }}>
                          <label className={'layerName'}>{tilesLayer.get('name')}</label>
                          <div>
                            <label className={'layerLevelLabel'}>{tilesLayer.get('level')}</label>
                            <input
                              type={'range'}
                              className={'opacitySlider'}
                              min={0}
                              max={1}
                              step={0.01}
                              value={tilesLayer.get('opacity')}
                              onChange={(event) => {
                                const input = event.target as HTMLInputElement;
                                const opacity = parseFloat(input.value);
                                const capped = isNaN(opacity) ? 0.5 : Math.min(1, Math.max(0, opacity));
                                this.setTilesLayerProperty(tilesLayer.get('identifier'), 'opacity', capped);
                              }}
                            ></input>
                          </div>
                        </div>
                      </div>
                      <div className='togglesColumnRight' style={{display: 'inline-block'}}>
                      {tilesLayer.get('visible') && (
                          <i
                            className="fa fa-check-square-o layerCheck"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              this.setTilesLayerProperty(tilesLayer.get('identifier'), 'visible', false);
                            }}
                          ></i>
                        )}
                        {!tilesLayer.get('visible') && (
                          <i
                            className="fa fa-square-o layerCheck"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              this.setTilesLayerProperty(tilesLayer.get('identifier'), 'visible', true);
                            }}
                          ></i>
                        )}
                        {this.state.maskIndex == index && 
                        <i className="fa fa-eye layerMaskIcon" style={{cursor: "pointer"}} onClick={()=>{this.setMaskIndex(-1)}}></i>}
                        {this.state.maskIndex !== index &&
                        <i className="fa fa-eye-slash layerMaskIcon" style={{cursor: "pointer", color: 'rgba(230,230,230,1)'}} onClick={()=>{this.setMaskIndex(index)}}></i>}
                      </div>
                      {this.state.maskIndex == index && (
                        <div id={'visualizationModeContainer'}>
                            <input
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
                          <label style={{ margin: '2px;' }}>
                            Normal
                          </label>
                            <input
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
                          <label style={{ margin: '2px;' }}>
                            Spyglass</label>
                            <input
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
                          <label style={{ margin: '2px;' }}>
                            Swipe
                          </label>
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
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>,
      D.br(),
      D.label({}, 'Features Default Color'),
      D.br(),
      colorPickerComponent({
        theme: { width: '100px' },
        color: this.state.color,
        hideInputs: true,
        onChange: (color) => {
          this.setState({ setColor: color }, () => this.triggerFeatureColor(this.state.setColor));
        },
      })
    );
  }

  private reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  private getTilesLayerFromIdentifier(identifier) {
    let result;
    this.state.tilesLayers.forEach(function (tilesLayer) {
      if (tilesLayer.get('identifier') === identifier) {
        result = tilesLayer;
      }
    });
    return result;
  }

  private initializeTilesLayers = (event: any) => {
    this.setState(
      {
        tilesLayers: event.data,
      },
      () => {
        console.log('Control state tileslayers (initialization)');
        console.log(this.state.tilesLayers);
      }
    );
  };

  private setTilesLayerProperty(identifier, propertyName, propertyValue) {
    let tilesLayersClone = this.state.tilesLayers;
    tilesLayersClone.forEach(function (tilesLayer) {
      if (tilesLayer.get('identifier') === identifier) {
        tilesLayer.set(propertyName, propertyValue);
      }
    });

    this.setState({ tilesLayers: tilesLayersClone }, () => {
      this.triggerSendLayersToMap();
    });
  }

  private triggerFeatureColor = (color: any) => {
    let color_rgba: RgbColor;
    color_rgba = color.rgb;
    let rgba_string: string;
    rgba_string = 'rgba(' + color_rgba.r + ', ' + color_rgba.g + ', ' + color_rgba.b + ', ' + color_rgba.a + ')';
    trigger({
      eventType: SemanticMapControlsFeatureColor,
      source: this.props.id,
      data: rgba_string,
      targets: [this.props.targetMapId],
    });
  };

  /*
  private triggerOpacity = (opacity: number) => {
    trigger({
      eventType: SemanticMapControlsOverlayOpacity,
      source: this.props.id,
      data: opacity,
      targets: [this.props.targetMapId]
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
      eventType: SemanticMapControlsSendTilesLayersToMap,
      source: this.props.id,
      targets: [this.props.targetMapId],
      data: this.state.tilesLayers,
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
