/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { identity } from 'core.lambda';
import { Props as ReactProps, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as assign from 'object-assign';
import { isEqual } from 'lodash';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { navigateToResource, openResourceInNewWindow } from 'platform/api/navigation';
import { TemplateItem } from 'platform/components/ui/template';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Alert, AlertType } from 'platform/components/ui/alert';

import { Graph } from './Graph';
import * as GraphInternals from './GraphInternals';
import { SemanticGraphConfig } from './Config';
export { SemanticGraphConfig } from './Config';

import './SemanticGraph.scss';

export type SemanticGraphProps = SemanticGraphConfig & ReactProps<SemanticGraph>;

export interface State {
  elements: Cy.ElementDefinition[];
  noResults?: boolean;
  error?: any;
  warning?: string;
}

export class SemanticGraph extends Component<SemanticGraphProps, State> {
  public static DEFAULT_STYLE: Cy.InstanceJsonStyle = [
    {
      selector: 'edge',
      style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#bbb',
        content: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-outline-width': 2,
        width: 1,
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
        content: 'data(label)',
        shape: 'ellipse',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-outline-width': 2,
        'text-outline-color': 'white',
        'font-size': '10px',
        'border-color': '#bbb',
        'border-width': 1,
        width: 40,
        height: 40,
      },
    },
    {
      selector: 'node[?isLiteral]',
      style: {
        'background-fit': 'contain',
        'background-color': '#ddd',
        'border-color': '#bbb',
        'border-width': 1,
        content: 'data(label)',
        shape: 'rectangle',
        'text-valign': 'center',
        'text-halign': 'center',
        'padding-right': 2,
        'padding-left': 2,
        'padding-top': 2,
        'padding-bottom': 2,
        width: 'label',
        height: 'label',
        'text-outline-color': '#ddd',
        'font-size': '10px',
      },
    },
    {
      selector: 'edge.cy-expand-collapse-meta-edge',
      style: {
        content: '',
        width: 1,
        'line-color': 'light-grey',
        'line-style': 'dotted',
        'target-arrow-shape': 'none',
        'curve-style': 'unbundled-bezier',
        'control-point-distances': '0 0 0',
      },
    },
    {
      selector: 'node.cy-expand-collapse-collapsed-node',
      style: {
        shape: 'rectangle',
      },
    },
    {
      selector: 'node:parent',
      style: {
        'text-valign': 'top',
        'border-opacity': 0.1,
      },
    },
  ];

  public static getDefaultProps = {
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
    this.setState({ error: undefined });

    const config = assign(
      {},
      {
        hidePredicates: SemanticGraph.DEFAULT_HIDE_PREDICATES,
      },
      props
    );

    this.fetching = this.cancellation.deriveAndCancel(this.fetching);

    const context = this.context.semanticContext;
    const graphDataWithLabels = this.fetching.map(GraphInternals.getGraphDataWithLabels(config, { context }));
    graphDataWithLabels
      .onValue((elements) => {
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

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: graphDataWithLabels,
      });
    }
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
    if (this.state.noResults) {
      return createElement(TemplateItem, { template: { source: this.props.noResultTemplate } });
    } else if (this.state.error) {
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    }

    const warning = this.state.warning
      ? createElement(Alert, { alert: AlertType.WARNING, message: this.state.warning })
      : null;

    const parsedConfig = GraphInternals.parseComponentConfig(SemanticGraph.DEFAULT_STYLE, this.props);
    const config = assign(
      {},
      {
        elements: this.state.elements,
        onClick: this.navigate,
      },
      SemanticGraph.getDefaultProps,
      parsedConfig
    );
    const graph = createElement(Graph, config, this.props.children);
    return D.div({}, warning, graph);
  }

  private navigate = (event: Cy.EventObject) => {
    const node = event.cyTarget;
    const repository = this.context.semanticContext ? this.context.semanticContext.repository : undefined;

    // disable navigation for blank nodes and literals because it doesn't make any sense.
    // Also disable navigation for compound nodes, and collapsed compound nodes,
    // otherwise it will conflict with expand-collapse plugin
    const isNotCompound = !(node.isParent() || node.hasClass('cy-expand-collapse-collapsed-node'));
    const isIri: boolean = node.data('isIri');
    if (isIri && isNotCompound) {
      const iri = event.cyTarget.data('node') as Rdf.Iri;
      if (this.props.openLinksInNewWindow) {
        openResourceInNewWindow(iri, {}, repository);
      } else {
        navigateToResource(event.cyTarget.data('node') as Rdf.Iri, {}, repository).onValue(identity);
      }
    }
  };
}

export default SemanticGraph;
