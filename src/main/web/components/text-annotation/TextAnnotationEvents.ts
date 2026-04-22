/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { EventType } from 'platform/api/events/EventsApi';
import { EventMaker } from 'platform/api/events/Utils';

export interface TextAnnotationEventData {
  /**
   * Incoming event: template → workspace.
   * Focus and highlight an annotation by IRI. Also scrolls the editor to it.
   *
   * data: `{ annotationIri: string }`
   */
  'TextAnnotation.FocusAnnotation': { annotationIri: string };

  /**
   * Outgoing event: workspace → template.
   * Fired when an annotation is focused (from editor click/hover or sidebar).
   * Carries the focused annotation IRI, or empty data when focus is cleared.
   *
   * data: `{ annotationIri: string }` or `{}`
   */
  'TextAnnotation.AnnotationFocused': { annotationIri?: string };
}

const event: EventMaker<TextAnnotationEventData> = EventMaker;

/**
 * Send this event to the workspace to focus an annotation.
 *
 * Usage in templates:
 * ```html
 * <mp-event-trigger
 *   id="my-trigger"
 *   type="TextAnnotation.FocusAnnotation"
 *   targets='["my-workspace"]'
 *   data='{"annotationIri":"http://example.com/annotation/1"}'>
 *   <button>Go to annotation</button>
 * </mp-event-trigger>
 * ```
 */
export const FocusAnnotation = event('TextAnnotation.FocusAnnotation');

/**
 * Listen for this event to react when an annotation is focused in the workspace.
 *
 * Usage in templates:
 * ```html
 * <mp-event-target-template-render
 *   id="my-listener"
 *   template='Focused: {{iri}}'>
 * </mp-event-target-template-render>
 * ```
 */
export const AnnotationFocused = event('TextAnnotation.AnnotationFocused');
