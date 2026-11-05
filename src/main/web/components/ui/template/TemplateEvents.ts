/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

export interface TemplateEventData {
  /**
   * `inline-template` with an `id` triggers this event when its template cannot
   * be loaded or rendered (e.g. the template does not exist or has syntax errors).
   */
  'Template.LoadFailed': {
    templateIri?: string;
    message: string;
  };
}
const event: EventMaker<TemplateEventData> = EventMaker;

export const TemplateLoadFailed = event('Template.LoadFailed');
