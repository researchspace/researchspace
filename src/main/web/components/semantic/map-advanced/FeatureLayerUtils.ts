import BaseLayer from 'ol/layer/Base';
import BaseVectorLayer from 'ol/layer/BaseVector';
import WebGLVectorLayer from 'ol/layer/WebGLVector';
import { getSupportedExtensions } from 'ol/webgl';

/**
 * Layer property marking helper layers created by the map itself (labels, point companions,
 * selection highlight, measurement). They are never listed in the controls and never treated
 * as data layers.
 */
export const AUXILIARY_LAYER = 'auxiliary';

/**
 * True for the layers that hold the map's features: the `level=feature` layers plus any other
 * vector layer (e.g. the point clusters), whatever renderer they use (canvas or WebGL).
 */
export function isFeatureLayer(layer: BaseLayer | null | undefined): boolean {
  if (!layer || layer.get(AUXILIARY_LAYER)) {
    return false;
  }
  return (
    layer.get('level') === 'feature' || layer instanceof BaseVectorLayer || layer instanceof WebGLVectorLayer
  );
}

let webglSupported: boolean | undefined;

/**
 * Whether the browser can create the WebGL context used by `WebGLVectorLayer`.
 */
export function isWebglSupported(): boolean {
  if (webglSupported === undefined) {
    try {
      webglSupported = getSupportedExtensions() !== null;
    } catch (e) {
      webglSupported = false;
    }
  }
  return webglSupported;
}
