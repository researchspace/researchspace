import { Props, createElement } from 'react';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Component, ComponentContext } from 'platform/api/components';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import SemanticMap, { SemanticMapConfig, SemanticMapProps } from 'platform/components/semantic/map/SemanticMap';
import { trigger, listen } from 'platform/api/events';
import {
  SemanticMapControlsOverlayOpacity,
  SemanticMapControlsOverlayVisualization,
  SemanticMapControlsOverlaySwipe,
  SemanticMapControlsFeatureColor,
} from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';
import ColorPicker, { RgbColor } from 'react-pick-color';
import ColorObject from 'react-pick-color';
import useColor from 'react-pick-color';
import { themes } from "react-pick-color";
import { string } from 'prop-types';

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
  id: string;
  color: typeof ColorObject;
  setColor:typeof ColorObject;
}

export class SemanticMapControls extends Component<State, any> {
  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
      overlayOpacity: 1,
      swipeValue: 100,
      overlayVisualization: 'normal',
      color: 'rgba(200,50,50,0.5)',
      setColor: 'rgba(200,50,50,0.5)',
    };
  }

  public componentDidMount() {
    
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
              this.setState({ swipeValue: input2 }, () => this.triggerSwipe(this.state.swipeValue));
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
            console.log("sending")
            console.log(color);
            this.setState({setColor: color}, () => this.triggerFeatureColor(this.state.setColor));
          }
        })
    );
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
    });
  };

  private triggerOpacity = (opacity: number) => {
    trigger({
      eventType: SemanticMapControlsOverlayOpacity,
      source: this.props.id,
      data: opacity,
    });
  };

  private triggerSwipe = (swipeValue: number) => {
    trigger({
      eventType: SemanticMapControlsOverlaySwipe,
      source: this.props.id,
      data: swipeValue,
    });
  };

  private triggerVisualization = (visualization: string) => {
    trigger({
      eventType: SemanticMapControlsOverlayVisualization,
      source: this.props.id,
      data: visualization,
    });
    switch (visualization){
      case "swipe": {
        this.triggerSwipe(this.state.swipeValue)
      }
    }

  };
}

export default SemanticMapControls;
