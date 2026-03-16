/**
 * Copyright (C) 2022, Swiss Art Research Infrastructure, University of Zurich
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

export interface SigmaEventData {
  /**
   * Event which should be triggered when a node is clicked
   */
  'Sigma.NodeClicked': {
    /**
     * Node IRI.
     */
    nodes: string[];
  };

  /**
   * Event that listens to a external event that triggers
   * a click on a given node
   */
  'Sigma.TriggerNodeClicked': {
    node: string;
  }

  /**
   * Event that listens to an external event that
   * focusses on a given node
   */
  'Sigma.FocusNode': {
    node: string;
  }
  
  /**
   * Event that listens to an external event and expands the given group node, replacing the group node with its children
   * 
   * @param id The id of the group node to expand
   * @param mode The mode in which the group node should be expanded. Default is 'replace'
   */
  'Sigma.ScatterGroupNode': {
    id: string;
    mode: 'expand' | 'replace';
  }
}
const event: EventMaker<SigmaEventData> = EventMaker;

export const ScatterGroupNode = event('Sigma.ScatterGroupNode');
export const FocusNode = event('Sigma.FocusNode');
export const NodeClicked = event('Sigma.NodeClicked');
export const TriggerNodeClicked = event('Sigma.TriggerNodeClicked');