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

import { ControlsContainer, useCamera, useRegisterEvents, useSigma, useSetSettings } from "@react-sigma/core";
import { Attributes } from "graphology-types";

import { GraphEventsConfig } from './Config';
import { cleanGraph, createGraphFromElements, loadGraphDataFromQuery, mergeGraphs, releaseNodeFromGroup } from './Common';
import { ScatterGroupNode, FocusNode, NodeClicked, TriggerNodeClicked } from './EventTypes';
import { EdgeFilterControl } from './EdgeFilterControl'
import { Panel } from './ControlPanel'
import { useGraphLayout } from './GraphLayoutContext';

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
        () => new Set(
            edgeLabels
                .filter(({ visible }) => visible)
                .map(({ label }) => label)
        ),
        [edgeLabels]
    );
    
    const {
        selectedLayout,
        applyLayout,
        startSelectedWorkerLayout,
        stopAllWorkerLayouts,
        clearCustomBBox,
    } = useGraphLayout();

    /**
     * Complete a topology-changing graph operation while all layout workers are
     * stopped, then reapply the currently selected layout to the new topology.
     */
    const finishGraphMutation = (callback = () => { return undefined; }) => {
        cleanGraph(sigma.getGraph());
        clearCustomBBox();
        applyLayout(selectedLayout);
        callback();
    };

    const scatterGroupNode = (node: string, mode = 'replace') => {
        handleGroupedNodeClicked(node, () => { return undefined; }, mode);
    };

    const getEdgeLabelVisibilityString = () => {
        if (visibleEdgeLabels.size === edgeLabels.length) {
            return "";
        } else {
            return ` (${visibleEdgeLabels.size}/${edgeLabels.length})`;
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
        const effectiveMode = mode || props.grouping?.behaviour;
        if (effectiveMode !== "expand" && effectiveMode !== "replace") {
            return;
        }

        // The worker and the frozen normalization bounds must not remain active
        // while nodes and edges are added or removed.
        stopAllWorkerLayouts();
        clearCustomBBox();

        const graph = sigma.getGraph();
        const rawChildren = graph.getNodeAttribute(node, "children");
        const children = Array.isArray(rawChildren) ? rawChildren : [];
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
                if (effectiveMode === "replace") {
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

        if (effectiveMode === "replace") {
            graph.dropNode(node);
        }

        finishGraphMutation(callback);
    };

    const releaseNodeFromGroupSafely = (childNode: string, groupNode: string) => {
        stopAllWorkerLayouts();
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
            startSelectedWorkerLayout();
            loadMoreDataForNode(node, callback);
        } else {
            clearCustomBBox();
            startSelectedWorkerLayout();
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
        const queryTemplate = props.nodeQuery;
        if (!queryTemplate) {
            callback();
            return;
        }

        const query = queryTemplate.replace(/\$subject|\?subject/g, node);
        let newElements: any[] = [];

        loadGraphDataFromQuery(query, props.context)
            .onValue((elements) => {
                newElements = elements;
            })
            .onEnd(() => {
                // Prevent the layout worker from processing an intermediate graph
                // while nodes, edges and groups are being changed.
                stopAllWorkerLayouts();
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
    const stopAllWorkerLayoutsRef = React.useRef(stopAllWorkerLayouts);
    const startSelectedWorkerLayoutRef = React.useRef(startSelectedWorkerLayout);

    activeNodeRef.current = activeNode;
    draggedNodeRef.current = draggedNode;
    handleNodeClickedRef.current = handleNodeClicked;
    focusNodeRef.current = focusNode;
    scatterGroupNodeRef.current = scatterGroupNode;
    releaseNodeFromGroupSafelyRef.current = releaseNodeFromGroupSafely;
    stopAllWorkerLayoutsRef.current = stopAllWorkerLayouts;
    startSelectedWorkerLayoutRef.current = startSelectedWorkerLayout;

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
                        const node = "<" + event.data.node + ">";
                        // Check if parent node exists in graph
                        if (!sigma.getGraph().hasNode(node)) {
                            // Node might be in group
                            // Look at all nodes with children attributes and see if the parent node is in there
                            const nodes = sigma.getGraph().nodes();
                            for (const possibleGroupNode of nodes) {
                                const children = sigma.getGraph().getNodeAttribute(possibleGroupNode, "children");
                                if (Array.isArray(children) && children.some((child) => child.node === node)) {
                                    // Parent node is in group, so release it before handling the click.
                                    releaseNodeFromGroupSafelyRef.current(node, possibleGroupNode);
                                    break;
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
                    const node = "<" + event.data.node + ">";
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
                } else {
                    startSelectedWorkerLayoutRef.current();
                }
            },
            mousedown: () => {
                // Stop every continuous layout while dragging.
                stopAllWorkerLayoutsRef.current();
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
                const hasVisibleEdge = edges.some((edge: string) => {
                    const edgeAttributes = sigma.getGraph().getEdgeAttributes(edge);
                    return visibleEdgeLabels.has(edgeAttributes.label);
                });

                // If there are no visible edges, hide the node
                if (!hasVisibleEdge) {
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
                if (!visibleEdgeLabels.has(data.label)) {
                    newData.hidden = true;
                }
            }

            return newData;
          },
        });
    }, [activeNode, props.edgeFilter, setSettings, sigma, visibleEdgeLabels]);

    // Retrieve the distinct labels after initialisation and topology changes.
    useEffect(() => {
        const currentLabels = new Set<string>();

        sigma.getGraph().forEachEdge((_edge: string, attributes: Attributes) => {
            if (typeof attributes.label === "string" && attributes.label.length > 0) {
                currentLabels.add(attributes.label);
            }
        });

        setEdgeLabels((previousLabels) => {
            const previousVisibility = new Map(
                previousLabels.map(({ label, visible }) => [label, visible])
            );

            return Array.from(currentLabels)
                .sort((a, b) => a.localeCompare(b))
                .map((label) => ({
                    label,
                    visible: previousVisibility.has(label)
                        ? previousVisibility.get(label) as boolean
                        : true
                }));
        });
        setEdgeLabelsNeedUpdate(false);
    }, [sigma, edgeLabelsNeedUpdate]);

    if (props.edgeFilter) {
        return (
            <ControlsContainer position="bottom-right">
                <Panel title={"Filter" + getEdgeLabelVisibilityString()}>
                    <EdgeFilterControl
                        edgeLabels={edgeLabels}
                        setEdgeLabels={setEdgeLabels}
                    />
                </Panel>
            </ControlsContainer>
        );
    }

    return null;
}

export default GraphEvents