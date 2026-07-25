/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

export interface SigmaEventData {
  /**
   * Event triggered when a node is clicked.
   */
  'Sigma.NodeClicked': {
    /**
     * Id of the Sigma component instance that emitted the event.
     */
    componentId: string;

    /**
     * Full clicked node id, usually the internal graph node IRI with angle brackets.
     */
    id: string;

    /**
     * Same clicked node id, clearer alias for consumers.
     */
    node: string;

    /**
     * Node IRIs exposed to external consumers.
     */
    nodes: string[];

    /**
     * Sigma / graphology node attributes.
     */
    attributes?: any;
  };

  /**
   * External event requesting a click on a given node.
   */
  'Sigma.TriggerNodeClicked': {
    componentId?: string;
    node: string;
  };

  /**
   * Event that listens to an external event that
   * focusses on a given node
   */
  'Sigma.FocusNode': {
    componentId?: string;
    node: string;
  }
  
  /**
   * Event that listens to an external event and expands the given group node, replacing the group node with its children
   * 
   * @param id The id of the group node to expand
   * @param mode The mode in which the group node should be expanded. Default is 'replace'
   */
  'Sigma.ScatterGroupNode': {
    componentId?: string;
    id: string;
    mode: 'expand' | 'replace';
  }
}
const event: EventMaker<SigmaEventData> = EventMaker;

export const ScatterGroupNode = event('Sigma.ScatterGroupNode');
export const FocusNode = event('Sigma.FocusNode');
export const NodeClicked = event('Sigma.NodeClicked');
export const TriggerNodeClicked = event('Sigma.TriggerNodeClicked');