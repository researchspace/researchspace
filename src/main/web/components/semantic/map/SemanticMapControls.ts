import { Props, createElement } from 'react';
import * as React from 'react';
import {Component, ComponentContext} from "platform/api/components";
import XYZ from "ol/source/XYZ";
import OSM from "ol/source/OSM";
import SemanticMap, {SemanticMapConfig, SemanticMapProps} from "platform/components/semantic/map/SemanticMap";
import { trigger, listen } from 'platform/api/events';
import { SemanticMapControlsOverlayOpacity } from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';

const b = block('overlay-comparison');

interface State {
    overlayOpacity?: number;
    loading?: boolean;
  }
  

export class SemanticMapControls extends Component<State, any>{

  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
        overlayOpacity: 0.5
    };
  }

  public componentDidMount() {
    console.log("mounted")
  }

  public render() {
    return (
            D.input({
                className: "ginelli",
                type: 'range',
                min: 0,
                max: 1,
                step: 0.01,
                value: this.state.overlayOpacity as any,
                onChange: (event) => {
                  const input = event.target as HTMLInputElement;
                  const opacity = parseFloat(input.value);
                  const capped = isNaN(opacity) ? 0.5 : Math.min(1, Math.max(0, opacity));
                  this.setState({ overlayOpacity: capped });
                  this.triggerOpacity(this.state.overlayOpacity);
                },
              })
    );
  }

  private triggerOpacity = (opacity: number) => {
    trigger({
      eventType: SemanticMapControlsOverlayOpacity,
      source: this.props.id,
      data: opacity
    });
  }
}

export default SemanticMapControls;

