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

import { GraphEventsConfig } from './Config';
import "@react-sigma/core/lib/react-sigma.min.css";


export const GraphEvents: React.FC<GraphEventsConfig> = (props) => {

    const [ activeNode, setActiveNode ] = useState<string | null>(null);
    const [ draggedNode, setDraggedNode ] = useState<string | null>(null);
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();

    const graph = useSigma().getGraph();
    const layoutSettings = inferSettings(graph);

    const { start, stop, kill } = useWorkerLayoutForceAtlas2({ settings: layoutSettings });

    const handleNodeClicked = (node: string) => {
        const attributes = sigma.getGraph().getNodeAttributes(node);
        console.log("Node clicked: " + node);
        console.log(attributes)
    }

    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    useEffect(() => {

        sigma.on("enterNode", (e) => {
            setActiveNode(e.node);
        });
        sigma.on("leaveNode", () => { 
            setActiveNode(null);
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
                // Disable the autoscale at the first down interaction
                if (!sigma.getCustomBBox()) {
                    sigma.setCustomBBox(sigma.getBBox()) 
                }
                // Stop the layout
                stop();

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