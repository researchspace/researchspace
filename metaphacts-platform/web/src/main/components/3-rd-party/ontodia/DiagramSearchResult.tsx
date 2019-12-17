/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { Workspace, DiagramModel, ElementTemplateState, InternalApi } from 'ontodia';

import { Cancellation } from 'platform/api/async';
import { Component, SemanticContext } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { Ontodia, OntodiaConfig } from 'platform/components/3-rd-party/ontodia/Ontodia';
import {
  SemanticSearchContext, ResultContext, GraphScopeContext
} from 'platform/components/semantic/search';
import { Action, componentHasType } from 'platform/components/utils';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

const { TemplateProperties } = InternalApi;

export interface DiagramSearchResultConfig {
  /**
   * SPARQL select query where all resource values will be treated as elements
   */
  query: string;
  id?: string;
}

interface State {
  queryResult?: SparqlClient.SparqlSelectResult;
  isLoading: boolean;
  errorMessage?: string;
  iris?: string [];
}

export interface DiagramSearchResultProps extends DiagramSearchResultConfig {}

export class DiagramSearchResult extends Component<DiagramSearchResultProps, {}> {
  render() {
    const {semanticContext} = this.context;
    return (
      <SemanticSearchContext.Consumer>
        {context => (
          <DiagramSearchResultInner {...this.props}
            context={{...context, semanticContext}}
          />
        )}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends DiagramSearchResultProps {
  context: ResultContext & GraphScopeContext & SemanticContext;
}

class DiagramSearchResultInner extends React.Component<InnerProps, State> {
  private readonly cancellation = new Cancellation();
  private query = Action<DiagramSearchResultConfig>();

  constructor(props: InnerProps) {
    super(props);
    this.state = {isLoading: true};
    this.cancellation.map(
      this.query.$property.debounce(300)
    ).flatMap(
      this.loadQueryData
    ).onValue(() => {/**/});
    this.loadQueryData(this.props);
  }

  componentWillReceiveProps(nextProps: InnerProps) {
    if (nextProps.query !== this.props.query) {
      this.setState({isLoading: true, errorMessage: undefined});
      // this.query(nextProps);
      this.loadQueryData(nextProps);
    }
  }

  private loadQueryData = (config: DiagramSearchResultConfig) => {
    const context = this.props.context.semanticContext;
    const querying = SparqlClient.select(config.query, {context});
    querying.onValue(queryResult => {
      this.setState({
        queryResult: queryResult,
        iris: this.buildElements(config, queryResult),
        isLoading: false,
      });
    });
    querying.onError(errorMessage => {
      this.setState({
        errorMessage: errorMessage,
        isLoading: false,
      });
    });
    querying.onEnd(() => {
      if (this.props.id) {
        trigger({eventType: BuiltInEvents.ComponentLoaded, source: this.props.id});
      }
    });
    return querying;
  }

  render() {
    const {iris, isLoading, errorMessage} = this.state;
    if (isLoading) {
      return <Spinner />;
    } else if (errorMessage) {
      return <div><ErrorNotification errorMessage={errorMessage} /></div>;
    } else if (iris) {
      const nodeStyles: OntodiaConfig['nodeStyles'] = {};
      this.props.context.searchProfileStore.map(profileStore =>
        profileStore.categories.forEach(category =>
          nodeStyles[category.iri.value] = {image: category.thumbnail, color: category.color}
        )
      );
      const child = React.Children.only(this.props.children);
      if (!componentHasType(child, Ontodia)) {
        throw Error('The child element should be Ontodia');
      }
      const baseOntodia = React.cloneElement(child, {
        onLoadWorkspace: this.onLoadWorkspace,
        nodeStyles,
      });
      return iris.length === 1
        ? React.cloneElement(baseOntodia, {iri: iris[0]})
        : React.cloneElement(baseOntodia, {iris});
    }
  }

  private buildElements(
    config: DiagramSearchResultConfig,
    queryResult: SparqlClient.SparqlSelectResult
  ) {
    return Immutable.Set(_.flatMap(queryResult.results.bindings, b => _.values(b)))
        .filter(el => el.isIri())
        .map(el => el.value)
        .toArray();
  }

  private onLoadWorkspace = (workspace: Workspace) => {
    const model = workspace.getModel();
    const onLoaded = () => pinRelevantProperties(model, this.props.context);
    model.events.on('loadingSuccess', onLoaded);
    this.cancellation.onCancel(() => model.events.off('loadingSuccess', onLoaded));
  }
}

function pinRelevantProperties(model: DiagramModel, context: GraphScopeContext) {
  if (!(context.graphScopeResults && context.graphScopeResults.isJust)) {
    return;
  }

  const propertiesToPin = new Set<string>();
  const results = context.graphScopeResults.get();

  for (const column of results.columns) {
    if (column.type === 'var-value') {
      propertiesToPin.add(Rdf.fullIri(column.attribute.iri).value);
    }
  }

  for (const element of model.elements) {
    propertiesToPin.forEach(propertyIri => {
      if (element.data.properties[propertyIri]) {
        const pinned: { [propertyIri: string]: boolean } = element.elementState
          ? element.elementState[TemplateProperties.PinnedProperties]
          : undefined;
        const state: ElementTemplateState = {
          ...element.elementState,
          [TemplateProperties.PinnedProperties]: {...pinned, [propertyIri]: true},
        };
        element.setElementState(state);
      }
    });
  }
}

export default DiagramSearchResult;
