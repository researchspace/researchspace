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
  SemanticMapControlsSyncFromMap
} from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';
import ColorPicker, { RgbColor } from 'react-pick-color';
import ColorObject from 'react-pick-color';
import useColor from 'react-pick-color';
import { themes } from "react-pick-color";
import { string } from 'prop-types';
import { check } from 'basil.js';

const colorPickerComponent = React.createFactory(ColorPicker);

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
  tilesLayers: Array<any>
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
      tilesLayers: []
    };

    this.cancelation
      .map(
        listen({
          eventType: SemanticMapSendTilesLayers
        })
      )
      .onValue(this.initializeTilesLayers);
  }

  

  public componentDidMount() {
    trigger({eventType: SemanticMapControlsSyncFromMap, source: this.props.id, targets:[this.props.targetMapId]});
  }

  public render() {
    return D.div(
      null,
      D.label(
        { style: sliderbar },
        'Visualization mode',
        D.br()
      ),
      D.br(),
        D.label(
          {},
          D.input({
            name: 'overlay-visualization',
            type: 'radio',
            value: 'normal',
            checked: this.state.overlayVisualization === 'normal',
            onChange: (event) => {
              this.setState({ overlayVisualization: event.target.value }, () =>
                this.triggerVisualization(this.state.overlayVisualization)
              );
            },
          }),
          'Normal'
        ),
        D.br(),
        D.label(
          {},
          D.input({
            name: 'overlay-visualization',
            type: 'radio',
            value: 'spyglass',
            onChange: (event) => {
              this.setState({ overlayVisualization: event.target.value }, () =>
                this.triggerVisualization(this.state.overlayVisualization)
              );
            },
          }),
          'Spyglass'
        ),
        D.br(),
        D.label(
          {},
          D.input({
            name: 'overlay-visualization',
            type: 'radio',
            value: 'swipe',
            onChange: (event) => {
              this.setState({ overlayVisualization: event.target.value }, () =>
                this.triggerVisualization(this.state.overlayVisualization)
              );
            },
          }),
          'Swipe'
        ),
      this.state.overlayVisualization === "swipe"
      ? D.label(
        { style: sliderbar },
        'Overlay Swipe',
        D.br(),
        D.input({
          id: "swipe",
          type: 'range',
            min: 0,
            max: 100,
            step: 1,
            style: {"width": "100%"},
            value: this.state.swipeValue as any,
            onChange: (event) => {
              const input = event.target as HTMLInputElement;
              const input2 = input.value;
              this.setState({ swipeValue: Number(input2) }, () => this.triggerSwipe(this.state.swipeValue));
            },
        })
      ) : (null),
      D.br(),
      D.br(),
      D.label(
        { style: sliderbar },
        'Overlay Opacity',
        D.br(),
        D.input({
          type: 'range',
          min: 0,
          max: 1,
          step: 0.01,
          value: this.state.overlayOpacity as any,
          onChange: (event) => {
            const input = event.target as HTMLInputElement;
            const opacity = parseFloat(input.value);
            const capped = isNaN(opacity) ? 0.5 : Math.min(1, Math.max(0, opacity));
            this.setState({ overlayOpacity: capped }, () => this.triggerOpacity(this.state.overlayOpacity));
          },
        })
      ),
      D.label(
        {},
        'Features Default Color',
      ),
      D.br(),
        colorPickerComponent({
          theme: {width: "100px"},
          color: this.state.color,
          hideInputs: true,
          onChange: (color) => {
            this.setState({setColor: color}, () => this.triggerFeatureColor(this.state.setColor));
          }
        }),
        D.h3(
          {},
          "Levels"
        ),
        this.state.tilesLayers.map((tilesLayer) => {
          return D.div(
            {style: {}},
            D.img({src: tilesLayer.get("thumbnail"), style: {height: "100px", width: "100px", objectFit: "cover", margin:"10px"}}),
            D.div({style: {display: "inline-block", verticalAlign: "top", padding: "10px"}},
              D.div({style:{width: "140px"}},              
                D.label({style: {fontWeight: "bold"}}, tilesLayer.get("name")),
                D.input({
                  type: "checkbox",
                  style: {marginLeft: "10px"},
                  checked: tilesLayer.get("visible"),
                  onChange: (event) => {
                    this.setTilesLayerProperty(tilesLayer.get("identifier"), "visible", event.target.checked);
                  }
                })
                ),
              D.div({},
                D.label({}, tilesLayer.get("level")),
                D.input({
                  type: 'range',
                  className: 'opacitySlider',
                  min: 0,
                  max: 1,
                  step: 0.01,
                  value: tilesLayer.get("opacity"),
                  onChange: (event) => {
                    const input = event.target as HTMLInputElement;
                    const opacity = parseFloat(input.value);
                    const capped = isNaN(opacity) ? 0.5 : Math.min(1, Math.max(0, opacity));
                    this.setTilesLayerProperty(tilesLayer.get("identifier"), "opacity", capped);
                  },
                })
                )
              )
          )
        })
    );
  }

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
    this.setState({
      tilesLayers: event.data
    }, () => {
      console.log(this.state.tilesLayers);
    })
  }

  private setTilesLayerProperty(identifier, propertyName, propertyValue){
    let tilesLayersClone = this.state.tilesLayers; 

    tilesLayersClone.forEach(function (tilesLayer) {
      if (tilesLayer.get('identifier') === identifier) {
        tilesLayer.set(propertyName, propertyValue);
      }
    });
    
    this.setState({tilesLayers: tilesLayersClone}, () => {
      console.log("State updated:")
      console.log(this.state.tilesLayers);
    })
  }

  private triggerFeatureColor = (color: any) => {
    let color_rgba: RgbColor;
    color_rgba = color.rgb;
    let rgba_string: string;
    rgba_string = "rgba(" + color_rgba.r + ", " + color_rgba.g + ", " + color_rgba.b + ", " + color_rgba.a + ")";
    trigger({
      eventType: SemanticMapControlsFeatureColor,
      source: this.props.id,
      data: rgba_string,
      targets: [this.props.targetMapId]
    });
  };

  private triggerOpacity = (opacity: number) => {
    trigger({
      eventType: SemanticMapControlsOverlayOpacity,
      source: this.props.id,
      data: opacity,
      targets: [this.props.targetMapId]
    });
  };

  private triggerSwipe = (swipeValue: number) => {
    trigger({
      eventType: SemanticMapControlsOverlaySwipe,
      source: this.props.id,
      data: swipeValue,
      targets: [this.props.targetMapId]
    });
  };

  private triggerVisualization = (visualization: string) => {
    trigger({
      eventType: SemanticMapControlsOverlayVisualization,
      source: this.props.id,
      data: visualization,
      targets: [this.props.targetMapId]
    });
    switch (visualization){
      case "swipe": {
        this.triggerSwipe(this.state.swipeValue)
      }
    }

  };
}

export default SemanticMapControls;
