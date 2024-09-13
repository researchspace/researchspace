import { Props, createElement } from 'react';
import * as React from 'react';
import {Component, ComponentContext} from "platform/api/components";
import XYZ from "ol/source/XYZ";
import OSM from "ol/source/OSM";
import SemanticMap, {SemanticMapConfig, SemanticMapProps} from "platform/components/semantic/map/SemanticMap";
import * as maybe from "data.maybe";
import {findDOMNode} from "react-dom";


export interface ProviderConfig {
  /**
   *  A String that can either be "basemap" or "overlay" 
   */
  level: String;

  /**
   * A String corresponding to the readable label name that can be displayed on fronted
   */
  name: String;

  /**
   * A String corresponding to the identifier
   */
  identifier: String;

  /**
   * A String corresponding to the URL Pattern of the API from which tilesets are loaded. Private Tokens SHOULD NOT be put here, consider using RS proxy system instead.  
   */
  url: String;

  author: String;

  location: String;

  year: String;
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

