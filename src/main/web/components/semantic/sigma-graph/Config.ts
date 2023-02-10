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

export const DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
    '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
];
export interface LoadGraphConfig {
    colours?: { [key: string]: string };
    data: any;
}
export interface SigmaGraphConfig {
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
     * SPARQL CONSTRUCT query to retrieve the graph data.
     */
    query: string;

    /**
     * Display a search field.
     * @default false
     */
    searchBox?: boolean;

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