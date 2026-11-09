/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';
import { SigmaGroupIdentity } from './GroupId';

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
     * Full graph node key. Resource nodes use their RDF term, usually an IRI in
     * angle brackets. Groups use an opaque ID: sigma-group- and 32 hex digits.
     * Pass the complete key back to ScatterGroupNode, FocusNode or TriggerNodeClicked.
     */
    id: string;

    /**
     * Same clicked node id, clearer alias for consumers.
     */
    node: string;

    /**
     * Node IRIs without angle brackets. For a group, the IRIs of its children
     * (not the group ID); otherwise the clicked node IRI.
     */
    nodes: string[];

    /**
     * Present only for groups: the shared source, the sorted child types and,
     * if there is one, the predicate. IRIs have no angle brackets. Do not parse the ID.
     */
    group?: SigmaGroupIdentity;

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
   * Event that listens to an external event and expands the given group node.
   * In 'replace' mode the group node is replaced by its children; in 'expand'
   * mode it is kept and linked to them.
   * 
   * @param id The id of the group node to expand. IDs of non-group nodes are ignored.
   * @param mode The mode in which the group node should be expanded. Default is 'replace'.
   * Unknown modes are ignored.
   */
  'Sigma.ScatterGroupNode': {
    componentId?: string;
    id: string;
    mode?: 'expand' | 'replace';
  }
}
const event: EventMaker<SigmaEventData> = EventMaker;

export const ScatterGroupNode = event('Sigma.ScatterGroupNode');
export const FocusNode = event('Sigma.FocusNode');
export const NodeClicked = event('Sigma.NodeClicked');
export const TriggerNodeClicked = event('Sigma.TriggerNodeClicked');