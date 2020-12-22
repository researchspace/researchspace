import { EventMaker } from 'platform/api/events'
import { Dictionary } from 'platform/api/sparql/SparqlClient';

export interface SemanticMapEventData {

    'SemanticMap.BoundingBoxChanged': Dictionary<any>;
    'SemanticMap.UpdateFeatureColor': string;
}

const event: EventMaker<SemanticMapEventData> = EventMaker;

export const SemanticMapBoundingBoxChanged = event('SemanticMap.BoundingBoxChanged');
export const SemanticMapUpdateFeatureColor = event('SemanticMap.UpdateFeatureColor');