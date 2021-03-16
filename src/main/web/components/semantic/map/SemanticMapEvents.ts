import { EventMaker } from 'platform/api/events'
import { Dictionary } from 'platform/api/sparql/SparqlClient';

export interface SemanticMapEventData {

    'SemanticMap.BoundingBoxChanged': Dictionary<any>;
    'SemanticMap.UpdateFeatureColor': string;
    'SemanticMap.ReplaceBasemap': string;
    'SemanticMap.ReplaceHistoricalMap': string;
}

const event: EventMaker<SemanticMapEventData> = EventMaker;

export const SemanticMapBoundingBoxChanged = event('SemanticMap.BoundingBoxChanged');
export const SemanticMapUpdateFeatureColor = event('SemanticMap.UpdateFeatureColor');
export const SemanticMapReplaceBasemap = event('SemanticMap.ReplaceBasemap');
export const SemanticMapReplaceHistoricalMap = event('SemanticMap.ReplaceHistoricalMap');