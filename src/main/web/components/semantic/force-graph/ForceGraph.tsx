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
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Spinner } from 'platform/components/ui/spinner';
import * as GraphInternals from 'platform/components/semantic/graph/GraphInternals';

import { ForceGraph2D, ForceGraph3D, ForceGraphVR, ForceGraphAR } from 'react-force-graph';

export interface ForceGraphConfig {

    /**
     * Identifier of the graph.
     * Used for event handling.
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

}

export interface State {
    elements: Cy.ElementDefinition[];
    noResults?: boolean;
    isLoading?: boolean;
    error?: any;
    warning?: string;
  }
export class ForceGraph extends Component<ForceGraphConfig, State> {

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

    private fetchAndSetData(props: ForceGraphConfig): void {
        this.setState({ error: undefined})

        const config = assign(
          {},
          {
            hidePredicates: ForceGraph.DEFAULT_HIDE_PREDICATES,
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

    private generateGraphData(elements: Cy.ElementDefinition[]): any {
        const convertToGraphData = (element: any) => {
            const converted = element.data;
            converted.name = element.data.label;
            return converted
        }
        const nodes = elements.filter(e => e.data && e.data.id).map(convertToGraphData);
        const links = elements.filter(e => e.data && e.data.source && e.data.target).map(convertToGraphData);
        return { nodes, links };
      }

    componentDidMount(): void {
        this.fetchAndSetData(this.props);
    }

    render() {
        if (this.state.isLoading) {
            return React.createElement(Spinner)
        } else {
            return (<ForceGraph3D graphData={this.generateGraphData( this.state.elements )}/>);
        }
    }

}

export default ForceGraph;