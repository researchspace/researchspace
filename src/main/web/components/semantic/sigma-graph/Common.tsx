/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Cancellation } from 'platform/api/async';
import { getGraphDataWithLabels } from 'platform/components/semantic/graph/GraphInternals';
import { QueryContext } from 'platform/api/sparql/SparqlClient';

import { MultiDirectedGraph } from "graphology";

import { SigmaGraphConfig, DEFAULT_HIDE_PREDICATES } from './Config';
import random from 'graphology-layout/random';
const SAVED_STATE_LOCAL_STORAGE_KEY = 'sigmaGraph-key';
const SAVED_STATE_LOCAL_STORAGE_GRAPH = 'sigmaGraph-graph';

const DEFAULT_COLOUR_NODE = "#000";
const DEFAULT_COLOUR_EDGE = "#aaa";

function isFiniteCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function getFallbackGraphPosition(graph: MultiDirectedGraph) {
    let xTotal = 0;
    let yTotal = 0;
    let positionedNodes = 0;

    graph.forEachNode((_node, attributes) => {
        if (isFiniteCoordinate(attributes.x) && isFiniteCoordinate(attributes.y)) {
            xTotal += attributes.x;
            yTotal += attributes.y;
            positionedNodes++;
        }
    });

    if (positionedNodes === 0) {
        return { x: 0, y: 0 };
    }

    return {
        x: xTotal / positionedNodes,
        y: yTotal / positionedNodes
    };
}

