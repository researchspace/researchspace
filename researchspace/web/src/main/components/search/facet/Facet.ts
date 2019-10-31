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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 * @author Andrey Nikolov <an@metaphacts.com>
 */

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

import { trigger } from 'platform/api/events';
import { Spinner } from 'platform/components/ui/spinner';

import CategorySelector from '../query-builder/CategorySelector';
import RelationFacet from './RelationFacet';
import { FacetData } from './FacetStore';
import { Category } from 'platform/components/semantic/search/data/profiles/Model';
import { SemanticFacetConfig } from 'platform/components/semantic/search/config/SearchConfig';
import { Actions } from 'platform/components/semantic/search/data/facet/Model';
import { SearchFacetCategorySelected } from '../query-builder/SearchEvents';

import './Facet.scss';

export interface FacetProps {
  data: FacetData
  actions: Actions
  config: SemanticFacetConfig
}

export class FacetComponent extends Component<FacetProps, {}> {

  render() {
    return D.div(
      {className: 'facet'},
      // we need to show category selector only if we have more than one range
      this.props.data.categories.size > 1 ?
        D.div(
          {className: 'facet__category-selector-holder'},
          CategorySelector({
            mode: this.props.data.viewState.selectorMode,
            tupleTemplate: this.props.data.viewState.categoryTemplate,
            entities: this.props.data.categories,
            actions: {
              onValueChange: this.onCategoryChange,
            },
            selectedElement: this.props.data.viewState.category,
          })
        ) : null,
      this.renderRelations()
    );
  }

  private renderRelations() {
    return D.div(
      {className: 'facet-relations'},
      ...this.renderLoadingIndicator(),
      this.props.data.relations.filter(rel => rel.available !== false).map(
        relationEntity =>
          RelationFacet({
            key: relationEntity.iri.value,
            relation: relationEntity,
            data: this.props.data,
            actions: this.props.actions,
            config: this.props.config
          })
      ).toArray()
    );
  }

  private renderLoadingIndicator = () => {
    const loading = this.props.data.relations.some(rel => _.isUndefined(rel.available));
    return loading ? [
      D.div({}, D.em({}, 'Searching for relations ...')),
      D.div({}, createElement(Spinner)),
    ] : [];
  }

  private onCategoryChange = (clas: Category) => {
    const isToggleOff =
      this.props.data.viewState.category.map(
        category => category.iri.equals(clas.iri)
      ).getOrElse(false);
    if (isToggleOff) {
      this.props.actions.deselectCategory();
    } else {
      this.props.actions.selectCategory(clas);
      trigger({
        eventType: SearchFacetCategorySelected,
        source: this.props.config.id,
        data: clas.iri.value,
      });
    }
  }
}

export const Facet = createFactory(FacetComponent);
export default Facet;
