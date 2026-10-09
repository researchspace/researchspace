/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { isEqual } from 'lodash';
import { Cancellation } from 'platform/api/async';
import { createElement } from 'react';

import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { addNotification } from 'platform/components/ui/notification';

import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, ControlsContainer } from "@react-sigma/core";
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";

import { SigmaGraphConfig } from './Config'
import { GraphEvents } from './GraphEvents'
import { GraphControls } from './GraphControls'
import GraphSearchControl from './GraphSearchControl';
import { GraphLayoutName, GraphLayoutProvider, isGraphLayoutName } from './GraphLayoutContext'
import { clearStateFromLocalStorage, createGraphFromElements, getStateFromLocalStorage, getGraphStorageKey, loadGraphDataFromQuery, saveStateIntoLocalStorage } from './Common'
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
    restored?: boolean;
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
    
    private instanceId = 'sigma-' + this.generateKey();
    private request = new Cancellation();
    private mounted = false;
    private storageKey: string;
    private loadedContext: any;
    private sigmaSettings = {
        defaultEdgeType: 'arrow', defaultNodeType: 'image',
        nodeProgramClasses: { image: getNodeProgramImage() },
        edgeProgramClasses: { arrow: ArrowEdgeProgram },
        renderEdgeLabels: true,
    };
    private onBeforeUnload = () => this.componentCleanup();

    componentDidMount(): void {
        this.mounted = true;
        this.loadInitialGraphData(this.props);
        window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    componentDidUpdate(previous: SigmaGraphConfig): void {
        if (previous.query !== this.props.query || previous.id !== this.props.id ||
            previous.persistGraph !== this.props.persistGraph ||
            !isEqual(previous.grouping, this.props.grouping) ||
            !isEqual(previous.colours, this.props.colours) || !isEqual(previous.sizes, this.props.sizes) ||
            !isEqual(this.loadedContext, this.context.semanticContext)) {
            this.loadInitialGraphData(this.props);
        }
    }

    componentWillUnmount(): void {
        this.mounted = false;
        this.request.cancelAll();
        this.componentCleanup();
        window.removeEventListener('beforeunload', this.onBeforeUnload);
    }

    private componentCleanup(): void {
        if (this.storageKey && this.state.graph) saveStateIntoLocalStorage(this.state.graph, this.storageKey);
    }

    private generateKey(): string { return Math.random().toString(36).slice(2); }

    private loadInitialGraphData(props: SigmaGraphConfig): void {
        this.request.cancelAll();
        const cancellation = this.request = new Cancellation();
        this.loadedContext = this.context.semanticContext;
        // Cross-reload persistence needs an explicit, stable component id.
        this.storageKey = props.persistGraph && props.id && props.query
            ? getGraphStorageKey(props.id, props.query, this.loadedContext, props.grouping) : undefined;
        const storageKey = this.storageKey;
        const restored = storageKey ? getStateFromLocalStorage(storageKey) : null;
        const loaded = () => {
            if (props.id && this.mounted && !cancellation.aborted) {
                trigger({ eventType: BuiltInEvents.ComponentLoaded, source: props.id });
            }
        };
        if (restored) {
            this.setState({ graph: restored, restored: true, isLoading: false, error: undefined,
                key: this.generateKey() }, loaded);
            addNotification({
                level: 'success', position: props.persistGraphMessagePosition || 'tr',
                message: props.persistGraphMessage || "The graph has been restored from the browser's local storage.",
                action: { label: 'Reset', callback: () => {
                    clearStateFromLocalStorage(storageKey);
                    if (this.mounted && this.storageKey === storageKey) this.loadInitialGraphData(this.props);
                } },
            });
            return;
        }
        this.setState({ error: undefined, isLoading: true, restored: false, graph: undefined });
        loadGraphDataFromQuery(props.query, this.loadedContext, cancellation).observe({
            value: (elements) => {
                if (!this.mounted || cancellation.aborted) return;
                const graph = createGraphFromElements(elements, props);
                // Mount Sigma only after the complete graph exists.
                this.setState({ elements, graph, noResults: !elements.length, isLoading: false,
                    key: this.generateKey() }, loaded);
            },
            error: (error) => {
                if (this.mounted && !cancellation.aborted) this.setState({ error, isLoading: false });
            },
        });
    }

    render() {
        const width = this.props.width || "800px";
        const height = this.props.height || "600px";
        const searchBox = this.props.searchBox || false;
        const controls = this.props.controls || false;
        const edgeFilter = this.props.edgeFilter || false;
        
        const componentId = this.props.id || this.instanceId;

        const colours = this.props.colours || {};
        const grouping = this.props.grouping || { enabled: false};
        const nodeQuery = this.props.nodeQuery || "";
        const sizes = this.props.sizes || { nodes: 10, edges: 5 };
        const persistGraph = this.props.persistGraph || false;
        const initialLayout = isGraphLayoutName(this.props.layout)
            ? this.props.layout as GraphLayoutName
            : undefined;

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
                    settings={ this.sigmaSettings }
                >
                    <GraphLayoutProvider initialLayout={initialLayout} preservePositions={this.state.restored}
                        layoutRunDuration={this.props.layoutRunDuration} maxForceNodes={this.props.maxForceNodes}>
                        <GraphEvents
                            id={componentId}
                            context={ this.context.semanticContext}
                            colours={ colours }
                            edgeFilter={ edgeFilter }
                            grouping={ grouping }
                            nodeQuery={ nodeQuery }
                            persistGraph={ persistGraph }
                            sizes={ sizes }
                        />
                        {searchBox && <ControlsContainer position="bottom-left"><GraphSearchControl /></ControlsContainer>}
                        {controls && <GraphControls position="top-left" layoutControls={this.props.layoutControls} />}
                    </GraphLayoutProvider>
                </SigmaContainer>

            )
        }
    }
}

export default SigmaGraph
