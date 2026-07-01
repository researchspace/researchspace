/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
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