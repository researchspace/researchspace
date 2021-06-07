import { Props, createElement } from 'react';
import * as React from 'react';
import {Component, ComponentContext} from "platform/api/components";
import XYZ from "ol/source/XYZ";
import OSM from "ol/source/OSM";
import SemanticMap, {SemanticMapConfig, SemanticMapProps} from "platform/components/semantic/map/SemanticMap";
import * as maybe from "data.maybe";
import {findDOMNode} from "react-dom";


export interface ProviderConfig {
  level: String;

  name: String;

  identifier: String;

  url: String;
}

export type ProviderProps = ProviderConfig & Props<any>;

export class TilesLayer extends Component<ProviderProps, any>{

  constructor(props: ProviderProps, context: ComponentContext) {
    super(props, context);
  }

  public componentDidMount() {

  }

  public render() {
    return null;
  }
}

export default TilesLayer;

