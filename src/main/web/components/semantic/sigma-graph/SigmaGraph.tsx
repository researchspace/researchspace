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

import { SigmaGraphConfig, DEFAULT_HIDE_PREDICATES } from './Config'
import { GraphEvents } from './Events';
import { GraphController } from './GraphController';
import { LoadGraph,  } from './LoadGraph';
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
            hidePredicates: DEFAULT_HIDE_PREDICATES,
          },
          props
        );

        this.fetching = this.cancellation.deriveAndCancel(this.fetching)
        
        const context = this.context.semanticContext;
        const graphDataWithLabels = this.fetching.map(getGraphDataWithLabels(config, { context }));
        graphDataWithLabels.onValue((elements) => {
            if (props.grouping.enabled) {
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
        const width = this.props.width || "800px";
        const height = this.props.height || "600px";
        const searchBox = this.props.searchBox || false;
        const colours = this.props.colours || {};
        const sizes = this.props.sizes || { "nodes": 10, "edges": 5 };
        const grouping = this.props.grouping || { "enabled": false };
        const layout = this.props.layout || { "runFor": 2000 };
        const nodeQuery = this.props.nodeQuery || false;

        const context = this.context.semanticContext;

        const sigmaSettings = { 
            defaultEdgeType: "arrow",
            defaultNodeType: "image",
            nodeProgramClasses: { image: getNodeProgramImage() },
            renderEdgeLabels: true,
            autoRescale: false,
            maxEdgeSize: 2,
        };

        if (this.state.isLoading) {
          return createElement(Spinner);
        } else if (this.state.error) {
            return createElement(ErrorNotification, { errorMessage: this.state.error });
        } else {
            return (
                <SigmaContainer 
                    graph={MultiDirectedGraph} 
                    style={{ height: `${height}`, width: `${width}` }}
                    settings={sigmaSettings}
                >
                    <LoadGraph data={ this.state.elements } colours={ colours } sizes={ sizes } grouping={ grouping }/>
                    <GraphController>
                        <GraphEvents sizes={ sizes } colours={ colours } grouping={ grouping } nodeQuery={ nodeQuery } context={ context }/>
                        <LayoutForceAtlas config={layout} /> 
                    </GraphController>
                    {searchBox && <ControlsContainer><SearchControl /></ControlsContainer>}
                </SigmaContainer>
            );
        }
    }
}

export default SigmaGraph