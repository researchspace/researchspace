/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

export interface KnowledgeMapImportEventData {
  /**
   * Triggered after a file has been imported and at least one knowledge map
   * or graph was added to the database.
   */
  'KnowledgeMapImport.Success': {
    /** IRIs of the created knowledge maps. */
    resourceIris: string[];
  };
  /**
   * Triggered when the user is finished with the import, i.e. clicked "Close"
   * or opened an imported knowledge map. Use it to close the import dialog and
   * refresh search results.
   */
  'KnowledgeMapImport.Done': {
    /** IRIs of the knowledge maps created during this import session. */
    resourceIris: string[];
  };
}
const event: EventMaker<KnowledgeMapImportEventData> = EventMaker;

export const KnowledgeMapImportSuccess = event('KnowledgeMapImport.Success');
export const KnowledgeMapImportDone = event('KnowledgeMapImport.Done');
