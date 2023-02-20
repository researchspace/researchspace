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

import { inferSettings } from 'graphology-layout-forceatlas2'
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { useRegisterEvents, useSigma } from "@react-sigma/core";

import { SigmaGraphConfig } from './Config';
import "@react-sigma/core/lib/react-sigma.min.css";

interface Node {
    id: string,
    position: {  
        x: number,
        y: number
    },
    mouse: {
        x: number,
        y: number
    }
}


export const GraphEvents: React.FC<SigmaGraphConfig> = (props) => {

    const [ activeNode, setActiveNode ] = useState<Node | null>(null);
    const [ draggedNode, setDraggedNode ] = useState<Node | null>(null);
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();

    const graph = useSigma().getGraph();
    const layoutSettings = inferSettings(graph);

    const { start, stop, kill } = useWorkerLayoutForceAtlas2({ settings: layoutSettings });


    const getNodeFromEvent = (e: any) => {
        const pos = sigma.viewportToGraph(e);
        const mouse = {
            x: e.x || e.event.x,
            y: e.y || e.event.y
        }
        return {
            id: e.node,
            position: pos,
            mouse: mouse
        }
    }

    const handleGroupedNodeClicked = (node: string) => {
        console.log("Grouped node clicked: " + node);
    }

    const handleNodeClicked = (node: string) => {
        const attributes = sigma.getGraph().getNodeAttributes(node);
        if (attributes.grouped) {
            handleGroupedNodeClicked(node);
        }
        console.log("Node clicked: " + node);
        console.log(attributes)
    }

    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    useEffect(() => {

        sigma.on("enterNode", (e) => {
            setActiveNode(getNodeFromEvent(e));
        });
        sigma.on("leaveNode", () => { 
            setActiveNode(null);
        });

        // Register the events
        registerEvents({
            mouseup: () => {
                if (draggedNode) {
                    setDraggedNode(null);
                    sigma.getGraph().removeNodeAttribute(draggedNode.id, "highlighted");
                } else if (activeNode) {
                    handleNodeClicked(activeNode.id);
                }
            },
            mousedown: (e) => {
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox()) 
                }
                // Stop the layout
                stop();
                if (activeNode) {
                    // If the mouse moved beyond a threshold since clicking the node, we consider it as a drag
                    const threshold = 20;
                    const dx = activeNode.mouse.x - e.x;
                    const dy = activeNode.mouse.y - e.y;
                    if (dx * dx + dy * dy > threshold * threshold) {
                        setDraggedNode(activeNode);
                    }
                }
            },
            mousemove: (e) => {
                if (draggedNode) {
                    // Get new position of node
                    const pos = sigma.viewportToGraph(e);
                    sigma.getGraph().setNodeAttribute(draggedNode.id, "x", pos.x);
                    sigma.getGraph().setNodeAttribute(draggedNode.id, "y", pos.y);
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