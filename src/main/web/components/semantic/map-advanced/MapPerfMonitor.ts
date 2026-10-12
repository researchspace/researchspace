import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';

/**
 * Lightweight render profiler for an OpenLayers map, enabled only when the page URL
 * contains the `mapPerf` query parameter (e.g. `?mapPerf` or `&mapPerf=1`).
 *
 * Every second in which the map rendered at least one frame it logs:
 * - fps: frames rendered in that second
 * - avg / max: time spent by OpenLayers composing a frame (precompose -> postcompose), in ms
 * - features: total number of features in the vector sources of the map
 */
export function isMapPerfEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('mapPerf');
  } catch (e) {
    return false;
  }
}

export function attachMapPerfMonitor(map: Map, label: string): () => void {
  let frameStart = 0;
  let frames = 0;
  let total = 0;
  let max = 0;

  const keys: EventsKey[] = [
    map.on('precompose', () => {
      frameStart = performance.now();
    }) as EventsKey,
    map.on('postcompose', () => {
      if (!frameStart) return;
      const elapsed = performance.now() - frameStart;
      frameStart = 0;
      frames++;
      total += elapsed;
      max = Math.max(max, elapsed);
    }) as EventsKey,
  ];

  const countFeatures = (): number => {
    let count = 0;
    map.getAllLayers().forEach((layer: any) => {
      let source = layer.getSource && layer.getSource();
      if (source && typeof source.getSource === 'function') source = source.getSource();
      if (source && typeof source.getFeatures === 'function') count += source.getFeatures().length;
    });
    return count;
  };

  const interval = window.setInterval(() => {
    if (frames === 0) return;
    console.info(
      `[mapPerf:${label}] fps=${frames} avg=${(total / frames).toFixed(1)}ms max=${max.toFixed(1)}ms features=${countFeatures()}`
    );
    frames = 0;
    total = 0;
    max = 0;
  }, 1000);

  return () => {
    unByKey(keys);
    window.clearInterval(interval);
  };
}
