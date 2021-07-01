import { EventMaker } from 'platform/api/events';

export interface SemanticMapControlsEventData {
  'SemanticMapControls.OverlayOpacity': number;
  'SemanticMapControls.OverlayVisualization': string;
  'SemanticMapControls.OverlaySwipe': number;
  'SemanticMapControls.FeatureColor': string;
  'SemanticMapControls.SyncFromMap': any[];
  'SemanticMap.toggleEditingMode': boolean;
  'SemanticMap.SendTilesLayers': any[];
  'SemanticMapControls.SendTilesLayersToMap': any[];
  'SemanticMapControls.SendMaskIndexToMap': number;
}

const event: EventMaker<SemanticMapControlsEventData> = EventMaker;

export const SemanticMapControlsOverlayOpacity = event('SemanticMapControls.OverlayOpacity');
export const SemanticMapControlsOverlayVisualization = event('SemanticMapControls.OverlayVisualization');
export const SemanticMapControlsOverlaySwipe = event('SemanticMapControls.OverlaySwipe');
export const SemanticMapControlsFeatureColor = event('SemanticMapControls.FeatureColor');
export const SemanticMapControlsSyncFromMap = event('SemanticMapControls.SyncFromMap');
export const SemanticMapToggleEditingMode = event('SemanticMap.toggleEditingMode');
export const SemanticMapSendTilesLayers = event('SemanticMap.SendTilesLayers');
export const SemanticMapControlsSendTilesLayersToMap = event('SemanticMapControls.SendTilesLayersToMap');
export const SemanticMapControlsSendMaskIndexToMap = event('SemanticMapControls.SendMaskIndexToMap');
