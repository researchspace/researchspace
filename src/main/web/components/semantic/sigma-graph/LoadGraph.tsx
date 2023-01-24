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

import { useEffect } from "react";
import { useLoadGraph } from "@react-sigma/core";
import { MultiDirectedGraph } from "graphology";

function applyGrouping(graph: MultiDirectedGraph) {
    // Print graph as JSON object, replacing < and > with empty strings
    //console.log(JSON.stringify(graph).replace(/</g, '').replace(/>/g, ''))

    // graph is a MultiDirectedGraph from graphology.
    // This function returns a new MultiDirectedGraph where nodes that share a type (defined in types array) and
    // the same predicate (defined in the attribute of the edges) are grouped together.
    // The function removes the individual nodes and edges and replaces them with a single node and edge with a
    // size that is the sum of the sizes of the nodes and edges that were grouped together.
    // The function also adds a label to the new node that specifies the shared type.
    
    // Retrieve all predicate attributes that appear in the edges of the graph
    const predicates = graph.edges().map((edge) => graph.getEdgeAttribute(edge, 'predicate')).filter((value, index, self) => self.indexOf(value) === index);

    // Retrieve all type combinations that appear in the nodes' types array. A type combination is an array of types. For easier processing, the array is sorted alphabetically and flattened,
    // keeping only the value of the types.
    const typeCombinations = graph.nodes().map((node) => graph.getNodeAttribute(node, 'types')).map((types) => types.map((type) => type.value).sort()).map((types) => types.join('')).filter((value, index, self) => self.indexOf(value) === index);

    // Store nodes by shared type and predicate in a map
    const nodesByTypeCombinationAndPredicate = new Map();
    
    // Iterate through nodes of the graph and group nodes that share a type combination and a predicate
    for (const node of graph.nodes()) {
        const types = graph.getNodeAttribute(node, 'types');
        const typesString = types.map((type) => type.value).sort().join('');

        // Iterate through predicates
        for (const predicate of predicates) {
            // Check if the node has an edge with the current predicate
            if (graph.edges().filter((edge) => graph.getEdgeAttribute(edge, 'predicate') == predicate).filter((edge) => graph.source(edge) == node || graph.target(edge) == node).length > 0) {
                // Check if the map already contains an entry for the current type combination and predicate
                if (nodesByTypeCombinationAndPredicate.has(typesString + predicate)) {
                    // Add the current node to the array of nodes that share the current type combination and predicate
                    nodesByTypeCombinationAndPredicate.get(typesString + predicate).push(node);
                } else {
                    // Create a new entry in the map for the current type combination and predicate
                    nodesByTypeCombinationAndPredicate.set(typesString + predicate, [node]);
                }
            }
        }
    }
    console.log(nodesByTypeCombinationAndPredicate)

    return graph;      
}

export const LoadGraph = (props: any) => {
    const loadGraph = useLoadGraph();
    useEffect(() => {
        let graph = new MultiDirectedGraph();
        const data = props.data;

        for (const i in data) {
            const element = data[i];
            if (element.group == "nodes") {
                let color = "#000000";
                const types = element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']
                if (props.colours && element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
                    for (const type of types) {
                        if (props.colours[type.value]) {
                            color = props.colours[type.value];
                            break;
                        }
                    }
                }
                graph.addNode(element.data.id, {
                    label: element.data.label,
                    size: props.sizes.nodes,
                    color: color,
                    types: types
                })
            }
        }

        for (const i in data) {
            const element = data[i];
            if (element.group == "edges") {
                graph.addEdgeWithKey(element.data.id, element.data.source, element.data.target, {
                    label: element.data.label,
                    size: props.sizes.edges,
                    predicate: element.data.resource
                })
            }
        }

        graph.nodes().forEach((node, i) => {
            const angle = (i * 2 * Math.PI) / graph.order;
            graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
            graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
        });

        if (props.groupNodes) {
            graph = applyGrouping(graph);
        }

        loadGraph(graph);
    }, [loadGraph]);
  
    return null;
  };

  export default LoadGraph;