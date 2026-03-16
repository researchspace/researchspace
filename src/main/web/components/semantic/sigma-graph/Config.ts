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

import { QueryContext } from 'platform/api/sparql'

export const DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
    '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
];
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
     * Required if component should be controlled via external events.
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
    * Query to retrieve additional graph data. ?subject will be replaced by the
    * URI of the node that is clicked.
    * @default undefined
    */
   nodeQuery?: string;

    /**
     * If true, the graph will be persisted in the browser's local storage.
     * This allows the graph to be restored when the page is reloaded.
     * If the URL of the page changes, the graph will be cleared.
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
     * Sizes of the nodes and edges in pixe;s
     * Passed as a JSON object with the following properties:
     * - nodes: size of the nodes
     * - edges: size of the edges
     * @default {"nodes": 10, "edges": 5}
     */
    sizes?: { "nodes": number, "edges": number };

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