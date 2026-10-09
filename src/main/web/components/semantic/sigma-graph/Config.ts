/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { QueryContext } from 'platform/api/sparql'

export const DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
    '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
];

export type SigmaGraphLayout =
    | 'circular'
    | 'circlepack'
    | 'force'
    | 'forceAtlas2'
    | 'noverlap'
    | 'random';

export interface GroupingConfig {
    /**
     * Enable grouping of nodes by shared predicate and type
     * @default false
     */
    enabled?: boolean;

    /**
     * Number of nodes above which they will be grouped together.
     * @default 3
     */
    threshold?: number;

    /**
     * Behaviour of grouped nodes when expanding.
     * In 'expand' mode, the children nodes will be attached to the
     * grouped node. In 'replace' mode, the grouped node will be
     * replaced by the children nodes. If set to 'none', the grouped
     * node will neither be expanded nor replaced.
     * @default 'expand'
     */
    behaviour?: 'expand' | 'replace' | 'none';
}

export interface GraphEventsConfig extends SigmaGraphConfig {
    context?: QueryContext;
}
export interface SigmaGraphConfig {
    /**
     * SPARQL CONSTRUCT query to retrieve the graph data.
     */
    query?: string;

    /**
     * Optional identifier. 
     * Required for external events and persistence across page reloads.
     * @default undefined
     */
    id?: string;

    /**
     * Optional colour palette for nodes.
     * Passed as JSON object with RDF types as keys and colours as values.
     * @default {}
     * @example
     * {
     *  "http://www.w3.org/2002/07/owl#Class": "#ff0000",
     *  "http://www.w3.org/2002/07/owl#ObjectProperty": "#00ff00"
     * }
     */
    colours?: { [key: string]: string }; 

    /**
     * Display a control panel with buttons to control the graph.
     * @default false
     */
    controls?: boolean;

    /**
     * Show the layout menu when controls is enabled. Set false to keep zoom and
     * See whole graph while hiding layout selection and its Start/Stop buttons.
     * The configured layout and automatic layout on node expansion still apply.
     * @default true
     */
    layoutControls?: boolean;

    /**
     * Display a filter box for the edges
     * @default false
     */
    edgeFilter?: boolean;

    /**
    * Grouping configuration
    * @default {
    *  enabled: false
    * }
    * @see GroupingConfig
    */
   grouping?: GroupingConfig;

   /**
    * Query to retrieve additional graph data. ?subject or $subject is bound to the
    * IRI of the resource that is clicked. Literal and blank-node clicks do not
    * run this query. Other variables, literals and IRIs are left unchanged.
    * @default undefined
    */
   nodeQuery?: string;

    /**
     * If true, the graph will be persisted in the browser's local storage.
     * Requires a stable id. The query, page URL and semantic context scope
     * the saved state; other graph instances are stored independently.
     * @default false
     */
    persistGraph?: boolean;

    /**
     * 
     * Message to display when the graph has been restored from the browser's local storage.
     * 
     * @default "The graph has been restored from the browser's local storage."
     */
    persistGraphMessage?: string;

    /**
     * Position of the message to display when the graph has been restored from the browser's local storage.
     * Options:
     * tr (top right), tl (top left), tc (top center), br (bottom right), bl (bottom left), bc (bottom center)
     * @default "tr"
     */
    persistGraphMessagePosition?: "tr" | "tl" | "tc" | "br" | "bl" | "bc";

    /**
     * Display a search field.
     * @default false
     */
    searchBox?: boolean;

    /**
     * Sizes of the nodes and edges in pixels
     * Passed as a JSON object with the following properties:
     * - nodes: size of the nodes
     * - edges: size of the edges
     * @default {"nodes": 10, "edges": 5}
     */
    sizes?: { "nodes": number, "edges": number };


    /**
     * Initial layout to apply once after the graph has mounted.
     * If omitted, the component applies the lightweight deterministic
     * 'circular' layout. Users can then choose and apply a different layout
     * from the controls when required.
     *
     * Available values: 'circular', 'circlepack', 'force', 'forceAtlas2',
     * 'noverlap', 'random'.
     *
     * @default 'circular'
     */
    layout?: SigmaGraphLayout;

    /**
     * Maximum active time for a continuous layout, in milliseconds; 0 means unlimited.
     * Node clicks and completed expansions renew this run period.
     * @default 10000
     */
    layoutRunDuration?: number;

    /**
     * Above this node count, Force uses worker-based ForceAtlas2 instead.
     * @default 500
     */
    maxForceNodes?: number;

    /**
     *  Width of the graph.
     *  @default "800px"
     */
    width?: string;

    /**
     * Height of the graph.
     * @default "600px"
     */
    height?: string;

}
