import { EventMaker } from 'platform/api/events'

export interface SemanticMapControlsEventData {
    'SemanticMapControls.OverlayOpacity': number;
}

const event: EventMaker<SemanticMapControlsEventData> = EventMaker;

export const SemanticMapControlsOverlayOpacity = event('SemanticMapControls.OverlayOpacity');