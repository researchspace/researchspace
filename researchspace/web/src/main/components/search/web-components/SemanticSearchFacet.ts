/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 */

import { DOM as D } from 'react';
import * as classNames from 'classnames';
import * as Maybe from 'data.maybe';

import { Component, ComponentContext, ContextTypes } from 'platform/api/components';
import { SemanticFacetConfig } from 'platform/components/semantic/search/config/SearchConfig';
import {
  DefaultFacetValueTemplate,
  DefaultFacetRelationTupleTemplate,
  DefaultFacetCategoriesTupleTemplate,
} from 'platform/components/semantic/search/config/Defaults';
import {
  FacetContext, FacetContextTypes,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import * as Model from 'platform/components/semantic/search/data/search/Model';

import Facet from '../facet/Facet';
import {
  FacetStore, FacetData, Actions,
} from '../facet/FacetStore';

interface Props extends SemanticFacetConfig {}

interface State {
  facetData?: FacetData
  actions?: Actions
  showFacets?: boolean
  bigResultSet?: boolean
}

class SemanticSearchFacet extends Component<Props, State> {
  static contextTypes = { ...FacetContextTypes, ...ContextTypes};
  context: FacetContext & ComponentContext;

  private facetStore: FacetStore;

  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      facetData: null,
      actions: null,
      showFacets: props.openByDefault,
      bigResultSet: false
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

  componentWillReceiveProps(
    props: Props, /* undocumented! */ context: FacetContext & ComponentContext
  ) {
    const canUpdateFacets =
      context.baseQuery.isJust && context.domain.isJust && context.resultsStatus.loaded;

    if (!this.facetStore && canUpdateFacets) {
      this.createFacetStore(context.baseQuery.get(), context);
    } else if (canUpdateFacets) {
      this.facetStore.facetActions().setBaseQuery(context.baseQuery.get());

      if (props.listenToContextSwitch
          && context.visualizationContext.isJust
          && !this.isOldVisualizationContext(context.visualizationContext)
         ) {
        const relation = context.visualizationContext.get();
        this.facetStore.facetActions().selectCategory(relation.hasRange);
        this.facetStore.facetActions().selectRelation(relation);
      }
    } else if (context.baseQuery.isNothing) {
      this.facetStore = null;
      this.setState({facetData: null});
    }
  }

  private isOldVisualizationContext =
    (visualizationContext: Data.Maybe<Model.Relation>) =>
      Maybe.fromNullable(this.state.facetData)
        .chain(fd => fd.viewState.relation)
        .chain(o => visualizationContext.map(n => o.iri.equals(n.iri)))
        .getOrElse(false);

  private createFacetStore(
    baseQuery: SparqlJs.SelectQuery, context: FacetContext & ComponentContext
  ) {
    this.facetStore = new FacetStore({
      domain: context.domain.get(),
      baseConfig: context.baseConfig,
      baseQuery: baseQuery,
      initialAst: context.facetStructure.getOrElse(undefined),
      searchProfileStore: context.searchProfileStore.get(),
      config: this.props,
    }, context);

    this.facetStore.getFacetData().observe({
      value: facetData => {
        this.setState({
          actions: this.facetStore.facetActions(),
          facetData: facetData,
        });
        this.context.setFacetStructure(facetData.ast);
      },
    });

    this.facetStore.getFacetedQuery().onValue(
      query => this.context.setFacetedQuery(query)
    );
  }

  render() {
    if (this.context.baseQuery.isJust) {
      const facetIsShown = this.state.facetData && this.state.showFacets;
      return D.div(
        {className: 'semantic-facet-holder'},
        this.state.facetData && this.state.showFacets ?
          Facet({
            data: this.state.facetData,
            actions: this.state.actions,
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

  private toggleFilter = () =>
    this.setState(state => ({showFacets: !state.showFacets}))
}

export default SemanticSearchFacet;
