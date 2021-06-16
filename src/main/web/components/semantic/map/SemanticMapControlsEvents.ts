import { EventMaker } from 'platform/api/events';

export interface SemanticMapControlsEventData {
  'SemanticMapControls.OverlayOpacity': number;
  'SemanticMapControls.OverlayVisualization': string;
  'SemanticMapControls.OverlaySwipe': number;
  'SemanticMapControls.FeatureColor': string;
  'SemanticMap.toggleEditingMode': boolean;
}

const event: EventMaker<SemanticMapControlsEventData> = EventMaker;

export const SemanticMapControlsOverlayOpacity = event('SemanticMapControls.OverlayOpacity');
export const SemanticMapControlsOverlayVisualization = event('SemanticMapControls.OverlayVisualization');
export const SemanticMapControlsOverlaySwipe = event('SemanticMapControls.OverlaySwipe');
export const SemanticMapControlsFeatureColor = event('SemanticMapControls.FeatureColor');
export const SemanticMapToggleEditingMode = event('SemanticMap.toggleEditingMode');