export function applyGroupingToGraph(graph: MultiDirectedGraph, props: SigmaGraphConfig) {
    // Store nodes by shared source, type and predicate.
    const nodesBySourceTypeAndPredicate: Record<string, {
        nodes: string[];
        predicate: any;
        labels: any[];
        source: string;
        types: any[];
        typeLabels: any;
    }> = Object.create(null);

    /*
     * Group each node's incoming edges locally by source and predicate.
     *
     * This avoids first computing every predicate in the graph and then
     * scanning all predicates for every node/source pair. Each incoming edge
     * is visited once, and a target node is added at most once to each
     * source/type/predicate group, even when parallel edges share a predicate.
     */
    for (const node of graph.nodes()) {
        const nodeAttributes = graph.getNodeAttributes(node);
        const rawTypes = nodeAttributes.types;
        const types = Array.isArray(rawTypes) ? rawTypes : [];
        const typesString = types
            .map((type: any) => type && typeof type === 'object' ? type.value : type)
            .sort()
            .join('');

        const incomingEdgesBySourceAndPredicate = new Map<
            string,
            Map<any, string[]>
        >();

        for (const edge of graph.inEdges(node)) {
            const source = graph.source(edge);
            const predicate = graph.getEdgeAttribute(edge, 'predicate');

            let edgesByPredicate = incomingEdgesBySourceAndPredicate.get(source);
            if (!edgesByPredicate) {
                edgesByPredicate = new Map<any, string[]>();
                incomingEdgesBySourceAndPredicate.set(source, edgesByPredicate);
            }

            let matchingEdges = edgesByPredicate.get(predicate);
            if (!matchingEdges) {
                matchingEdges = [];
                edgesByPredicate.set(predicate, matchingEdges);
            }
            matchingEdges.push(edge);
        }

        for (const [source, edgesByPredicate] of incomingEdgesBySourceAndPredicate) {
            for (const [predicate, edges] of edgesByPredicate) {
                // Keep the existing group key format to preserve graph-state compatibility.
                const key = source + typesString + predicate;
                const existingEntry = nodesBySourceTypeAndPredicate[key];

                if (existingEntry) {
                    existingEntry.nodes.push(node);
                } else {
                    nodesBySourceTypeAndPredicate[key] = {
                        nodes: [node],
                        predicate,
                        labels: edges.map((edge) => graph.getEdgeAttribute(edge, 'label')),
                        source,
                        types,
                        typeLabels: nodeAttributes.typeLabels
                    };
                }
            }
        }
    }

    // Create a new graph that will contain the grouped nodes
    const groupedGraph = new MultiDirectedGraph();

    // If the number of nodes in entry contains less than the group size we remove the entry from the map
    // and add the nodes and corresponding edges to the grouped graph
    for(const key in nodesBySourceTypeAndPredicate) {
        const entry = nodesBySourceTypeAndPredicate[key];
        const threshold = props.grouping?.threshold ?? 3;
        if (entry['nodes'].length < threshold) {
            // Add source node to graph
            if (!groupedGraph.hasNode(entry['source'])) {
                groupedGraph.addNode(entry['source'], graph.getNodeAttributes(entry['source']));
            }

            // Add nodes to graph
            for (const node of entry['nodes']) {
                // Check if node already exists in the grouped graph
                if (!groupedGraph.hasNode(node)) {
                    groupedGraph.addNode(node, graph.getNodeAttributes(node));
                }
            }

            // Add edges to graph
            for (const node of entry['nodes']) {
                if(!groupedGraph.hasEdge(entry['source']+node)) {
                    groupedGraph.addEdgeWithKey(entry['source']+node, entry['source'], node, {
                        label: entry['labels'].join(' '),
                        size: props.sizes?.edges ?? 5,
                        color: props.colours && props.colours.edge || DEFAULT_COLOUR_EDGE
                    })
                }
            }

            // Remove entry from map
            delete nodesBySourceTypeAndPredicate[key];
        }
    }

    // Add nodes to grouped grpah
    for(const key in nodesBySourceTypeAndPredicate) {
        const entry = nodesBySourceTypeAndPredicate[key];
        // Add source node to graph
        if (!groupedGraph.hasNode(entry['source'])) {
            groupedGraph.addNode(entry['source'], graph.getNodeAttributes(entry['source']));
        }

        // Add grouped nodes to a list
        const children = []
        for (const node of entry['nodes']) {
            const attributes = graph.getNodeAttributes(node);
            attributes.parent = key;
            children.push({
                node: node,
                attributes: attributes
            })
        }

        // Add a new node that represents the group of nodes that share the current source node, type combination and predicate
        if (!groupedGraph.hasNode(key)) {
            const firstNodeAttrs = graph.getNodeAttributes(entry.nodes[0]) || {};
            let x = firstNodeAttrs.x;
            let y = firstNodeAttrs.y;
            if (x === undefined) x = Math.random();
            if (y === undefined) y = Math.random();

            const typeLabels = firstNodeAttrs.typeLabels;
            const labelPrefix = Array.isArray(typeLabels) ? typeLabels.join(', ') : (typeLabels || 'Group');

            groupedGraph.addNode(key, {
                grouped: true,
                children: children,
                label: labelPrefix + ' (' + entry.nodes.length + ')',
                typeLabels: typeLabels,
                size: (props.sizes?.nodes ?? 10) * 1.5,
                color: firstNodeAttrs.color,
                x: x,
                y: y
            })
        }
    }

    // Add edges to grouped graph
    for(const key in nodesBySourceTypeAndPredicate) {
        const entry = nodesBySourceTypeAndPredicate[key];
        // Add an edge from the source node to the group node if it doesn't already exist
        if (!groupedGraph.hasEdge(entry['source']+key)) {
            groupedGraph.addEdgeWithKey(entry['source']+key, entry['source'], key, {
                label: entry['labels'].join(' '),
                size: props.sizes?.edges ?? 5,
                color: props.colours && props.colours.edge || DEFAULT_COLOUR_EDGE
            })
        }
    }

    return groupedGraph;
}

export function cleanGraph(graph: MultiDirectedGraph) {
    // Check for groups that only contain one element
    const nodes = graph.nodes();
    for (const node of nodes) {
        if (graph.hasNodeAttribute(node, 'children')) {
            const children = graph.getNodeAttribute(node, 'children');
            if (children.length === 1) {
                releaseNodeFromGroup(graph, children[0].node, node);
                graph.dropNode(node);
            } else if (children.length === 0) {
                graph.dropNode(node);
            }
        }
    }
}

