import { EventMaker } from 'platform/api/events'
import { Dictionary } from 'platform/api/sparql/SparqlClient';

export interface SemanticMapEventData {
    'SemanticMap.BoundingBoxChanged': Dictionary<any>;
    'SemanticMap.UpdateFeatureColor': string;
    'SemanticMap.ReplaceBasemap': string;
    'SemanticMap.ReplaceOverlay': string;
    'SemanticMap.SendSelectedFeature': any;
    'SemanticMap.RequestControlsRegistration': string;
}

const event: EventMaker<SemanticMapEventData> = EventMaker;

export const SemanticMapBoundingBoxChanged = event('SemanticMap.BoundingBoxChanged');
export const SemanticMapUpdateFeatureColor = event('SemanticMap.UpdateFeatureColor');
export const SemanticMapReplaceBasemap = event('SemanticMap.ReplaceBasemap');
export const SemanticMapReplaceOverlay = event('SemanticMap.ReplaceOverlay');
export const SemanticMapSendSelectedFeature = event('SemanticMap.SendSelectedFeature');
export const SemanticMapRequestControlsRegistration = event('SemanticMap.RequestControlsRegistration');
