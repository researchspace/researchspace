/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { EventMaker } from 'platform/api/events';

// Workaround: 'typescript-json-schema' doesn't support void type.
export type OpaqueElementModel = {};
export type OpaqueDiagramModel = {};
export type OpaqueAuthoringState = {};
export type OpaqueTemporaryState = {};

export interface OntodiaEventData {
  /**
   * Event which should be triggered when diagram has been saved.
   */
  'Ontodia.DiagramSaved': {
    /**
     * Saved diagram IRI.
     */
    resourceIri: string;
  };
  /**
   * Event which should be triggered when diagram has been changed.
   */
  'Ontodia.DiagramChanged': {
    model: OpaqueDiagramModel;
    authoringState: OpaqueAuthoringState;
    temporaryState: OpaqueTemporaryState;
  };
  /**
   * Event which should be triggered when diagram has been changed.
   */
  'Ontodia.DiagramIsDirty': {
    /**
     * Equals to `true` if a diagram has been changed, otherwise equals to `false`.
     */
    hasChanges: boolean;
  };
  /**
   * Event which should be triggered to create a new entity and connections from it to target entities.
   */
  'Ontodia.CreateElement': {
    /**
     * New entity data.
     */
    elementData: OpaqueElementModel;
    /**
     * New connections from new entity to target entities.
     */
    targets: ReadonlyArray<{
      /**
       * Target IRI.
       */
      targetIri: string;
      /**
       * New connection IRI.
       */
      linkTypeId: string;
    }>;
  };
  /**
   * Event which should be triggered to edit an entity.
   */
  'Ontodia.EditElement': {
    /**
     * IRI of an entity to be edited.
     */
    targetIri: string;
    /**
     * New data of an entity.
     */
    elementData: OpaqueElementModel;
  };
  /**
   * Event which should be triggered to delete an entity.
   */
  'Ontodia.DeleteElement': {
    /**
     * IRI of an entity to be deleted.
     */
    iri: string;
  };
  /**
   * Event which should be triggered to focus on an element.
   */
  'Ontodia.FocusOnElement': {
    /**
     * IRI of an entity to be focused on.
     */
    iri: string;
  };
}
const event: EventMaker<OntodiaEventData> = EventMaker;

export const DiagramSaved = event('Ontodia.DiagramSaved');
export const DiagramChanged = event('Ontodia.DiagramChanged');
export const DiagramIsDirty = event('Ontodia.DiagramIsDirty');

export const CreateElement = event('Ontodia.CreateElement');
export const EditElement = event('Ontodia.EditElement');
export const DeleteElement = event('Ontodia.DeleteElement');

export const FocusOnElement = event('Ontodia.FocusOnElement');
