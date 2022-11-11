import * as React from 'react';
import * as assign from 'object-assign';
import { createElement } from 'react';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Spinner } from 'platform/components/ui/spinner';

import * as GraphInternals from 'platform/components/semantic/graph/GraphInternals';

import { useEffect } from "react";
import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";

import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";

import "@react-sigma/core/lib/react-sigma.min.css";

export interface State {
    elements: Cy.ElementDefinition[];
    noResults?: boolean;
    isLoading?: boolean;
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
        const graph = new MultiDirectedGraph();

        for (const i in data.data) {
            const element = data.data[i];
            if (element.group == "nodes") {
                graph.addNode(element.data.id, {
                    label: element.data.label,
                    size: 15
                })
            }
        }

        for (const i in data.data) {
            const element = data.data[i];
            if (element.group == "edges") {
                graph.addEdge(element.data.source, element.data.target, {
                    type: "line",
                    labe: element.data.label,
                    size: 5
                })
            }
        }

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
          isLoading: true,
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
            //this.catchCORSError(elements);
            this.setState({
                elements: elements,
                noResults: !elements.length,
                isLoading: false
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
        if (this.state.isLoading) {
          return createElement(Spinner);
        } else {
            return (
                <SigmaContainer graph={MultiDirectedGraph} style={{ height: `${height}px`, width: `${width}px` }}>
                    <LoadGraph data={ this.state.elements } />
                    <Fa2 />
                </SigmaContainer>
            );
        }
    }
}

export default SigmaGraph