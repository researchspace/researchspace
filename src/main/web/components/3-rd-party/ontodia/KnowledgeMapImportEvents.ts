/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

export interface KnowledgeMapImportEventData {
  /**
   * Triggered after a file has been imported and at least one knowledge map
   * was added to the database.
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
    /**
     * `false` if the component was removed (e.g. its dialog closed) before the import
     * finished: the dialog must not be closed then, it may have been opened again.
     */
    dialogOpen: boolean;
  };
}
const event: EventMaker<KnowledgeMapImportEventData> = EventMaker;

export const KnowledgeMapImportSuccess = event('KnowledgeMapImport.Success');
export const KnowledgeMapImportDone = event('KnowledgeMapImport.Done');
