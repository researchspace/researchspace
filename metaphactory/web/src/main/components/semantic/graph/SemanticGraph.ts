/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { identity } from 'core.lambda';
import { Props as ReactProps, createElement } from 'react';
import * as assign from 'object-assign';
import { isEqual } from 'lodash';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { BuiltInEvents } from 'platform/api/events';
import { navigateToResource } from 'platform/api/navigation';
import { TemplateItem } from 'platform/components/ui/template';

import { Graph } from './Graph';
import * as GraphInternals from './GraphInternals';
import { SemanticGraphConfig } from './Config';

import './SemanticGraph.scss';

export type SemanticGraphConfig = SemanticGraphConfig;
export type SemanticGraphProps = SemanticGraphConfig & ReactProps<SemanticGraph>;

export interface State {
  elements: Cy.ElementDefinition[];
  noResults?: boolean;
}

export class SemanticGraph extends Component<SemanticGraphProps, State> {

  public static DEFAULT_STYLE: Cy.InstanceJsonStyle = [
    {
      selector: 'edge',
      style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#bbb',
        'content': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-outline-width': 2,
        'width': 1,
        'text-outline-color': 'white',
        'font-size': '8px',
        'curve-style': 'bezier',
        'text-rotation': 'autorotate',
      },
    },
    {
      selector: 'node',
      style: {
        'background-fit': 'contain',
        'background-color': 'white',
        'background-image': 'data(thumbnail)',
        'content': 'data(label)',
        'shape': 'ellipse',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-outline-width': 2,
        'text-outline-color': 'white',
        'font-size': '10px',
        'border-color': '#bbb',
        'border-width': 1,
        'width': 40,
        'height': 40,
      },
    },
    {
      selector: 'node[?isLiteral]',
      style: {
        'background-fit': 'contain',
        'background-color': '#ddd',
        'border-color': '#bbb',
        'border-width': 1,
        'content': 'data(label)',
        'shape': 'rectangle',
        'text-valign': 'center',
        'text-halign': 'center',
        'padding-right': 2,
        'padding-left': 2,
        'padding-top': 2,
        'padding-bottom': 2,
        'width': 'label',
        'height': 'label',
        'text-outline-color': '#ddd',
        'font-size': '10px',
      },
    },
    {
      selector: 'edge.meta',
      style: {
        'content': '',
        'width': 1,
        'line-color': 'light-grey',
        'line-style': 'dotted',
        'target-arrow-shape': 'none',
        'curve-style': 'unbundled-bezier',
        'control-point-distances': '0 0 0',
      },
    },
    {
      selector: "[expanded-collapsed = 'collapsed']",
      style: {
        'shape': 'rectangle',
      },
    },
    {
      selector: "[expanded-collapsed = 'expanded']",
      style: {
        'text-valign': 'top',
        'border-opacity': 0.1,
      },
    },
  ];

  public static getDefaultProps =
    {
      mouseZoom: true,
      height: 400,
    };

  public static DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
  ];

  private readonly cancellation = new Cancellation();
  private fetching = this.cancellation.derive();

  constructor(props: SemanticGraphProps, context: any) {
    super(props, context);
    this.state = {
      elements: [],
      noResults: false,
    };
  }

  componentDidMount(): void {
    this.fetchAndSetData(this.props);
  }

  componentWillReceiveProps(nextProps: SemanticGraphProps): void {
    if (!isEqual(nextProps.query, this.props.query)) {
      this.fetchAndSetData(nextProps);
    }
  }

  private fetchAndSetData(props: SemanticGraphProps): void {
    const config = assign({}, {
      hidePredicates: SemanticGraph.DEFAULT_HIDE_PREDICATES,
    }, props);

    this.fetching = this.cancellation.deriveAndCancel(this.fetching);

    const context = this.context.semanticContext;
    const graphDataWithLabels = this.fetching.map(
      GraphInternals.getGraphDataWithLabels(config, {context})
    );
    graphDataWithLabels.onValue(
      elements =>
        this.setState({
          elements: elements,
          noResults: !elements.length,
        })
    );

    if (this.props.id) {
      this.context.GLOBAL_EVENTS.trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: graphDataWithLabels,
      });
    }
  }

  render() {
    if (this.state.noResults) {
      return createElement(TemplateItem, {template: {source: this.props.noResultTemplate}});
    }

    const parsedConfig =
      GraphInternals.parseComponentConfig(
        SemanticGraph.DEFAULT_STYLE, this.props
      );
    const config = assign(
      {}, {
        elements: this.state.elements,
        onClick: this.navigate,
      }, SemanticGraph.getDefaultProps, parsedConfig
    );
    return createElement(Graph, config, this.props.children);
  }

  private navigate(event: Cy.EventObject) {
    const node = event.cyTarget;

    // disable navigation for blank nodes and literals because it doesn't make any sense.
    // Also disable navigation for compound nodes, and collapsed compound nodes,
    // otherwise it will conflict with expand-collapse plugin
    const isNotCompound = !(node.isParent() || node.data('expanded-collapsed') === 'collapsed');
    const isIri: boolean = node.data('isIri');
    if (isIri && isNotCompound) {
      navigateToResource(
        event.cyTarget.data('node') as Rdf.Iri
      ).onValue(identity);
    }
  }
}

export default SemanticGraph;
