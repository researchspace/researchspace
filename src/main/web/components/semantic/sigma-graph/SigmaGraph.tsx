import * as React from 'react';
import { Component } from 'platform/api/components';

import { useEffect } from "react";
import { Graph } from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";

export interface SigmaGraphConfig {
    id?: string;

    /**
     *  Width of the graph in pixels.
     *  @default 800
     */
    width?: number;

    /**
     * Height of the graph in pixels.
     * @default 600
     */

    height?: number;
}

export const LoadGraph = () => {
    const loadGraph = useLoadGraph();
  
    useEffect(() => {
        const graph = new Graph();

        const RED = "#FA4F40";
        const BLUE = "#727EE0";
        const GREEN = "#5DB346";

        graph.addNode("John", { size: 15, label: "John", color: RED });
        graph.addNode("Mary", { size: 15, label: "Mary", color: RED });
        graph.addNode("Suzan", { size: 15, label: "Suzan", color: RED });
        graph.addNode("Nantes", { size: 15, label: "Nantes", color: BLUE });
        graph.addNode("New-York", { size: 15, label: "New-York", color: BLUE });
        graph.addNode("Sushis", { size: 7, label: "Sushis", color: GREEN });
        graph.addNode("Falafels", { size: 7, label: "Falafels", color: GREEN });
        graph.addNode("Kouign Amann", { size: 7, label: "Kouign Amann", color: GREEN });

        graph.addEdge("John", "Mary", { type: "line", label: "works with", size: 5 });
        graph.addEdge("Mary", "Suzan", { type: "line", label: "works with", size: 5 });
        graph.addEdge("Mary", "Nantes", { type: "arrow", label: "lives in", size: 5 });
        graph.addEdge("John", "New-York", { type: "arrow", label: "lives in", size: 5 });
        graph.addEdge("Suzan", "New-York", { type: "arrow", label: "lives in", size: 5 });
        graph.addEdge("John", "Falafels", { type: "arrow", label: "eats", size: 5 });
        graph.addEdge("Mary", "Sushis", { type: "arrow", label: "eats", size: 5 });
        graph.addEdge("Suzan", "Kouign Amann", { type: "arrow", label: "eats", size: 5 });

        graph.nodes().forEach((node, i) => {
            const angle = (i * 2 * Math.PI) / graph.order;
            graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
            graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
        });

        loadGraph(graph);
    }, [loadGraph]);
  
    return null;
  };

export class SigmaGraph extends Component<SigmaGraphConfig> {

    constructor(props: SigmaGraphConfig, context: any) {
        super(props, context);
    }

    render() {
        const width = this.props.width || 800;
        const height = this.props.height || 600;
        return (
            <SigmaContainer style={{ height: `${height}px`, width: `${width}px` }}>
                <LoadGraph />
            </SigmaContainer>
        );
    }
}

export default SigmaGraph