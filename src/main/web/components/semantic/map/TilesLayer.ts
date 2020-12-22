import { Props, createElement } from 'react';
import * as React from 'react';
import {Component, ComponentContext} from "platform/api/components";
import XYZ from "ol/source/xyz";
import OSM from "ol/source/osm";
import SemanticMap, {SemanticMapConfig, SemanticMapProps} from "platform/components/semantic/map/SemanticMap";
import * as maybe from "data.maybe";
import {findDOMNode} from "react-dom";


interface ProviderOptions {
  endpoint: string;
  crs: string;
  style: string;
}

enum Source {
  OSM = 'osm',
  MapBox = 'mapbox'
}

export interface ProviderConfig {
  /**
   * Optional enum for calling the selected OpenLayer source
   * ENUM { "mapbox", "osm"}
   */
  provider?: Source;

  /**
   * Optional JSON object containing various user provided options
   */
  providerOptions?: ProviderOptions;


  receiveProviderFromChild?: any; 
}

export type ProviderProps = ProviderConfig & Props<any>;

export class TilesLayer extends Component<ProviderProps, any>{

  constructor(props: ProviderProps, context: ComponentContext) {
    super(props, context);
  }

  public componentDidMount() {
    let newProvider;
    switch (this.props.provider) {
      case Source.MapBox: {
        newProvider = new XYZ({
          url: 'http://localhost:10214/proxy/mapbox/styles/v1/' +
            this.props.providerOptions.style + '/tiles/256/{z}/{x}/{y}'
        });
        break;
      }
      default: {
        newProvider = new OSM({});
        break;
      }
    }
    this.sendProviderToParent(newProvider)
  }

  public render() {
    return null;
  }

  private sendProviderToParent(provider){
    this.props.receiveProviderFromChild(provider);
  }
}

export default TilesLayer;

