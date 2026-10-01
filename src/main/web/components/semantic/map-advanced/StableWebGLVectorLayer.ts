import WebGLVectorLayer, { Options } from 'ol/layer/WebGLVector';
import { FrameState } from 'ol/Map';
import { equals } from 'ol/extent';
import ViewHint from 'ol/ViewHint';

/**
 * How far the view may drift from the one the WebGL buffers were built for before they are rebuilt.
 * Buffers hold float32 coordinates relative to the build view (clip space), whose error stays far
 * below a pixel within these bounds.
 */
const MAX_RESOLUTION_RATIO = 256;
const MAX_CENTER_DRIFT_IN_VIEWPORTS = 32;

interface BuildView {
  resolution: number;
  center: number[];
  width: number;
}

function isCloseToBuildView(built: BuildView, frameState: FrameState): boolean {
  const viewState = frameState.viewState;
  const ratio = viewState.resolution / built.resolution;
  if (ratio > MAX_RESOLUTION_RATIO || ratio < 1 / MAX_RESOLUTION_RATIO) {
    return false;
  }
  const viewportWidth = built.resolution * Math.max(built.width, frameState.size[0], 1);
  const dx = viewState.center[0] - built.center[0];
  const dy = viewState.center[1] - built.center[1];
  return Math.sqrt(dx * dx + dy * dy) <= MAX_CENTER_DRIFT_IN_VIEWPORTS * viewportWidth;
}

/**
 * OpenLayers' WebGL vector renderer regenerates the buffers of ALL features after every pan or
 * zoom (each `moveend`), which costs O(features) on the main thread even when nothing but the
 * view changed. This wrapper keeps the existing buffers while they still render precisely and
 * only lets the renderer rebuild them when the source changes (new features, colors, groups) or
 * the view moved far.
 *
 * It relies on two internal fields of `ol/renderer/webgl/VectorLayer` (`previousExtent_`,
 * `sourceRevision_`, checked at runtime): if a future OpenLayers version renames them, it simply
 * falls back to the default behaviour.
 */
function keepBuffersAcrossMoves(renderer: any): void {
  const prepareFrameInternal = renderer.prepareFrameInternal;
  let builtFor: BuildView | null = null;

  renderer.prepareFrameInternal = function (frameState: FrameState): boolean {
    if (!Array.isArray(this.previousExtent_) || typeof this.sourceRevision_ !== 'number') {
      return prepareFrameInternal.call(this, frameState);
    }

    const source = this.getLayer().getSource();
    const sourceChanged = !!source && this.sourceRevision_ < source.getRevision();
    const viewState = frameState.viewState;
    const viewNotMoving = !frameState.viewHints[ViewHint.ANIMATING] && !frameState.viewHints[ViewHint.INTERACTING];
    const extentChanged = !equals(this.previousExtent_, frameState.extent);

    if (!sourceChanged && extentChanged && builtFor && isCloseToBuildView(builtFor, frameState)) {
      // The current buffers still render this view precisely: skip the rebuild.
      this.previousExtent_ = frameState.extent.slice();
    } else if (viewNotMoving && (extentChanged || sourceChanged)) {
      // The base renderer rebuilds the buffers for this view.
      builtFor = {
        resolution: viewState.resolution,
        center: viewState.center.slice(),
        width: frameState.size[0],
      };
    }
    return prepareFrameInternal.call(this, frameState);
  };
}

/**
 * WebGLVectorLayer that does not rebuild its GPU buffers after every pan/zoom.
 *
 * Built by wrapping an instance rather than subclassing: OpenLayers ships native ES classes and
 * this project compiles TypeScript to ES5, where `class X extends WebGLVectorLayer` cannot call
 * `super` ("class constructors must be invoked with 'new'").
 */
export function createStableWebGLVectorLayer(options: Options<any>): WebGLVectorLayer<any> {
  const layer: any = new WebGLVectorLayer(options);
  const createRenderer = layer.createRenderer;
  layer.createRenderer = function () {
    const renderer = createRenderer.call(this);
    keepBuffersAcrossMoves(renderer);
    return renderer;
  };
  return layer;
}
