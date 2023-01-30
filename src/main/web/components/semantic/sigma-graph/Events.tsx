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

export const GraphEvents: React.FC = () => {
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<string | null>(null);

    const expandNode = (nodeId: string) => {
        // Get the node and set the attribute childrenCollapsed to false.
        sigma.getGraph().setNodeAttribute(nodeId, "childrenCollapsed", false);

        // Get all the nodes connected to this node and set the attribute hidden to false.
        const neighbors = sigma.getGraph().neighbors(nodeId);
        neighbors.forEach((n) => {
            sigma.getGraph().setNodeAttribute(n, "hidden", false);
        });

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
            },
            mousedown: () => {
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox()) 
                }
                if (activeNode) {
                    const childrenCollapsed = sigma.getGraph().getNodeAttribute(activeNode, "childrenCollapsed");
                    if (childrenCollapsed) {
                        expandNode(activeNode);
                    } else {
                        collapseNode(activeNode);
                    }

                    setDraggedNode(activeNode);
                }
            },
            mousemove: (e) => {
                if (draggedNode) {
                    // Get new position of node
                    const pos = sigma.viewportToGraph(e);
                    //console.log(draggedNode, pos)
                    sigma.getGraph().setNodeAttribute(draggedNode, "x", pos.x);
                    sigma.getGraph().setNodeAttribute(draggedNode, "y", pos.y);
                    const attr = sigma.getGraph().getNodeAttributes(draggedNode);
                    sigma.refresh();
                    // Prevent sigma to move camera:
                    e.preventSigmaDefault();
                    //e.original.preventDefault();
                    //e.original.stopPropagation();
                }
            }
        });
    }, [registerEvents, sigma, draggedNode, activeNode]);
    return null;
}

export default GraphEvents