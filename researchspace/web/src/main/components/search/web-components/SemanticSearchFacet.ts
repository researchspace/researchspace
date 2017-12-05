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
import * as _ from 'lodash';
import * as classNames from 'classnames';

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
import Facet from '../facet/Facet';
import {
  FacetStore, FacetData, Actions,
} from '../facet/FacetStore';

interface Props extends SemanticFacetConfig {}

interface State {
  facetData?: FacetData
  actions?: Actions
  showFacets?: boolean
  updateFacetData?: boolean
  loadingFacetData?: boolean
  bigResultSet?: boolean
}

class SemanticSearchFacet extends Component<Props, State> {
  static contextTypes = { ...FacetContextTypes, ...ContextTypes};
  context: FacetContext & ComponentContext;

  private currentBaseQuery: SparqlJs.SelectQuery | null;

  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      facetData: null,
      actions: null,
      showFacets: props.openByDefault,
      updateFacetData: true,
      loadingFacetData: false,
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

  componentWillReceiveProps(props: Props, /* undocumented! */ context: FacetContext) {
    const showFacets = this.state.showFacets;
    const canUpdateFacets =
      context.baseQuery.isJust && context.domain.isJust &&
      // allow facets to update if they're visible or results already loaded
      (showFacets || context.resultsStatus.loaded);

    const nextBaseQuery = context.baseQuery.getOrElse(null);
    const baseQueryChanged = !_.isEqual(this.currentBaseQuery, nextBaseQuery);

    if (!nextBaseQuery) {
      this.currentBaseQuery = null;
      this.setState({
        showFacets: props.openByDefault,
        facetData: null,
      });
    } else if (baseQueryChanged && canUpdateFacets) {
      this.currentBaseQuery = nextBaseQuery;
      this.setState({updateFacetData: true});
    }
  }

  shouldComponentUpdate(
    nextProps: Props,
    nextState: State,
    /* undocumented! */
    nextContext: FacetContext & ComponentContext
  ) {
    if ((nextState.showFacets || nextContext.resultsStatus.loaded) &&
      nextState.updateFacetData && !nextState.loadingFacetData && this.currentBaseQuery
    ) {
      this.createFacetStore(nextContext);
    }
    return true;
  }

  private createFacetStore(context: FacetContext & ComponentContext) {
    const facetStore = new FacetStore({
      domain: context.domain.get(),
      baseConfig: context.baseConfig,
      baseQuery: this.currentBaseQuery,
      initialAst: context.facetStructure.getOrElse(undefined),
      searchProfileStore: context.searchProfileStore.get(),
      config: this.props,
    }, context);

    this.setState({
      loadingFacetData: true,
    });

    facetStore.getFacetData().observe({
      value: facetData => {
        this.setState({
          actions: facetStore.facetActions(),
          facetData: facetData,
          updateFacetData: false,
          loadingFacetData: false,
        });
        this.context.setFacetStructure(facetData.ast);
      },
    });

    facetStore.getFacetedQuery().onValue(
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
