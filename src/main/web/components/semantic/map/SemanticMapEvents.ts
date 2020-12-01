import { EventMaker } from 'platform/api/events'

export interface SemanticMapEventData {

    'SemanticMap.BoundingBoxChanged': string;
}

const event: EventMaker<SemanticMapEventData> = EventMaker;

export const SemanticMapBoundingBoxChanged = event('SemanticMap.BoundingBoxChanged');