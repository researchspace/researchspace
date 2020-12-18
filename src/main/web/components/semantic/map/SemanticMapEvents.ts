import { EventMaker } from 'platform/api/events'

export interface SemanticMapEventData {

    'SemanticMap.BoundingBoxChanged': string;
    'SemanticMap.UpdateFeatureColor': string;
}

const event: EventMaker<SemanticMapEventData> = EventMaker;

export const SemanticMapBoundingBoxChanged = event('SemanticMap.BoundingBoxChanged');
export const SemanticMapUpdateFeatureColor = event('SemanticMap.UpdateFeatureColor');