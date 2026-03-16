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
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { addNotification } from 'platform/components/ui/notification';

import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, ControlsContainer, SearchControl } from "@react-sigma/core";
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";

import { SigmaGraphConfig } from './Config'
import { GraphEvents } from './GraphEvents'
import { GraphControls } from './GraphControls'
import { clearStateFromLocalStorage, createGraphFromElements, getStateFromLocalStorage, loadGraphDataFromQuery, saveStateIntoLocalStorage } from './Common'
import ArrowEdgeProgram from './programs/edge.arrow'

import "@react-sigma/core/lib/react-sigma.min.css";
import "./styles.css"
export interface State {
    elements: Cy.ElementDefinition[];
    graph: MultiDirectedGraph;
    key: string;
    noResults?: boolean;
    isLoading?: boolean;
    error?: any;
    warning?: string;
  }
export class SigmaGraph extends Component<SigmaGraphConfig, State> {

    constructor(props: SigmaGraphConfig, context: any) {
        super(props, context);
        this.state = {
          elements: [],
          graph: undefined,
          noResults: false,
          isLoading: true,
          key: this.generateKey()
        };
      }
    
    componentDidMount() : void {
        this.loadInitialGraphData(this.props);      
        window.addEventListener('beforeunload', () => this.componentCleanup());
    }

    componentWillUnmount() : void {        
        this.componentCleanup();
        window.removeEventListener('beforeunload', () => this.componentCleanup()); // remove the event handler for normal unmounting
        
    }

    private componentCleanup() : void {
        if (this.props.persistGraph) {
            saveStateIntoLocalStorage(this.state.graph, this.props.query);
        }
    }

    private generateKey() : string {
        return Math.random().toString(36).substring(7);
    }

    private loadInitialGraphData(props: SigmaGraphConfig) : void {
        this.setState({ error:undefined });
        const graphFromLocalStorage = props.persistGraph ? getStateFromLocalStorage(props.query) : null;
        if (graphFromLocalStorage) {
            this.setState({
                graph: graphFromLocalStorage,
                isLoading: false
            })
            addNotification({
                level: 'success',
                position: this.props.persistGraphMessagePosition ? this.props.persistGraphMessagePosition : 'tr',
                message: this.props.persistGraphMessage ? this.props.persistGraphMessage : "The graph has been restored from the browser's local storage.",
                action: {
                    label: 'Reset',
                    callback: () => {
                        clearStateFromLocalStorage()
                        this.loadInitialGraphData(this.props); 
                    }
                }
            });
        } else {
            loadGraphDataFromQuery(props.query, this.context.semanticContext).onValue((elements) => {
                    this.setState({
                        elements: elements,
                        noResults: !elements.length,
                        isLoading: false
                    })
                })
                .onError((error) => { this.setState({ error: error, isLoading: false }) })
                .onEnd(() => {

                    const config = assign({},
                        {
                            grouping: this.props.grouping || { enabled: false},
                            sizes: this.props.sizes || { nodes: 10, edges: 5 },
                        },
                        this.props
                    );
                    const graph = createGraphFromElements(this.state.elements, config)
                    this.setState({ graph: graph})
                    if (this.props.id) {
                        trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
                    }
                })
        }
    }

    private newKey() : void {
        this.setState({ key: this.generateKey() });
    }

    render() {
        const width = this.props.width || "800px";
        const height = this.props.height || "600px";
        const searchBox = this.props.searchBox || false;
        const controls = this.props.controls || false;
        const edgeFilter = this.props.edgeFilter || false;
        
        const sigmaSettings = { 
            defaultEdgeType: "arrow",
            defaultNodeType: "image",
            nodeProgramClasses: { image: getNodeProgramImage() },
            edgeProgramClasses: { arrow: ArrowEdgeProgram },
            renderEdgeLabels: true,
            maxEdgeSize: 2,
        };
        
        const colours = this.props.colours || {};
        const grouping = this.props.grouping || { enabled: false};
        const nodeQuery = this.props.nodeQuery || "";
        const sizes = this.props.sizes || { nodes: 10, edges: 5 };
        const persistGraph = this.props.persistGraph || false;

        if (this.state.isLoading) {
            return createElement(Spinner);
        } else if (this.state.error) {
            return createElement(ErrorNotification, { errorMessage: this.state.error });
        } else {
            return (
                <SigmaContainer
                    key={ this.state.key }
                    graph={ this.state.graph } 
                    style={{ height: `${height}`, width: `${width}` }}
                    settings={ sigmaSettings }
                >   
                    <GraphEvents 
                        context={ this.context.semanticContext} 
                        colours={ colours }
                        edgeFilter={ edgeFilter }
                        grouping={ grouping } 
                        nodeQuery={ nodeQuery }
                        persistGraph={ persistGraph }
                        sizes={ sizes } 
                    />
                    {searchBox &&  <ControlsContainer position="bottom-left"><SearchControl /> </ControlsContainer>}
                    {controls && <GraphControls position="top-left" reset={() => this.newKey()}/>}
                </SigmaContainer>

            )
        }
    }
}

export default SigmaGraph