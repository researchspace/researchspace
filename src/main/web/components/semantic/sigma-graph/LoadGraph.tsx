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
import { getLabels } from 'platform/api/services/resource-label';

function applyGrouping(graph: MultiDirectedGraph, props: any) {

    // Retrieve all predicate attributes that appear in the edges of the graph
    const predicates = graph.edges().map((edge) => graph.getEdgeAttribute(edge, 'predicate')).filter((value, index, self) => self.indexOf(value) === index);

    // Retrieve all type combinations that appear in the nodes' types array. A type combination is an array of types. For easier processing, the array is sorted alphabetically and flattened,
    // keeping only the value of the types.
    //const typeCombinations = graph.nodes().map((node) => graph.getNodeAttribute(node, 'types')).map((types) => types.map((type) => type.value).sort()).map((types) => types.join('')).filter((value, index, self) => self.indexOf(value) === index);
    
    // Store nodes by shared type and predicate in a map
    const nodesByTypeCombinationAndPredicate = {};

    // Iterate through nodes of the graph and group nodes that share a type combination and a predicate based on the source node of the edge
    for (const node of graph.nodes()) {
        const types = graph.getNodeAttribute(node, 'types');
        const typesString = types.map((type) => type.value).sort().join('');
    
        // Iterate through predicates
        for (const predicate of predicates) {
            // Check if the node has a source edge with the current predicate
            const edges = graph.edges().filter((edge) => graph.getEdgeAttribute(edge, 'predicate') == predicate).filter((edge) => graph.target(edge) == node)
            if (edges.length > 0) {
                // Check if the map already contains an entry for the current type combination and predicate
                const key = typesString + predicate;
                if (nodesByTypeCombinationAndPredicate[key]) {
                    // Add the current node to the array of nodes that share the current type combination and predicate
                    nodesByTypeCombinationAndPredicate[key]['nodes'].push(node);
                } else {
                    // Create a new entry in the map for the current type combination and predicate
                    nodesByTypeCombinationAndPredicate[key] = {
                        'nodes': [node],
                        'predicate': predicate,
                        'labels': edges.map((edge) => graph.getEdgeAttribute(edge, 'label')).filter((value, index, self) => self.indexOf(value) === index).sort(),
                        'sources': edges.map((edge) => graph.source(edge)),
                        'types': types
                    }
                }
            }
        }
    }

    
    // If an entry contains only one node, we dont need to group it
    for (const key in nodesByTypeCombinationAndPredicate) {
        if (nodesByTypeCombinationAndPredicate[key]['nodes'].length == 1) {
            const node = nodesByTypeCombinationAndPredicate[key]['nodes'][0];
            nodesByTypeCombinationAndPredicate[node] = nodesByTypeCombinationAndPredicate[key];
            delete nodesByTypeCombinationAndPredicate[key];
        }
    }

    // Create a new graph that will contain the grouped nodes
    const groupedGraph = new MultiDirectedGraph();
    
    // Add nodes to grouped graph
    for(const key in nodesByTypeCombinationAndPredicate) {
        const entry = nodesByTypeCombinationAndPredicate[key];
        
        // Add source nodes to graph
        for (const source of entry['sources']) {
            // Check if the source node already exists in the grouped graph
            if (!groupedGraph.hasNode(source)) {
                groupedGraph.addNode(source, graph.getNodeAttributes(source));
            }
        }

        // Add grouped nodes individually to graph
        for (const node of entry['nodes']) {
            // Check if node already exists in the grouped graph
            if (!groupedGraph.hasNode(node)) {
                const attributes = graph.getNodeAttributes(node);
                attributes['collapsed'] = true;
                groupedGraph.addNode(node, attributes);
            }
        }
        
        // Add a new node that represents the group of nodes that share the current type combination and predicate
        if(!groupedGraph.hasNode(key)) {
            groupedGraph.addNode(key, {
                label: entry['nodes'].length + ' ' + entry['types'].map((type) => type.value).join(' '),
                size: props.sizes.nodes * 2,
                color: graph.getNodeAttribute(entry['nodes'][0], 'color') // We just use the color of the first node
            });
        }
    }

    // Add edges to grouped graph
    for(const key in nodesByTypeCombinationAndPredicate) {
        const entry = nodesByTypeCombinationAndPredicate[key];
        for (const source of entry['sources']) {
            // Add an edge from the source node to the group node if it doesn't already exist
            if (!groupedGraph.hasEdge(source+key)) {
                groupedGraph.addEdgeWithKey(source+key, source, key, {
                    label: entry['labels'].join(' ')
                })
            }
        }
        //Add edges from the group node to the individual nodes
        for (const node of entry['nodes']) {
            groupedGraph.addEdgeWithKey(node+key, key, node, {
                label: entry['labels'].join(' ')
            })
        }
    }
    
    return groupedGraph;
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

        if (props.groupNodes) {
            graph = applyGrouping(graph, props);
        }

        graph.nodes().forEach((node, i) => {
            const angle = (i * 2 * Math.PI) / graph.order;
            graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
            graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
        });

        loadGraph(graph);
    }, [loadGraph]);
  
    return null;
  };

  export default LoadGraph;