import { EventMaker } from 'platform/api/events';

export interface SemanticMapControlsEventData {
  'SemanticMapControls.OverlayOpacity': number;
  'SemanticMapControls.OverlayVisualization': string;
  'SemanticMapControls.OverlaySwipe': number;
}

const event: EventMaker<SemanticMapControlsEventData> = EventMaker;

export const SemanticMapControlsOverlayOpacity = event('SemanticMapControls.OverlayOpacity');
export const SemanticMapControlsOverlayVisualization = event('SemanticMapControls.OverlayVisualization');
export const SemanticMapControlsOverlaySwipe = event('SemanticMapControls.OverlaySwipe');
