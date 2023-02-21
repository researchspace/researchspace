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

import * as React from 'react';
import { useEffect, useState } from 'react';

import { listen, trigger } from 'platform/api/events';

import { inferSettings } from 'graphology-layout-forceatlas2'
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { useRegisterEvents, useSigma } from "@react-sigma/core";

import { GraphEventsConfig } from './Config';
import { createGraphFromElements, loadGraphDataFromQuery, mergeGraphs } from './Common';
import { NodeClicked } from './EventTypes';

import "@react-sigma/core/lib/react-sigma.min.css";

export const GraphEvents: React.FC<GraphEventsConfig> = (props) => {

    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const [ activeNode, setActiveNode ] = useState<string | null>(null);
    const [ draggedNode, setDraggedNode ] = useState<string | null>(null);

    // Configure layout
    const graph = useSigma().getGraph();
    const layoutSettings = inferSettings(graph);
    const { start, stop, kill } = useWorkerLayoutForceAtlas2({ settings: layoutSettings });

    const handleGroupedNodeClicked = (node: string) => {
        const mode = props.grouping.behaviour || null;
        if (!mode) {
            return
        }
        if (mode == "expand" || mode == "replace") {
            const graph = sigma.getGraph();
            const children = graph.getNodeAttribute(node, "children");
            const incomingEdges = graph.inEdges(node);
            for (const child of children) {
                // Add child node to graph if it is not already there
                if (!graph.hasNode(child.node)) {
                    graph.addNode(child.node, child.attributes);
                }
            }
            for (const child of children) {
                for (const edge of incomingEdges) {
                    const edgeAttributes = graph.getEdgeAttributes(edge);
                    if (mode == "replace") {
                        // Add edge from source node to child node
                        const edgeSource = graph.source(edge);
                        if (!graph.hasEdge(edgeSource+child.node)) {
                            graph.addEdgeWithKey(edgeSource+child.node, edgeSource, child.node, edgeAttributes);
                        }
                    } else if (mode == "expand") {
                        // Add edge from grouped node to child node
                        if (!graph.hasEdge(node, child.node)) {
                            graph.addEdge(node, child.node, edgeAttributes);
                        }
                    }
                }
            }
            if (mode == "replace") {
                // Remove the grouped node
                graph.dropNode(node);
            }
        }
    }

    const handleNodeClicked = (node: string) => {
        const attributes = sigma.getGraph().getNodeAttributes(node);
        if (attributes.grouped) {
            handleGroupedNodeClicked(node);
        } else {     
            // If node query is defined, load additional data
            if (props.nodeQuery) {
                loadMoreDataForNode(node)
            }
        }
        // Fire event// Trigger external event
        // Node IRIs are stored with < and > brackets, so we need to remove them
        // when triggering the event
        const data = { nodes: attributes.children ? attributes.children.map( (childNode: { "node": string, "attributes": any }) => childNode.node.substring(1, childNode.node.length - 1)) : [ node.substring(1, node.length - 1) ]}
        trigger({
            eventType: NodeClicked,
            source: node,
            data: data
        })
        // Restart the layout
        start();
    }

    const loadMoreDataForNode = (node: string) => {
        let query = props.nodeQuery
        let newElements = []
        query = query.replaceAll("$subject", "?subject").replaceAll("?subject", node);
        loadGraphDataFromQuery(query, props.context).onValue((elements) => {
            newElements = elements
        })
        .onEnd(() => {
            const graph = sigma.getGraph();
            const newGraph = createGraphFromElements(newElements, props);
            // Add new nodes and edges to the graph
            mergeGraphs(graph, newGraph);            
        })
    }

    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    useEffect(() => {

        sigma.on("enterNode", (e) => {
            setActiveNode(e.node);
            sigma.getGraph().setNodeAttribute(e.node, "highlighted", true);
        });
        sigma.on("leaveNode", (e) => { 
            setActiveNode(null);
            sigma.getGraph().removeNodeAttribute(e.node, "highlighted");
        });

        // Register the events
        registerEvents({
            mouseup: () => {
                if (draggedNode) {
                    setDraggedNode(null);
                    sigma.getGraph().removeNodeAttribute(draggedNode, "highlighted");
                } 
                if (activeNode) {
                    handleNodeClicked(activeNode);
                }
            },
            mousedown: () => {
                // Stop the layout
                stop();
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox()) 
                }
                if (activeNode) {
                    setDraggedNode(activeNode);
                }
            },
            mousemove: (e) => {
                if (draggedNode) {
                    // Get new position of node
                    const pos = sigma.viewportToGraph(e);
                    sigma.getGraph().setNodeAttribute(draggedNode, "x", pos.x);
                    sigma.getGraph().setNodeAttribute(draggedNode, "y", pos.y);
                    sigma.refresh();
                    // Prevent sigma to move camera:
                    e.preventSigmaDefault();
                }
            }
        });
    }, [registerEvents, sigma, draggedNode, activeNode]);
    return null;
}

export default GraphEvents