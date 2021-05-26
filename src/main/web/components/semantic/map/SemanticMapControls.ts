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
} from './SemanticMapControlsEvents';
import * as D from 'react-dom-factories';
import * as block from 'bem-cn';

const b = block('overlay-comparison');

const sliderbar: CSSProperties = {
  width: '100%',
};

interface State {
  overlayOpacity?: number;
  overlayVisualization?: string;
  loading?: boolean;
  id: string;
}

export class SemanticMapControls extends Component<State, any> {
  constructor(props: any, context: ComponentContext) {
    super(props, context);
    this.state = {
      overlayOpacity: 1,
      overlayVisualization: 'normal',
    };
  }

  public componentDidMount() {
    console.log('mounted');
  }

  public render() {
    return D.div(
      null,
      D.label(
        { style: sliderbar },
        'Visualization mode',
        D.br(),
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
        )
      ),
      D.br(),
      D.br(),
      D.label(
        { style: sliderbar },
        'Layer Opacity',
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
      )
    );
  }

  private triggerOpacity = (opacity: number) => {
    trigger({
      eventType: SemanticMapControlsOverlayOpacity,
      source: this.props.id,
      data: opacity,
    });
  };

  private triggerVisualization = (visualization: string) => {
    trigger({
      eventType: SemanticMapControlsOverlayVisualization,
      source: this.props.id,
      data: visualization,
    });
  };
}

export default SemanticMapControls;
