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

import { Cancellation } from 'platform/api/async';
import { getGraphDataWithLabels, ResourceCytoscapeElement } from 'platform/components/semantic/graph/GraphInternals';
import { QueryContext } from 'platform/api/sparql/SparqlClient';

import { MultiDirectedGraph } from "graphology";

import { DEFAULT_HIDE_PREDICATES } from './Config';

export function createGraphFromElements(elements: ResourceCytoscapeElement[], colours: { [key: string]: string } | undefined) {
    const graph = new MultiDirectedGraph();
    for (const element of elements) {
        if (element.group == "nodes") {
            let color = "#000000";
            const types = element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']
            if (colours && element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
                for (const type of types) {
                    if (colours[type.value]) {
                        color = colours[type.value];
                        break;
                    }
                }
            }
            graph.addNode(element.data.id, {
                childrenCollapsed: false,
                hidden: false,
                label: element.data.label,
                typeLabels: element.data.typeLabels,
                color: color,
                types: types,
                image: element.data.thumbnail
            })
        }
    }

    for (const element of elements) {
        if (element.group == "edges") {
            graph.addEdgeWithKey(element.data.id, element.data.source, element.data.target, {
                label: element.data.label,
                predicate: element.data.resource
            })
        }
    }

    graph.nodes().forEach((node, i) => {
        const angle = (i * 2 * Math.PI) / graph.order;
        graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
        graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
    });

    return graph

}

export function loadGraphDataFromQuery(query: string, context: QueryContext) {
    const cancellation = new Cancellation();
    const config = {
        query: query,
        hidePredicates: DEFAULT_HIDE_PREDICATES
    }
    return cancellation.map(getGraphDataWithLabels(config, { context }))
}