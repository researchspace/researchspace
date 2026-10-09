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
import { applyGroupingToGraph, mergeGroupChildren, releaseNodeFromGroup } from './GraphGrouping';
export { applyGroupingToGraph, cleanGraph, expandGroup, releaseNodeFromGroup } from './GraphGrouping';
const SAVED_STATE_PREFIX = 'sigmaGraph:v2:';

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

export function createGraphFromElements(elements: any[], props: SigmaGraphConfig) {
    const graph = new MultiDirectedGraph();
    const nodeSize = props.sizes?.nodes ?? 10;
    const edgeSize = props.sizes?.edges ?? 5;
    // Order elements by <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> key
    elements = [...elements].sort((a, b) => {
        if (a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'] && b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'][0].value.localeCompare(b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'][0].value);
        } else if (a.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return -1;
        } else if (b.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
            return 1;
        } else {
            return 0;
        }
    });
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

/** Each graph owns an independent entry. Legacy global entries are left untouched. */
export function getGraphStorageKey(
    componentId: string, query: string, context: QueryContext = {}, grouping?: SigmaGraphConfig['grouping']
) {
    const bindings = Object.keys(context.bindings || {}).sort()
        .map(name => [name, context.bindings[name].toString()]);
    return SAVED_STATE_PREFIX + compressToEncodedURIComponent(JSON.stringify({
        componentId, query, page: window.location.href, repository: context.repository,
        defaultGraphs: context.defaultGraphs, namedGraphs: context.namedGraphs, bindings,
        // Older grouped snapshots did not preserve original relationships. Fetch
        // them again, and do not share snapshots between grouping configurations.
        grouping: grouping?.enabled ? {
            version: 1, threshold: grouping.threshold ?? 3, behaviour: grouping.behaviour,
        } : undefined,
    }));
}

export function clearStateFromLocalStorage(key: string) {
    if (!key) return;
    try { localStorage.removeItem(key); }
    catch (error) { console.warn('Unable to clear saved Sigma graph:', error); }
}

export function getStateFromLocalStorage(key: string) {
    if (!key) return null;
    try {
        const compressed = localStorage.getItem(key);
        if (!compressed) return null;
        const decompressed = decompressFromEncodedURIComponent(compressed);
        if (!decompressed) throw new Error('Invalid saved graph');
        const graph = new MultiDirectedGraph();
        graph.import(JSON.parse(decompressed));
        return graph;
    } catch (error) {
        console.warn('Unable to restore saved Sigma graph:', error);
        clearStateFromLocalStorage(key);
        return null;
    }
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
        } else if (attributes.grouped && graph.getNodeAttribute(node, 'grouped')) {
            mergeGroupChildren(graph, node, attributes.children || []);
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

export function loadGraphDataFromQuery(query: string, context: QueryContext, cancellation: Cancellation) {
    const config = {
        query: query,
        hidePredicates: DEFAULT_HIDE_PREDICATES
    }
    return cancellation.map(getGraphDataWithLabels(config, { context }))
}

export function saveStateIntoLocalStorage(graph: MultiDirectedGraph, key: string) {
    if (!graph || !key) return;
    try {
        const compressed = compressToEncodedURIComponent(JSON.stringify(graph.export()));
        localStorage.setItem(key, compressed);
    } catch (error) {
        // A storage quota/privacy failure must not interrupt component teardown.
        console.warn('Unable to save Sigma graph:', error);
    }
}
