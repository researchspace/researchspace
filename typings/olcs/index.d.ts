/**
 * Type declarations for olcs (OL-Cesium)
 * olcs is the ES module version of ol-cesium for use with ES module OpenLayers
 */
declare module 'olcs' {
  import Map from 'ol/Map';
  
  interface OLCesiumOptions {
    map: Map;
    resolutionScale?: number;
    target?: HTMLElement | string;
  }
  
  class OLCesium {
    constructor(options: OLCesiumOptions);
    setEnabled(enabled: boolean): void;
    getEnabled(): boolean;
    getCesiumScene(): any;
    getOlMap(): Map;
    getOlView(): any;
    setResolutionScale(scale: number): void;
    warmUp(date: Date, scene: any): void;
    destroy(): void;
  }
  
  export default OLCesium;
  export { OLCesium };
}

declare module 'olcs/OLCesium' {
  import Map from 'ol/Map';
  
  interface OLCesiumOptions {
    map: Map;
    resolutionScale?: number;
    target?: HTMLElement | string;
  }
  
  class OLCesium {
    constructor(options: OLCesiumOptions);
    setEnabled(enabled: boolean): void;
    getEnabled(): boolean;
    getCesiumScene(): any;
    getOlMap(): Map;
    getOlView(): any;
    setResolutionScale(scale: number): void;
    warmUp(date: Date, scene: any): void;
    destroy(): void;
  }
  
  export default OLCesium;
  export { OLCesium };
}