/* eslint-disable react/prop-types */
/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { listen, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

import { inferSettings } from 'graphology-layout-forceatlas2'
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { ControlsContainer, useCamera, useRegisterEvents, useSigma, useSetSettings } from "@react-sigma/core";
import { Attributes } from "graphology-types";

import { GraphEventsConfig } from './Config';
import { cleanGraph, createGraphFromElements, loadGraphDataFromQuery, mergeGraphs, releaseNodeFromGroup } from './Common';
import { ScatterGroupNode, FocusNode, NodeClicked, TriggerNodeClicked } from './EventTypes';
import { EdgeFilterControl } from './EdgeFilterControl'
import { Panel } from './ControlPanel'

import "@react-sigma/core/lib/react-sigma.min.css";

export const GraphEvents: React.FC<GraphEventsConfig> = (props) => {

    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const setSettings = useSetSettings();
    const camera = useCamera();

    const [ activeNode, setActiveNode ] = useState<string | null>(null);
    const [ draggedNode, setDraggedNode ] = useState<string | null>(null);

    const [ edgeLabels, setEdgeLabels ] = useState<{label: string, visible: boolean}[]>([]);
    const [ edgeLabelsNeedUpdate, setEdgeLabelsNeedUpdate ] = useState<boolean>(false);

    // Derive the labels visible to Sigma once per edgeLabels update rather than
    // recalculating them for every node and edge processed by the reducers.
    const visibleEdgeLabels = useMemo(
        () => edgeLabels.filter(({ visible }) => visible).map(({ label }) => label),
        [edgeLabels]
    );
    
    // Configure layout
    const graph = useSigma().getGraph();
    const layoutSettings = inferSettings(graph);
    const { start, stop, kill } = useWorkerLayoutForceAtlas2({ settings: layoutSettings });

    const clearCustomBBox = () => {
        if (sigma.getCustomBBox()) {
            sigma.setCustomBBox(null);
        }
    };

    const startLayout = () => {
        try {
            start();
        } catch (e) {
            console.warn("Failed to start layout:", e);
        }
    };

    /**
     * Complete a topology-changing graph operation while the ForceAtlas2 worker
     * is stopped and Sigma is using a bounding box derived from the current graph.
     */
    const finishGraphMutation = (callback = () => { return undefined; }) => {
        cleanGraph(sigma.getGraph());
        clearCustomBBox();
        sigma.refresh();
        startLayout();
        callback();
    };

    const scatterGroupNode = (node: string, mode = 'replace') => {
        handleGroupedNodeClicked(node, () => { return undefined; }, mode);
    };

    const getEdgeLabelVisibilityString = () => {
        if (visibleEdgeLabels.length === edgeLabels.length) {
            return "";
        } else {
            return ` (${visibleEdgeLabels.length}/${edgeLabels.length})`;
        }
    };

    const focusNode = (node: string) => {
        highlightNode(node);
        camera.gotoNode(node);
    };

    const highlightNode = (node: string) => {
        for (const graphNode of sigma.getGraph().nodes()) {
            sigma.getGraph().setNodeAttribute(graphNode, "highlighted", false);
        }
        sigma.getGraph().setNodeAttribute(node, "highlighted", true);
    };

    const handleGroupedNodeClicked = (
        node: string,
        callback = () => { return undefined; },
        mode: string | boolean = false
    ) => {
        if (!mode) {
            mode = props.grouping.behaviour || null;
        }
        if (!mode || (mode !== "expand" && mode !== "replace")) {
            return;
        }

        // The worker and the frozen normalization bounds must not remain active
        // while nodes and edges are added or removed.
        stop();
        clearCustomBBox();

        const graph = sigma.getGraph();
        const children = graph.getNodeAttribute(node, "children") || [];
        const incomingEdges = graph.inEdges(node);
        const groupNodeAttributes = graph.getNodeAttributes(node);
        const groupX = Number.isFinite(groupNodeAttributes.x)
            ? groupNodeAttributes.x
            : Math.random();
        const groupY = Number.isFinite(groupNodeAttributes.y)
            ? groupNodeAttributes.y
            : Math.random();

        for (const child of children) {
            if (!graph.hasNode(child.node)) {
                const attrs = { ...child.attributes };
                attrs.x = Number.isFinite(attrs.x) ? attrs.x : groupX;
                attrs.y = Number.isFinite(attrs.y) ? attrs.y : groupY;
                graph.addNode(child.node, attrs);
            }
        }

        for (const child of children) {
            for (const edge of incomingEdges) {
                const edgeAttributes = graph.getEdgeAttributes(edge);
                if (mode === "replace") {
                    const edgeSource = graph.source(edge);
                    if (!graph.hasEdge(edgeSource + child.node)) {
                        graph.addEdgeWithKey(
                            edgeSource + child.node,
                            edgeSource,
                            child.node,
                            edgeAttributes
                        );
                    }
                } else {
                    if (!graph.hasEdge(node, child.node)) {
                        graph.addEdge(node, child.node, edgeAttributes);
                    }
                }
            }
        }

        if (mode === "replace") {
            graph.dropNode(node);
        }

        finishGraphMutation(callback);
    };

    const releaseNodeFromGroupSafely = (childNode: string, groupNode: string) => {
        stop();
        clearCustomBBox();
        releaseNodeFromGroup(sigma.getGraph(), childNode, groupNode);
        finishGraphMutation();
    };

    const handleNodeClicked = (
        node: string,
        omitEvent = false,
        callback = () => { return undefined; }
    ) => {
        const attributes = sigma.getGraph().getNodeAttributes(node);

        if (attributes.grouped) {
            handleGroupedNodeClicked(node, callback);
        } else if (props.nodeQuery) {
            // Keep the layout available while the query runs, but remove the
            // drag-time custom box. loadMoreDataForNode stops the worker again
            // immediately before mutating the graph.
            clearCustomBBox();
            startLayout();
            loadMoreDataForNode(node, callback);
        } else {
            clearCustomBBox();
            startLayout();
            callback();
        }

        if (!omitEvent) {
            const data = {
                id: node,
                attributes,
                nodes: attributes.children
                    ? attributes.children.map(
                        (childNode: { node: string; attributes: any }) =>
                            childNode.node.substring(1, childNode.node.length - 1)
                    )
                    : [node.substring(1, node.length - 1)]
            };
            trigger({
                eventType: NodeClicked,
                source: node,
                data
            });
        }

        sigma.refresh();
    };

    const loadMoreDataForNode = (
        node: string,
        callback = () => { return undefined; }
    ) => {
        let query = props.nodeQuery;
        let newElements = [];

        query = query.replace(/\$subject|\?subject/g, () => node);

        loadGraphDataFromQuery(query, props.context)
            .onValue((elements) => {
                newElements = elements;
            })
            .onEnd(() => {
                // Prevent the layout worker from processing an intermediate graph
                // while nodes, edges and groups are being changed.
                stop();
                clearCustomBBox();

                const graph = sigma.getGraph();
                const newGraph = createGraphFromElements(newElements, props);
                mergeGraphs(graph, newGraph);
                setEdgeLabelsNeedUpdate(true);

                finishGraphMutation(callback);
            });
    };

    // External event listeners should remain registered across ordinary renders,
    // while still invoking the latest render's state and callback implementations.
    const activeNodeRef = React.useRef(activeNode);
    const draggedNodeRef = React.useRef(draggedNode);
    const handleNodeClickedRef = React.useRef(handleNodeClicked);
    const focusNodeRef = React.useRef(focusNode);
    const scatterGroupNodeRef = React.useRef(scatterGroupNode);
    const releaseNodeFromGroupSafelyRef = React.useRef(releaseNodeFromGroupSafely);
    const stopRef = React.useRef(stop);

    activeNodeRef.current = activeNode;
    draggedNodeRef.current = draggedNode;
    handleNodeClickedRef.current = handleNodeClicked;
    focusNodeRef.current = focusNode;
    scatterGroupNodeRef.current = scatterGroupNode;
    releaseNodeFromGroupSafelyRef.current = releaseNodeFromGroupSafely;
    stopRef.current = stop;
    
    // Control layout
    useEffect(() => {
        try {
            start();
        } catch (e) {
            console.error("ForceAtlas2 layout error:", e);
        }
        return () => kill();
    }, [start, kill]);

    // Listen to external events
    useEffect(() => {
        const cancellation = new Cancellation();

        cancellation.map(
            listen({
                eventType: TriggerNodeClicked,
                target: props.id
            })
        ).observe({
                value: ( event ) => {
                    if (event.data.node)  {
                        // Add < and > brackets to node IRI
                        const rawNode = event.data.node;
                        const node = rawNode.startsWith('<') && rawNode.endsWith('>') ? rawNode : `<${rawNode}>`;
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
                                            releaseNodeFromGroupSafelyRef.current(node, possibleGroupNode);
                                            break;
                                        }
                                    }
                                }
                            }
                        } 
                        if (sigma.getGraph().hasNode(node)) {
                            const currentActiveNode = activeNodeRef.current;
                            if (currentActiveNode) {
                                sigma.getGraph().setNodeAttribute(currentActiveNode, "highlighted", false);
                            }
                            handleNodeClickedRef.current(node, true, () => {
                                highlightNode(node);
                            });
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
                    // Add < and > brackets to node IRI
                    const rawNode = event.data.node;
                    const node = rawNode.startsWith('<') && rawNode.endsWith('>') ? rawNode : `<${rawNode}>`;
                    if (sigma.getGraph().hasNode(node)) {
                        focusNodeRef.current(node);
                    }
                }
            }
        });
        cancellation.map(
            listen({
                eventType: ScatterGroupNode,
                target: props.id
            })
        ).observe({
            value: ( event ) => {
                if (event.data.id) {
                    const node = event.data.id
                    if (sigma.getGraph().hasNode(node)) {
                        scatterGroupNodeRef.current(node);
                    }
                }
            }
        });

        return () => cancellation.cancelAll();
    }, [props.id, sigma]);

    // Listen to mouse events. Keep the Sigma listeners stable and remove them
    // explicitly when the component unmounts or the Sigma instance changes.
    useEffect(() => {
        const handleEnterNode = ({ node }: { node: string }) => {
            setActiveNode(node);
            sigma.getGraph().setNodeAttribute(node, "highlighted", true);
        };

        const handleLeaveNode = ({ node }: { node: string }) => {
            setActiveNode(null);
            sigma.getGraph().removeNodeAttribute(node, "highlighted");
        };

        sigma.on("enterNode", handleEnterNode);
        sigma.on("leaveNode", handleLeaveNode);

        return () => {
            sigma.off("enterNode", handleEnterNode);
            sigma.off("leaveNode", handleLeaveNode);
        };
    }, [sigma]);

    // Register the remaining pointer events once. Refs provide the latest state
    // and callbacks without repeatedly registering new event handlers.
    useEffect(() => {
        registerEvents({
            mouseup: () => {
                // The custom box is only needed while dragging. Keeping it after
                // mouseup makes subsequently added or layout-moved nodes normalize
                // outside the frozen quadtree zone.
                sigma.setCustomBBox(null);

                const currentDraggedNode = draggedNodeRef.current;
                if (currentDraggedNode) {
                    setDraggedNode(null);
                    sigma.getGraph().removeNodeAttribute(currentDraggedNode, "highlighted");
                }

                const currentActiveNode = activeNodeRef.current;
                if (currentActiveNode) {
                    handleNodeClickedRef.current(currentActiveNode);
                }
            },
            mousedown: () => {
                // Stop the layout
                stopRef.current();
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox());
                }

                const currentActiveNode = activeNodeRef.current;
                if (currentActiveNode) {
                    setDraggedNode(currentActiveNode);
                }
            },
            mousemove: (e) => {
                const currentDraggedNode = draggedNodeRef.current;
                if (currentDraggedNode) {
                    // Get new position of node
                    const pos = sigma.viewportToGraph(e);
                    sigma.getGraph().setNodeAttribute(currentDraggedNode, "x", pos.x);
                    sigma.getGraph().setNodeAttribute(currentDraggedNode, "y", pos.y);
                    sigma.refresh();
                    // Prevent Sigma from moving the camera.
                    e.preventSigmaDefault();
                }
            }
        });
    }, [registerEvents, sigma]);

    // Control visibility of edges and nodes
    useEffect(() => {
        const graph = sigma.getGraph();
        const activeNodeNeighbors =
            activeNode && graph.hasNode(activeNode)
                ? new Set(graph.neighbors(activeNode))
                : undefined;

        setSettings({
          nodeReducer: (node, data) => {
            const newData: Attributes = { ...data, image: data.image || false};
    
            if (activeNode && activeNodeNeighbors && node != activeNode && !activeNodeNeighbors.has(node)) {
              newData.color = "#E2E2E2";
              newData.image = false;
            }

            if (props.edgeFilter) {
                // Retrieve all edges for this node
                const edges = sigma.getGraph().edges(node);

                // Filter all edges whose label is not in visibleEdgeLabels
                const visibleEdges = edges.filter((edge: string) => {
                    const edgeAttributes = sigma.getGraph().getEdgeAttributes(edge);
                    return visibleEdgeLabels.includes(edgeAttributes.label);
                });

                // If there are no visible edges, hide the node
                if (visibleEdges.length === 0) {
                    newData.hidden = true;
                }     
            }
            return newData;
          },
          edgeReducer: (edge, data) => {
            const graph = sigma.getGraph();
            const newData = { ...data, color: data.color || false, hidden: data.hidden || false};
    

            if (activeNode && !graph.extremities(edge).includes(activeNode)) {
              newData.color = "rgba(0,0,0,0.03)"
            }

            if (props.edgeFilter) {
                if (!visibleEdgeLabels.includes(data.label)) {
                    newData.hidden = true;
                }
            }

            return newData;
          },
        });
    }, [activeNode, props.edgeFilter, setSettings, sigma, visibleEdgeLabels]);

    // Retrieve set of labels
    useEffect(() => {
        const currentEdgeLabels: string[] = [];
        sigma.getGraph().forEachEdge((edge: string, attributes: Attributes) => {
            if (attributes.label && !currentEdgeLabels.includes(attributes.label)) {
                currentEdgeLabels.push(attributes.label);
            }
        });
        const newEdgeLabels = currentEdgeLabels.map((label) => {
            if (edgeLabels.find((d) => d.label === label)) {
                return edgeLabels.find((d) => d.label === label);
            } else {
                return {label, visible: true};
            }
        })
        // Order labels alphabetically
        newEdgeLabels.sort((a, b) => a.label.localeCompare(b.label));
        setEdgeLabels(newEdgeLabels);
        setEdgeLabelsNeedUpdate(false);
    }, [sigma, edgeLabelsNeedUpdate, activeNode]);

    if ( props.edgeFilter ) {

        // Generate a string based on how many of the edge labels are visible
        // If all are visible, return an empty string
        // If not all are visible but, for example, 4 out of 14, return 4/14
        

        return <ControlsContainer position="bottom-right">
            <Panel title={"Filter" + getEdgeLabelVisibilityString()}>
                <EdgeFilterControl 
                    edgeLabels={edgeLabels}
                    setEdgeLabels={setEdgeLabels}
                />
            </Panel>
        </ControlsContainer>
    }

    return null;
}

export default GraphEvents