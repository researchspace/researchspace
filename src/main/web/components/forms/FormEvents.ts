/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { EventMaker } from 'platform/api/events';

export interface FormEventData {
  // triggers
  /**
   * If the post-action='event' for SemanticFormComponent, Component fires this event after a
   * new form is submitted
   */
  'Form.ResourceCreated': { iri: string };
  /**
   * If the post-action='event' for SemanticFormComponent.
   * Component fires this event on each update of the form including creation
   */
  'Form.ResourceUpdated': { iri: string };

  /**
   * semantic-form fires this event when resource is removed
   */
  'Form.ResourceRemoved': { iri: string };

  /**
   * Don't perform persistance, just run it without saving and send the output with event.
   */
  'Form.DryRunResults': Record<string, any>;


  // listens
  /**
   * Triggers remove resource action, iri needs to match current subject.
   */
  'Form.RemoveResource': { iri: string };
}
const event: EventMaker<FormEventData> = EventMaker;

export const FormResourceCreated = event('Form.ResourceCreated');
export const FormResourceUpdated = event('Form.ResourceUpdated');
export const FormResourceRemoved = event('Form.ResourceRemoved');
export const FormDryRunResults = event('Form.DryRunResults');

export const FormRemoveResource = event('Form.RemoveResource');
