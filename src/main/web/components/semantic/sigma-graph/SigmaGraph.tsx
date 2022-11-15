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
import { useEffect } from "react";
import * as assign from 'object-assign';
import { createElement } from 'react';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Spinner } from 'platform/components/ui/spinner';

import * as GraphInternals from 'platform/components/semantic/graph/GraphInternals';

import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, ControlsContainer, SearchControl, useLoadGraph } from "@react-sigma/core";

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

    /**
     * Display a search field.
     * @default false
     */
    searchBox?: boolean;

    /**
     * Optional colour palette for nodes.
     * Passed as JSON object with RDF types as keys and colours as values.
     * @default {}
     * @example
     * {
     *  "http://www.w3.org/2002/07/owl#Class": "#ff0000",
     *  "http://www.w3.org/2002/07/owl#ObjectProperty": "#00ff00"
     * }
     */
    colours?: { [key: string]: string };
}

export const Fa2: React.FC = () => {
    const { start, kill } = useWorkerLayoutForceAtlas2({ settings: { slowDown: 10 }});
    
    useEffect(() => {
        start();
        return () => kill();
    }, [start, kill]);

    return null;
}

export const LoadGraph = (props: any) => {
    const loadGraph = useLoadGraph();
    useEffect(() => {
        const graph = new MultiDirectedGraph();

        for (const i in props.data) {
            const element = props.data[i];
            if (element.group == "nodes") {
                let color = "#000000";
                if (props.colours && element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']) {
                    const types = element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']
                    for (const type of types) {
                        if (props.colours[type.value]) {
                            color = props.colours[type.value];
                            break;
                        }
                    }
                }
                graph.addNode(element.data.id, {
                    label: element.data.label,
                    size: 10,
                    color: color
                })
            }
        }

        for (const i in props.data) {
            const element = props.data[i];
            if (element.group == "edges") {
                graph.addEdgeWithKey(element.data.id, element.data.source, element.data.target, {
                    label: element.data.label,
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

    public static DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
    '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
    ];

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
            hidePredicates: SigmaGraph.DEFAULT_HIDE_PREDICATES,
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
        const searchBox = this.props.searchBox || false;
        const colours = this.props.colours || {};
        if (this.state.isLoading) {
          return createElement(Spinner);
        } else {
            return (
                <SigmaContainer 
                    graph={MultiDirectedGraph} 
                    style={{ height: `${height}px`, width: `${width}px` }}
                    settings={{ renderEdgeLabels: true, defaultEdgeType: "arrow"}}
                >
                    <LoadGraph data={ this.state.elements } colours={ colours } />
                    <Fa2 /> 
                    {searchBox && <ControlsContainer><SearchControl /></ControlsContainer>}
                </SigmaContainer>
            );
        }
    }
}

export default SigmaGraph