export function createGraphFromElements(elements: any[], props: SigmaGraphConfig) {
    const graph = new MultiDirectedGraph();
    const nodeSize = props.sizes?.nodes ?? 10;
    const edgeSize = props.sizes?.edges ?? 5;
    // Order elements by <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> key
    elements.sort((a, b) => {
        if (a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'] && b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'][0].value.localeCompare(b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'][0].value);
        } else if (a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return -1;
        } else if (b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return 1;
        } else {
            return 0;
        }
    })
    for (const element of elements) {
        if (element.group == "nodes") {
            let color = props.colours && props.colours.node || DEFAULT_COLOUR_NODE;
            const types = element.data?.['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'];
            if (props.colours && Array.isArray(types)) {
                for (const type of types) {
                    if (type?.value && props.colours[type.value]) {
                        color = props.colours[type.value];
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
                size: nodeSize,
                image: element.data.thumbnail
            })
        }
    }

    for (const element of elements) {
        if (element.group == "edges") {
            const color = props.colours && props.colours.edge || DEFAULT_COLOUR_EDGE;
            graph.addEdgeWithKey(element.data.id, element.data.source, element.data.target, {
                label: element.data.label,
                predicate: element.data.resource,
                size: edgeSize,
                color: color
            })
        }
    }

    /*graph.nodes().forEach((node, i) => {
        const angle = (i * 2 * Math.PI) / graph.order;
        const currentX = graph.getNodeAttribute(node, "x");
        const currentY = graph.getNodeAttribute(node, "y");
        if (currentX === undefined) graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
        if (currentY === undefined) graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
    });*/
    
    random.assign(graph);

    if (props.grouping?.enabled) {
        const groupedGraph = applyGroupingToGraph(graph, props);
        return groupedGraph;
    } else {
        return graph
    }

}

export function clearStateFromLocalStorage() {
    localStorage.removeItem(SAVED_STATE_LOCAL_STORAGE_KEY);
    localStorage.removeItem(SAVED_STATE_LOCAL_STORAGE_GRAPH);
}

export function getStateFromLocalStorage(key: string) {
    if (key && localStorage.getItem(SAVED_STATE_LOCAL_STORAGE_KEY) === key) {
        const compressed = localStorage.getItem(SAVED_STATE_LOCAL_STORAGE_GRAPH);
        if (compressed) {
            try {
                const decompressed = decompressFromEncodedURIComponent(compressed);
                if (decompressed) {
                    const jsonGraph = JSON.parse(decompressed);
                    const graph = new MultiDirectedGraph();
                    graph.import(jsonGraph);
                    return graph;
                }
            } catch (e) {
                console.error("Failed to restore graph state from localStorage:", e);
                clearStateFromLocalStorage();
            }
        }
    }

    // If the query is not the same as the one in local storage, we clear the local storage
    localStorage.removeItem(SAVED_STATE_LOCAL_STORAGE_KEY);
    localStorage.removeItem(SAVED_STATE_LOCAL_STORAGE_GRAPH);
    return null;
}

export function mergeGraphs(graph: MultiDirectedGraph, newGraph: MultiDirectedGraph) {
     // New graphs are laid out independently, so always clone their attributes.
     // Invalid coordinates would poison Sigma's normalization/quadtree. Valid
     // coordinates are retained; only missing, NaN or infinite values are replaced.
     const fallbackPosition = getFallbackGraphPosition(graph);
     let addedNodeIndex = 0;

     newGraph.forEachNode((node, attributes) => {
        if (!graph.hasNode(node)) {
            const safeAttributes = { ...attributes };
            const angle = addedNodeIndex * Math.PI * (3 - Math.sqrt(5));
            const radius = 0.01 * Math.sqrt(addedNodeIndex + 1);

            if (!isFiniteCoordinate(safeAttributes.x)) {
                safeAttributes.x = fallbackPosition.x + Math.cos(angle) * radius;
            }
            if (!isFiniteCoordinate(safeAttributes.y)) {
                safeAttributes.y = fallbackPosition.y + Math.sin(angle) * radius;
            }

            graph.addNode(node, safeAttributes);
            addedNodeIndex++;
        }
    });
    newGraph.forEachEdge((edge, attributes, source, target) => {
        if (!graph.hasEdge(edge)) {
            graph.addEdgeWithKey(edge, source, target, { ...attributes });
        }
    });
    // If the new graph contains grouped nodes, it might be that a node that
    // is part of a group is already present as an individual node in the graph. 
    // In this case we need to remove the grouped node from its group and add a
    // corresponding edge from the groups source to the node.
    const nodes = graph.nodes();            

    const nodesToRelease = [];
    for (const node of nodes) {
        if (graph.hasNodeAttribute(node, 'grouped')) {
            // Look at children of group and check if they are already present in the graph
            const children = graph.getNodeAttribute(node, 'children') || [];
            for (const child of children) {
                if (graph.hasNode(child.node)) {
                    nodesToRelease.push({group: node, child: child});
                }
            }
        }
    }
    for (const node of nodesToRelease) {
        releaseNodeFromGroup(graph, node.child.node, node.group);
    }
}

export function loadGraphDataFromQuery(query: string, context: QueryContext) {
    const cancellation = new Cancellation();
    const config = {
        query: query,
        hidePredicates: DEFAULT_HIDE_PREDICATES
    }
    return cancellation.map(getGraphDataWithLabels(config, { context }))
}

export function releaseNodeFromGroup(graph: MultiDirectedGraph, childNode: string, groupNode: string)  {
    const children = graph.getNodeAttribute(groupNode, "children") || [];
    const edges = graph.inEdges(groupNode);
    const groupNodeAttributes = graph.getNodeAttributes(groupNode);
    for (const child of children) {
        if (child.node == childNode) {
            // If additional data has been retrieved and
            // merged into the graph, the node might already exist
            if (!graph.hasNode(childNode)) {
                const childAttributes = { ...child.attributes };
                childAttributes.x = isFiniteCoordinate(groupNodeAttributes.x)
                    ? groupNodeAttributes.x
                    : Math.random();
                childAttributes.y = isFiniteCoordinate(groupNodeAttributes.y)
                    ? groupNodeAttributes.y
                    : Math.random();
                graph.addNode(childNode, childAttributes);
            }
            // Remove the child node from the children array            
            const newChildren = children.filter(c => c.node !== childNode);
            graph.setNodeAttribute(groupNode, "children", newChildren);

            // Update group node label             
            const groupAttrs = graph.getNodeAttributes(groupNode) || {};
            const typeLabels = groupAttrs.typeLabels;
            const uniqueTypeLabels = Array.isArray(typeLabels)
                ? typeLabels.filter((value, index, array) => array.indexOf(value) === index)
                : [];
            const labelPrefix = uniqueTypeLabels.length > 0 ? uniqueTypeLabels.join(', ') : 'Group';
            graph.setNodeAttribute(groupNode, "label", labelPrefix + ' (' + newChildren.length + ')');
            // Add edges from group source node to child node
            for (const edge of edges) {
                const sourceNode = graph.source(edge);
                const edgeAttributes = graph.getEdgeAttributes(edge);
                // Check if edge already exists
                if (!graph.hasEdge(sourceNode+childNode)) {
                    graph.addEdgeWithKey(sourceNode+childNode, sourceNode, childNode, edgeAttributes)
                }
            }
        }
    }
}

export function saveStateIntoLocalStorage(graph: MultiDirectedGraph, key: string) {
    if (!graph || !key) return;

    const exportedGraph = graph.export();
    const compressed = compressToEncodedURIComponent(JSON.stringify(exportedGraph));
    
    localStorage.setItem(SAVED_STATE_LOCAL_STORAGE_KEY, key)
    localStorage.setItem(SAVED_STATE_LOCAL_STORAGE_GRAPH, compressed);
}