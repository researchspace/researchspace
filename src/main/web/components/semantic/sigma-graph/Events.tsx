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

import { useRegisterEvents, useSigma } from "@react-sigma/core";

import "@react-sigma/core/lib/react-sigma.min.css";

const MODE_EXPAND = 1;
const MODE_REPLACE = 2;

export interface GraphEventsProps {
    /**
     * Boolean that indicates if the layout is running
     **/
    layoutRun?: boolean;

    /**
     * Function to set the layoutRun state
     **/
    setLayoutRun?: (layoutRun: boolean) => void;
}


export const GraphEvents: React.FC<GraphEventsProps> = (props) => {
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<string | null>(null);

    const expandNode = (groupedNode: string) => {

        const mode = MODE_REPLACE;

        // Get the node and set the attribute childrenCollapsed to false.
        sigma.getGraph().setNodeAttribute(groupedNode, "childrenCollapsed", false);

        // Get the position of the node
        const x = sigma.getGraph().getNodeAttribute(groupedNode, "x");
        const y = sigma.getGraph().getNodeAttribute(groupedNode, "y");

        // Get all the nodes connected to this node and set the attribute hidden to false.
        // Set the position of the nodes to the position of the parent node and add a small offset.
        const outNeighbors = sigma.getGraph().outNeighbors(groupedNode);
        outNeighbors.forEach((n, i) => {
            const angle = (i * 2 * Math.PI) / sigma.getGraph().order;
            sigma.getGraph().setNodeAttribute(n, "hidden", false);
            sigma.getGraph().setNodeAttribute(n, "x", x + 1 * Math.cos(angle));
            sigma.getGraph().setNodeAttribute(n, "y", y + 1 * Math.sin(angle));
        });

        if (mode === MODE_REPLACE) {
            const inNeighbours = sigma.getGraph().inNeighbors(groupedNode);
            const inEdges = sigma.getGraph().inEdges(groupedNode);
            for (const edge of inEdges) {
                const attributes = sigma.getGraph().getEdgeAttributes(edge);
                for (const sourceNode of inNeighbours) {
                    for (const targetNode of outNeighbors) {
                        if(!sigma.getGraph().hasEdge(sourceNode+targetNode)) {
                            sigma.getGraph().addEdgeWithKey(sourceNode+targetNode, sourceNode, targetNode, attributes);
                        }
                    }
                }
            }
            sigma.getGraph().dropNode(groupedNode)
            setActiveNode(null)
            setDraggedNode(null)
        }

        // Restart the layout
        if (props.setLayoutRun) {
            props.setLayoutRun(true)
        }
        sigma.refresh();
        
    }
    
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
                    const childrenCollapsed = sigma.getGraph().getNodeAttribute(activeNode, "childrenCollapsed");
                    if (childrenCollapsed) {
                        expandNode(activeNode);
                    }
                }
            },
            mousedown: () => {
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox()) 
                }

                setDraggedNode(activeNode);
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