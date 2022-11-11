import * as React from 'react';
import * as assign from 'object-assign';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

import * as GraphInternals from 'platform/components/semantic/graph/GraphInternals';

import { useEffect } from "react";
import { Graph } from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";

import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";

import "@react-sigma/core/lib/react-sigma.min.css";

export interface State {
    elements: Cy.ElementDefinition[];
    noResults?: boolean;
    error?: any;
    warning?: string;
  }
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

export const Fa2: React.FC = () => {
    const { start, kill } = useWorkerLayoutForceAtlas2({ settings: { slowDown: 10 }});
    
    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    return null;
}

export const LoadGraph = (data: any) => {
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

export class SigmaGraph extends Component<SigmaGraphConfig, State> {

    private readonly cancellation = new Cancellation();
    private fetching = this.cancellation.derive();

    constructor(props: SigmaGraphConfig, context: any) {
        super(props, context);
        this.state = {
          elements: [],
          noResults: false,
        };
    }

    componentDidMount(): void {
        this.fetchAndSetData(this.props);
    }
    
    private fetchAndSetData(props: SigmaGraphConfig): void {
        this.setState({ error: undefined})

        const config = assign(
          {},
          {
            hidePredicates: false,
          },
          props
        );

        this.fetching = this.cancellation.deriveAndCancel(this.fetching)
        
        const context = this.context.semanticContext;
        const graphDataWithLabels = this.fetching.map(GraphInternals.getGraphDataWithLabels(config, { context }));
        graphDataWithLabels.onValue((elements) => {
            this.catchCORSError(elements);
            this.setState({
                elements: elements,
                noResults: !elements.length,
            });
        })
        .onError((error) => this.setState({ error }))
        .onEnd(() => {
            if (this.props.id) {
                trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
            }
        });
    }

    private catchCORSError(elements: Cy.ElementDefinition[]) {
        const thumbnails = elements.map((element) => (element.data as any).thumbnail);
    
        const loadingImages = thumbnails.map(
          (thumbnail) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                resolve();
              };
              img.onerror = () => {
                reject(
                  "Some images are not accessible or can't be rendered on canvas because of CORS or mixed content error (loading HTTP resource from HTTPS context)!"
                );
              };
              img.crossOrigin = 'Anonymous';
              img.src = thumbnail;
            })
        );
    
        Promise.all(loadingImages)
          .then(() => this.setState({ warning: undefined }))
          .catch((warning) => this.setState({ warning }));
      }

    render() {
        const width = this.props.width || 800;
        const height = this.props.height || 600;
        
        return (
            <SigmaContainer style={{ height: `${height}px`, width: `${width}px` }}>
                <LoadGraph data={ this.state.elements } />
                <Fa2 />
            </SigmaContainer>
        );
    }
}

export default SigmaGraph