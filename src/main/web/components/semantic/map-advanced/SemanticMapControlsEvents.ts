import { EventMaker } from 'platform/api/events';

export interface SemanticMapControlsEventData {
  'SemanticMapControls.OverlayOpacity': number;
  'SemanticMapControls.OverlayVisualization': string;
  'SemanticMapControls.OverlaySwipe': number;
  'SemanticMapControls.FeatureColor': string;
  'SemanticMapControls.SyncFromMap': any[];
  'SemanticMap.toggleEditingMode': boolean;
  'SemanticMap.SendMapLayers': any[];
  'SemanticMapControls.SendMapLayersToMap': any[];
  'SemanticMapControls.SendMaskIndexToMap': number;
  'SemanticMapControls.SendFeaturesLabelToMap': string;
  'SemanticMapControls.SendFeaturesColorTaxonomyToMap': string;
  'SemanticMapControls.SendFeaturesGroupsToControls': string[];
  'SemanticMapControls.SendGroupColorsAssociationsToMap': {};
  'SemanticMapControls.SendToggle3d': string;
  'SemanticMapControls.SendYear': string;
  'SemanticMapControls.SendVectorLevels': {};
  'SemanticMapControls.Register': string;
  'SemanticMapControls.Unregister': string;
}

const event: EventMaker<SemanticMapControlsEventData> = EventMaker;

export const SemanticMapControlsOverlayOpacity = event('SemanticMapControls.OverlayOpacity');
export const SemanticMapControlsOverlayVisualization = event('SemanticMapControls.OverlayVisualization');
export const SemanticMapControlsOverlaySwipe = event('SemanticMapControls.OverlaySwipe');
export const SemanticMapControlsFeatureColor = event('SemanticMapControls.FeatureColor');
export const SemanticMapControlsSyncFromMap = event('SemanticMapControls.SyncFromMap');
export const SemanticMapToggleEditingMode = event('SemanticMap.toggleEditingMode');
export const SemanticMapSendMapLayers = event('SemanticMap.SendMapLayers');
export const SemanticMapControlsSendMapLayersToMap = event('SemanticMapControls.SendMapLayersToMap');
export const SemanticMapControlsSendMaskIndexToMap = event('SemanticMapControls.SendMaskIndexToMap');
export const SemanticMapControlsSendFeaturesLabelToMap = event('SemanticMapControls.SendFeaturesLabelToMap');
export const SemanticMapControlsSendFeaturesColorTaxonomyToMap = event('SemanticMapControls.SendFeaturesColorTaxonomyToMap');
export const SemanticMapControlsSendGroupColorsAssociationsToMap = event('SemanticMapControls.SendGroupColorsAssociationsToMap');
export const SemanticMapControlsSendToggle3d = event('SemanticMapControls.SendToggle3d');
export const SemanticMapControlsSendYear = event('SemanticMapControls.SendYear');
export const SemanticMapControlsSendVectorLevels = event('SemanticMapControls.SendVectorLevels');
export const SemanticMapControlsRegister = event('SemanticMapControls.Register');
export const SemanticMapControlsUnregister = event('SemanticMapControls.Unregister');

