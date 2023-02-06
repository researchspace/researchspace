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
import * as assign from 'object-assign';
import { createElement } from 'react';

import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

// TODO: Implement own version of this function in order to not rely on the graph component
// and to avoid side effects that might occur through sharing functions between components.
// Also, some changes have already been made to the GraphInternals file in order to retrieve the type labels.
import { getGraphDataWithLabels } from 'platform/components/semantic/graph/GraphInternals';

import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, ControlsContainer, SearchControl } from "@react-sigma/core";

import { GraphEvents } from './Events';
import { GraphController } from './GraphController';
import { LoadGraph } from './LoadGraph';
import { LayoutForceAtlas } from './LayoutForceAtlas';
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";

import "@react-sigma/core/lib/react-sigma.min.css";
export interface State {
    elements: Cy.ElementDefinition[];
    noResults?: boolean;
    isLoading?: boolean;
    error?: any;
    warning?: string;
  }
export interface SigmaGraphConfig {
    /**
     * Optional identifier
     * @default undefined
     */
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
     * Enable grouping of nodes by shared predicate and type
     * @default false
     */
    groupNodes?: boolean;


    /**
     * Number of nodes above which they will be grouped together.
     * @default 3
     */
    groupSize?: number;

    /**
     * Run layout for a given number of milliseconds
     * @default 2000
     */
    runLayoutFor?: number;

    /**
     * Sizes of the nodes and edges in pixe;s
     * Passed as a JSON object with the following properties:
     * - nodes: size of the nodes
     * - edges: size of the edges
     * @default {"nodes": 10, "edges": 5}
     */
    sizes?: { "nodes": number, "edges": number };

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
        const graphDataWithLabels = this.fetching.map(getGraphDataWithLabels(config, { context }));
        graphDataWithLabels.onValue((elements) => {
            if (props.groupNodes) {
                // Group nodes relies on the type property being set
                // Raise an error it not all nodes have a type
                const nodesWithoutType = elements.filter((element) => element.group === 'nodes' && !element.data['<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>']);
                if (nodesWithoutType.length > 0) {
                    this.setState({
                        error: 'All IRIs must have a type to when group-nodes is enabled. IRIs missing types: ' + nodesWithoutType.map( e => e.data.node.value).join(', '),
                        isLoading: false
                    });
                    return;
                }
            }
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

    render() {
        const width = this.props.width || 800;
        const height = this.props.height || 600;
        const searchBox = this.props.searchBox || false;
        const colours = this.props.colours || {};
        const sizes = this.props.sizes || { "nodes": 10, "edges": 5 };
        const groupNodes = this.props.groupNodes || false;
        const groupSize = this.props.groupSize || 3;
        const runLayoutFor = this.props.runLayoutFor || 2000;

        const sigmaSettings = { 
            defaultEdgeType: "arrow",
            defaultNodeType: "image",
            nodeProgramClasses: { image: getNodeProgramImage() },
            renderEdgeLabels: true,
        };

        if (this.state.isLoading) {
          return createElement(Spinner);
        } else if (this.state.error) {
            return createElement(ErrorNotification, { errorMessage: this.state.error });
        } else {
            return (
                <SigmaContainer 
                    graph={MultiDirectedGraph} 
                    style={{ height: `${height}px`, width: `${width}px` }}
                    settings={sigmaSettings}
                >
                    <LoadGraph data={ this.state.elements } colours={ colours } sizes={ sizes } groupNodes={ groupNodes } groupSize={ groupSize }/>
                    <GraphController>
                        <GraphEvents />
                        <LayoutForceAtlas runFor={runLayoutFor} /> 
                    </GraphController>
                    {searchBox && <ControlsContainer><SearchControl /></ControlsContainer>}
                </SigmaContainer>
            );
        }
    }
}

export default SigmaGraph