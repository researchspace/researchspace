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

import { Rdf } from 'platform/api/rdf';

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

export interface LayoutConfig {
    /**
     * If this is set, the Layout will be stopped
     * after the specified number of time in milliseconds.
     * Set this if the layout is used in combination with 
     * events such as drag & drop.
     * @default null
     */
    runFor?: number;
}

export interface LoadGraphConfig {
    colours?: { [key: string]: string };
    data: any;
    grouping: GroupingConfig;
    sizes?: { "nodes": number, "edges": number };
}

export interface SigmaGraphConfig {
    /**
     * Optional identifier
     * @default undefined
     */
    id?: string;

    /**
     * SPARQL CONSTRUCT query to retrieve the graph data.
     */
    query: string;

    /** 
     * Grouping configuration
     * @default {
     *  enabled: false
     * }
     * @see GroupingConfig
     */
    grouping?: GroupingConfig;

    /**
     * Layout configuration
     * @default {
     *  runFor: 2000
     * }
     * @see LayoutConfig
     */
    layout?: LayoutConfig;

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

    /**
     * CONSTRUCT query to retrieve additional data for the graph.
     * Is either a string or false
     * @default false
     */
    nodeQuery?: string | false;

    /**
     * Sizes of the nodes and edges in pixe;s
     * Passed as a JSON object with the following properties:
     * - nodes: size of the nodes
     * - edges: size of the edges
     * @default {"nodes": 10, "edges": 5}
     */
    sizes?: { "nodes": number, "edges": number };

    /**
     * Display a search field.
     * @default false
     */
    searchBox?: boolean;

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
}