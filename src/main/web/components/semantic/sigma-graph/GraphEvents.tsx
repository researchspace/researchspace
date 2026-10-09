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
import { getNodeQueryContext } from './NodeQuery';
import { cleanGraph, createGraphFromElements, expandGroup, loadGraphDataFromQuery, mergeGraphs, releaseNodeFromGroup } from './Common';
import { ScatterGroupNode, FocusNode, NodeClicked, TriggerNodeClicked } from './EventTypes';
import { EdgeFilterControl } from './EdgeFilterControl'
import { Panel } from './ControlPanel'
import { useGraphLayout } from './GraphLayoutContext';
import { LayoutExploration, LayoutPause } from './GraphLayoutRunner';

import "@react-sigma/core/lib/react-sigma.min.css";

export const GraphEvents: React.FC<GraphEventsConfig> = (props) => {

    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const setSettings = useSetSettings();
    const camera = useCamera();

    const [ activeNode, setActiveNode ] = useState<string | null>(null);
    const dragRef = React.useRef<{ node: string; x: number; y: number; moved: boolean; pause?: LayoutPause }>();
    const suppressClickRef = React.useRef(false);
    const requestsRef = React.useRef(new Map<string, { cancellation: Cancellation; exploration?: LayoutExploration }>());

    const [ edgeLabels, setEdgeLabels ] = useState<{label: string, visible: boolean}[]>([]);
    const [ topologyVersion, setTopologyVersion ] = useState(0);

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
    
    const { pauseLayout, resumeLayout, mutateGraph, exploreGraph } = useGraphLayout();

    const withGraphCleanup = (change: () => void) => () => {
        change();
        cleanGraph(sigma.getGraph());
        setTopologyVersion(version => version + 1);
    };

    useEffect(() => () => {
        requestsRef.current.forEach(request => request.cancellation.cancelAll());
        requestsRef.current.clear();
    }, [sigma, props.nodeQuery, props.context]);

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
            exploreGraph();
            return;
        }

        exploreGraph(withGraphCleanup(() => expandGroup(sigma.getGraph(), node, effectiveMode)));
        callback();
    };

    const releaseNodeFromGroupSafely = (childNode: string, groupNode: string) => {
        exploreGraph(withGraphCleanup(() => releaseNodeFromGroup(sigma.getGraph(), childNode, groupNode)));
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
            loadMoreDataForNode(node, callback, exploreGraph());
        } else {
            exploreGraph();
            callback();
        }

        const componentId = props.id;

        if (!omitEvent) {
            const data = {
                componentId,
                id: node,
                node,
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
                source: componentId,
                data
            });
        }

        sigma.scheduleRefresh();
    };

    const loadMoreDataForNode = (
        node: string,
        callback = () => { return undefined; },
        exploration?: LayoutExploration
    ) => {
        const queryTemplate = props.nodeQuery;
        if (!queryTemplate) {
            callback();
            return;
        }

        const context = getNodeQueryContext(node, props.context);
        // Blank-node identifiers are scoped to their result and literals cannot
        // be RDF subjects. Only named resources have a reusable expansion IRI.
        if (!context) {
            callback();
            return;
        }
        const requestKey = JSON.stringify([queryTemplate, node]);
        const pending = requestsRef.current.get(requestKey);
        if (pending) {
            // A new deliberate click may follow Stop while this same query is
            // pending. Retain its new intent without sending a duplicate query.
            pending.exploration = exploration;
            return;
        }
        const cancellation = new Cancellation();
        const request = { cancellation, exploration };
        requestsRef.current.set(requestKey, request);
        loadGraphDataFromQuery(queryTemplate, context, cancellation).observe({
            value: (elements) => {
                if (cancellation.aborted) return;
                // Renew the exploration run after merging, even if its earlier
                // time budget expired while waiting. A later Stop takes priority.
                const newGraph = createGraphFromElements(elements, props);
                mutateGraph(withGraphCleanup(() => mergeGraphs(sigma.getGraph(), newGraph)), request.exploration);
                callback();
            },
            error: (error) => {
                if (!cancellation.aborted) console.warn('Failed to expand Sigma graph:', error);
            },
            end: () => {
                if (requestsRef.current.get(requestKey) === request) requestsRef.current.delete(requestKey);
            },
        });
    };

    // External event listeners should remain registered across ordinary renders,
    // while still invoking the latest render's state and callback implementations.
    const activeNodeRef = React.useRef(activeNode);
    const handleNodeClickedRef = React.useRef(handleNodeClicked);
    const focusNodeRef = React.useRef(focusNode);
    const scatterGroupNodeRef = React.useRef(scatterGroupNode);
    const releaseNodeFromGroupSafelyRef = React.useRef(releaseNodeFromGroupSafely);
    const pauseLayoutRef = React.useRef(pauseLayout);
    const resumeLayoutRef = React.useRef(resumeLayout);

    activeNodeRef.current = activeNode;
    handleNodeClickedRef.current = handleNodeClicked;
    focusNodeRef.current = focusNode;
    scatterGroupNodeRef.current = scatterGroupNode;
    releaseNodeFromGroupSafelyRef.current = releaseNodeFromGroupSafely;
    pauseLayoutRef.current = pauseLayout;
    resumeLayoutRef.current = resumeLayout;

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
                        const rawNode = event.data.node.trim();
                        const node = rawNode.startsWith("<") && rawNode.endsWith(">")
                                        ? rawNode
                                        : `<${rawNode}>`; 
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
                                if (sigma.getGraph().hasNode(currentActiveNode)) sigma.getGraph().setNodeAttribute(currentActiveNode, "highlighted", false);
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
                     const rawNode = event.data.node.trim();
                        const node = rawNode.startsWith("<") && rawNode.endsWith(">")
                                        ? rawNode
                                        : `<${rawNode}>`;
                     
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
            if (sigma.getGraph().hasNode(node)) sigma.getGraph().removeNodeAttribute(node, "highlighted");
        };

        sigma.on("enterNode", handleEnterNode);
        sigma.on("leaveNode", handleLeaveNode);

        return () => {
            sigma.off("enterNode", handleEnterNode);
            sigma.off("leaveNode", handleLeaveNode);
        };
    }, [sigma]);

    // A click is distinct from a drag. Refs keep pointer updates synchronous.
    useEffect(() => {
        registerEvents({
            downNode: ({ node, event }) => {
                if (event.original.button !== 0) return;
                suppressClickRef.current = false;
                dragRef.current = { node, x: event.x, y: event.y, moved: false };
            },
            clickNode: ({ node }) => {
                if (!suppressClickRef.current && sigma.getGraph().hasNode(node)) handleNodeClickedRef.current(node);
            },
            mousemovebody: (event) => {
                const drag = dragRef.current;
                if (!drag || !sigma.getGraph().hasNode(drag.node)) return;
                if (!drag.moved && Math.hypot(event.x - drag.x, event.y - drag.y) > 3) {
                    drag.moved = true;
                    drag.pause = pauseLayoutRef.current();
                    if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
                }
                if (drag.moved) {
                    const position = sigma.viewportToGraph(event);
                    sigma.getGraph().mergeNodeAttributes(drag.node, { x: position.x, y: position.y });
                }
                event.preventSigmaDefault();
            },
            mouseup: () => {
                const drag = dragRef.current;
                if (!drag) return;
                dragRef.current = undefined;
                suppressClickRef.current = drag.moved;
                if (drag.moved) sigma.setCustomBBox(null);
                resumeLayoutRef.current(drag.pause);
            },
        });
    }, [registerEvents, sigma]);

    // Compute visibility only after filters or topology change, never per layout frame.
    const visibleNodes = useMemo(() => {
        const nodes = new Set<string>();
        if (props.edgeFilter) sigma.getGraph().forEachEdge((_edge, attributes, source, target) => {
            if (visibleEdgeLabels.has(attributes.label)) { nodes.add(source); nodes.add(target); }
        });
        return nodes;
    }, [sigma, props.edgeFilter, visibleEdgeLabels, topologyVersion]);

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

            if (props.edgeFilter && !visibleNodes.has(node)) newData.hidden = true;
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
    }, [activeNode, props.edgeFilter, setSettings, sigma, visibleEdgeLabels, visibleNodes, topologyVersion]);

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
    }, [sigma, topologyVersion]);

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
