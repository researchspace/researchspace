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
import { Cancellation } from 'platform/api/async';

import { inferSettings } from 'graphology-layout-forceatlas2'
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { useCamera, useRegisterEvents, useSigma } from "@react-sigma/core";

import { GraphEventsConfig } from './Config';
import { createGraphFromElements, loadGraphDataFromQuery, mergeGraphs } from './Common';
import { FocusNode, NodeClicked, TriggerNodeClicked } from './EventTypes';

import "@react-sigma/core/lib/react-sigma.min.css";

export const GraphEvents: React.FC<GraphEventsConfig> = (props) => {

    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const camera = useCamera();
    const [ activeNode, setActiveNode ] = useState<string | null>(null);
    const [ draggedNode, setDraggedNode ] = useState<string | null>(null);
    const cancellation = new Cancellation();

    // Configure layout
    const graph = useSigma().getGraph();
    const layoutSettings = inferSettings(graph);
    const { start, stop, kill } = useWorkerLayoutForceAtlas2({ settings: layoutSettings });

    const focusNode = (node: string) => {
        highlightNode(node);
        camera.gotoNode(node);
    }

    const highlightNode = (node: string) => {
        sigma.getGraph().setNodeAttribute(node, "highlighted", true);
    }

    const handleGroupedNodeClicked = (node: string, callback = () => { return undefined}) => {
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
        callback();
    }

    const handleNodeClicked = (node: string, omitEvent = false, callback = () => { return undefined} ) => {
        const attributes = sigma.getGraph().getNodeAttributes(node);
        if (attributes.grouped) {
            handleGroupedNodeClicked(node, callback);
        } else {     
            // If node query is defined, load additional data
            if (props.nodeQuery) {
                loadMoreDataForNode(node, callback)
            }
        }
        if (!omitEvent) {
            // Fire event// Trigger external event
            // Node IRIs are stored with < and > brackets, so we need to remove them
            // when triggering the event
            const data = { nodes: attributes.children ? attributes.children.map( (childNode: { "node": string, "attributes": any }) => childNode.node.substring(1, childNode.node.length - 1)) : [ node.substring(1, node.length - 1) ]}
            trigger({
                eventType: NodeClicked,
                source: node,
                data: data
            })
            // Restart layout
            start()
        }
    }

    const loadMoreDataForNode = (node: string, callback = () => { return undefined; }) => {
        let query = props.nodeQuery
        let newElements = []

        // Use regex to replace all occurrences of $subject or ?subject with the node IRI
        query = query.replace(/\$subject|\?subject/g, node)
        
        loadGraphDataFromQuery(query, props.context).onValue((elements) => {
            newElements = elements
        })
        .onEnd(() => {
            const graph = sigma.getGraph();
            const newGraph = createGraphFromElements(newElements, props);
            // Add new nodes and edges to the graph
            mergeGraphs(graph, newGraph);
            callback();            
        })
    }

    const releaseNodeFromGroup = (childNode: string, groupNode: string) => {
        const graph = sigma.getGraph();
        const children = graph.getNodeAttribute(groupNode, "children");
        for (const child of children) {
            if (child.node == childNode) {
                // If additional data has been retrieved and
                // merged into the graph, the node might already exist
                if (!graph.hasNode(childNode)) {
                    graph.addNode(childNode, child.attributes);
                }
                // Remove the child node from the children array
                children.splice(children.indexOf(child), 1)
                graph.setNodeAttribute(groupNode, "children", children)
                // Update group node label
                const typeLabels = graph.getNodeAttribute(groupNode, "typeLabels")
                graph.setNodeAttribute(groupNode, "label", typeLabels + ' (' + (children.length) + ')')
            }
        }
    }

    
    // Control layout
    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    // Listen to external events
    useEffect(() => {
        cancellation.map(
            listen({
                eventType: TriggerNodeClicked,
                target: props.id
            })
        ).observe({
                value: ( event ) => {
                    if (event.data.node)  {
                        // Add < and > brackets to node IRI
                        const node = "<" + event.data.node + ">";
                        // Check if parent node exists in graph
                        if (!sigma.getGraph().hasNode(node)) {
                            // Node might be in group
                            // Look at all nodes with children attributes and see if the parent node is in there
                            const nodes = sigma.getGraph().nodes();
                            for (const possibleGroupNode of nodes) {
                                const children = sigma.getGraph().getNodeAttribute(possibleGroupNode, "children");
                                if (children) {
                                    for (const child of children) {
                                        if (child.node == node) {
                                            // Parent node is in group, so we need to release it
                                            releaseNodeFromGroup(node, possibleGroupNode);
                                            break;
                                        }
                                    }
                                }
                            }
                        } 
                        if (sigma.getGraph().hasNode(node)) {
                            if(activeNode) {
                                sigma.getGraph().setNodeAttribute(activeNode, "highlighted", false);
                            }
                            handleNodeClicked(node, true, () => {
                                highlightNode(node);
                            })
                        }
                    } else {
                        console.log("No node defined");
                    }
                }
            });
        cancellation.map(
            listen({
                eventType: FocusNode,
                target: props.id
            })
        ).observe({
            value: ( event ) => {
                if (event.data.node) {
                    const node = event.data.node;
                    if (sigma.getGraph().hasNode(node)) {
                        focusNode(node);
                    }
                }
            }
        });
        return undefined;
    })

    // Listen to mouse events
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