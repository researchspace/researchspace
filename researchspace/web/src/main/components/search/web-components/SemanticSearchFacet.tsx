/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import * as React from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import * as SparqlJs from 'sparqljs';

import { trigger } from 'platform/api/events';
import { Component, SemanticContext } from 'platform/api/components';
import { SemanticFacetConfig } from 'platform/components/semantic/search/config/SearchConfig';
import {
  DefaultFacetValueTemplate,
  DefaultFacetRelationTupleTemplate,
  DefaultFacetCategoriesTupleTemplate,
} from 'platform/components/semantic/search/config/Defaults';
import {
  SemanticSearchContext, FacetContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import * as Model from 'platform/components/semantic/search/data/search/Model';

import Facet from '../facet/Facet';
import { FacetStore, FacetData } from '../facet/FacetStore';
import { SearchFilterToggled } from 'researchspace/components/search/query-builder/SearchEvents';

interface SemanticSearchFacetProps extends SemanticFacetConfig {}

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 */
class SemanticSearchFacet extends Component<SemanticSearchFacetProps, {}> {
  render() {
    const {semanticContext} = this.context;
    return (
      <SemanticSearchContext.Consumer>
        {context => (
          <SemanticSearchFacetInner {...this.props}
            context={{...context, semanticContext}}
          />
        )}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticSearchFacetProps {
  context: FacetContext & SemanticContext;
}

interface State {
  facetData?: FacetData;
  showFacets?: boolean;
  bigResultSet?: boolean;
}

class SemanticSearchFacetInner extends React.Component<InnerProps, State> {
  private facetStore: FacetStore;

  constructor(props: InnerProps) {
    super(props);
    this.state = {
      facetData: null,
      showFacets: props.openByDefault,
      bigResultSet: false,
    };
  }

  static defaultProps: Partial<SemanticFacetConfig> = {
    valueCategories: {},
    valueRelations: {},
    categories: {
      tupleTemplate: DefaultFacetCategoriesTupleTemplate,
    },
    relations: {
      tupleTemplate: DefaultFacetRelationTupleTemplate,
    },
    defaultValueQueries: {},
    defaultValueTemplate: DefaultFacetValueTemplate,
    facetValuesThreshold: 10000,
  };

  componentWillReceiveProps(nextProps: InnerProps) {
    const {context} = this.props;
    const {context: nextContext} = nextProps;
    const canUpdateFacets =
      nextContext.baseQuery.isJust && nextContext.domain.isJust && nextContext.resultsStatus.loaded;
    const isNewDomain = context.domain.chain(currentDomain =>
      nextContext.domain.map(newDomain => ({currentDomain, newDomain}))
    ).map(({currentDomain, newDomain}) =>
      !currentDomain.iri.equals(newDomain.iri)
    ).getOrElse(false);
    if ((!this.facetStore && canUpdateFacets) || isNewDomain) {
      this.createFacetStore(nextContext.baseQuery.get(), nextContext);
    } else if (canUpdateFacets) {
      this.facetStore.facetActions().setBaseQuery(nextContext.baseQuery.get());

      if (nextProps.listenToContextSwitch
          && nextContext.visualizationContext.isJust
          && !this.isOldVisualizationContext(
            context.visualizationContext, nextContext.visualizationContext
          )
         ) {
        const relation = nextContext.visualizationContext.get();
        this.facetStore.facetActions().selectCategory(relation.hasRange);
        this.facetStore.facetActions().selectRelation(relation);
      }
    } else if (nextContext.baseQuery.isNothing) {
      this.facetStore = null;
      this.setState({facetData: null});
    }
  }

  private isOldVisualizationContext =
    (old: Data.Maybe<Model.Relation>, current: Data.Maybe<Model.Relation>) => {
      if (old.isNothing && current.isNothing) {
        return true;
      } else {
        return old.chain(
          c => current.map(r => ({c, r}))
        ).map(({c, r}) => c.equals(r)).getOrElse(false);
      }
    }

  private createFacetStore(
    baseQuery: SparqlJs.SelectQuery, context: FacetContext & SemanticContext
  ) {
    this.facetStore = new FacetStore({
      domain: context.domain.get(),
      availableDomains: context.availableDomains.getOrElse(undefined),
      baseConfig: context.baseConfig,
      baseQuery: baseQuery,
      initialAst: context.facetStructure.getOrElse(undefined),
      searchProfileStore: context.searchProfileStore.get(),
      config: this.props,
    }, context);

    const actions = this.facetStore.facetActions();
    this.props.context.setFacetActions(actions);

    this.facetStore.getFacetData().observe({
      value: facetData => {
        this.setState({facetData});
        this.props.context.setFacetStructure(facetData.ast);
      },
    });

    this.facetStore.getFacetedQuery().onValue(
      query => this.props.context.setFacetedQuery(query)
    );
  }

  render() {
    if (this.props.context.baseQuery.isJust) {
      const facetIsShown = this.state.facetData && this.state.showFacets;
      return D.div(
        {className: 'semantic-facet-holder'},
        this.state.facetData && this.state.showFacets ?
          Facet({
            data: this.state.facetData,
            actions: this.facetStore.facetActions(),
            config: this.props
          }) : null,
        D.button(
        {
          className: classNames({
            'btn-xs': true,
            'show-facet-button': true,
            'show-facet-button__hide': facetIsShown,
            'show-facet-button__show': !facetIsShown,
          }),
          onClick: this.toggleFilter,
        },
        this.state.showFacets ? 'Hide Filter' : 'Show Filter'
        )
      );
    } else {
      return null;
    }
  }

  private toggleFilter = () => {
    this.setState(state => ({showFacets: !state.showFacets}));
    trigger({eventType: SearchFilterToggled, source: this.props.id});
  }
}

export default SemanticSearchFacet;
