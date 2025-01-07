/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Denis Ostapenko
 */

import { Component, createFactory, Props, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as maybe from 'data.maybe';
import * as InfiniteComponent from 'react-infinite';
import * as classnames from 'classnames';
import * as nlp from 'nlp_compromise';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { trigger } from 'platform/api/events';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';
import { ClearableInput } from 'platform/components/ui/inputs';

import { Resource } from 'platform/components/semantic/search/data/Common';
import { FacetData, FacetViewState, FacetRelationQueries, FacetValuesResult } from './FacetStore';
import { Relation } from 'platform/components/semantic/search/data/profiles/Model';
import * as F from 'platform/components/semantic/search/data/facet/Model';
import * as Model from 'platform/components/semantic/search/data/search/Model';

import FacetValue from './FacetValue';
import { FacetSlider, SliderRange } from './slider/FacetSlider';
import { Literal, NumericRange, DateRange } from 'platform/components/semantic/search/data/search/Model';
import { SemanticFacetConfig } from 'platform/components/semantic/search/config/SearchConfig';
import { SearchFacetPropertySelected } from 'platform/components/search/query-builder/SearchEvents';
import { LazyTreeWithSearch, Node, TreeSelection } from 'platform/components/semantic/lazy-tree';
import { List } from 'immutable';
import { init } from 'platform/api/http';

interface RelationFacetProps extends Props<RelationFacetComponent> {
  relation: Relation;
  data: FacetData;
  actions: F.Actions;
  config: SemanticFacetConfig;
}

/**
 * react-infinite component which is used to show facet values,
 * in future it can be used to implement lazy-loading of facet values
 */
const Infinite = createFactory(InfiniteComponent);

interface RelationFacetState {
  filterString?: string;
}

/**
 * Component which displays all facet values specific to the given relation.
 */
export class RelationFacetComponent extends Component<RelationFacetProps, RelationFacetState> {
  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  private areFacetValuesEqual(oldValues: FacetValuesResult, newValues: FacetValuesResult): boolean {
    if (oldValues === newValues) return true;

    if (_.isArray(oldValues) && _.isArray(newValues)) {
      oldValues = oldValues as Array<F.FacetValue>;
      newValues = newValues as Array<F.FacetValue>;
      if (oldValues.length !== newValues.length) return false;
      
      return oldValues.every((oldValue, index) => {
        const newValue = newValues[index];
        if (_.has(oldValue, 'iri') && _.has(newValue, 'iri')) {
          const oldV = oldValue as Resource;
          const newV = newValue as Resource;
          return oldV.iri.equals(newV.iri) && _.isEqual(oldV.tuple, newV.tuple);
        } else if (_.has(oldValue, 'literal') && _.has(newValue, 'literal')) {
          return (oldValue as Literal).literal.value === (newValue as Literal).literal.value;
        }
        return false;
      });
    } else {
      _.isEqual(oldValues, newValues);
    }
  }

  componentDidMount() {
    //console.log('mounting relation/tree' + this.props.relation.iri.value)
  }

  componentWillUnmount() {
    //console.log('unmounting relation/tree ' + this.props.relation.iri.value)
  }
  /*
  shouldComponentUpdate(nextProps: RelationFacetProps, nextState: RelationFacetState): boolean {
    // Always update if the state changes (e.g., filterString)
    if (this.state.filterString !== nextState.filterString) {
      return true;
    }

    const currentViewState = this.props.data.viewState;
    const nextViewState = nextProps.data.viewState;

    // Check if loading state changed
    if (currentViewState.values.loading !== nextViewState.values.loading) {
      return true;
    }

    // Check if error state changed
    if (currentViewState.values.error !== nextViewState.values.error) {
      return true;
    }

    if (this.isSelectedRelation(this.props) !== this.isSelectedRelation(nextProps)) {
      return true;
    }

    // Check if facet values changed
    if (!this.areFacetValuesEqual(currentViewState.values.values as any, nextViewState.values.values as any)) {
      return true;
    }

    // If we got here, only the selection state might have changed, so don't update
    return false;
  }
*/

componentWillReceiveProps(newProps: RelationFacetProps) {
  //console.log('relation facet nowe props ' + newProps.relation.iri.value);
  //console.log(newProps);
}

  render() {
    return this.renderRelation();
  }

  private renderRelation = () =>
    D.div(
      { className: 'facet__relation' },
      D.div(
        {
          className: 'facet__relation__header',
          onClick: this.onRelationClick().bind(this),
        },
        D.i({
          className: classnames({
            'facet__relation__header__icon--selected': this.isSelectedRelation(this.props),
            facet__relation__header__icon: !this.isSelectedRelation(this.props),
          }),
        }),
        createElement(TemplateItem, {
          template: {
            source: this.props.data.viewState.relationTemplate,
            options: this.props.relation.tuple,
          },
        }),
        this.isSelectedRelation(this.props) && this.props.data.viewState.values.loading ? createElement(Spinner) : D.span({})
      ),
      this.isSelectedRelation(this.props) && !this.props.data.viewState.values.loading
        ? D.div({ className: 'facet__relation__body' }, this.renderRelationFacetBody(this.props.data.viewState))
        : D.div({})
    );

  private isSelectedRelation = (props: RelationFacetProps) =>
    props.data.viewState.relation.map((res) => res.iri.equals(props.relation.iri)).getOrElse(false);

  private renderRelationFacetBody(viewState: FacetViewState) {
    const { relationType, values } = viewState;
    if (relationType === 'resource' || relationType === 'literal') {
      return this.renderFacetValues(values.values as Array<Resource | Literal>, relationType);
    } else if (relationType === "hierarchy") {
      return this.renderHierarchy(viewState);
    } else if (relationType === 'numeric-range' || relationType === 'date-range') {
      return this.renderSlider(values.values as Array<NumericRange | DateRange>, relationType);
    }
    return null;
  }

  private renderHierarchy(viewState: FacetViewState) {
    //console.log(
    //  viewState.values.values
    //);

    const initialSelection = viewState.selectedValues.get(this.props.relation) as List<Resource> || List();


    return D.div(
      { className: 'facet__relation__values' },
      D.div({ className: 'facet__relation__values__filter', style: { height: '500px' } },
        createElement(LazyTreeWithSearch, {
          ...(viewState.values.values as FacetRelationQueries),
          infoTemplate: " ({{binding.count.value}})",
          multipleSelection: true,
          initialSelection: initialSelection.map((r) => r.iri).toArray(),
          onSelectionChanged: (selection: TreeSelection<Node>) => {
            const newSelections = TreeSelection.leafs(selection);
            const oldSelections = viewState.selectedValues.get(this.props.relation) as List<Resource> || List();
          
            if (oldSelections.size < newSelections.size) {
              // Item selected
              const {iri, label, tuple} = 
                newSelections.find(newItem => 
                  !oldSelections.some(oldItem => oldItem.iri.equals(newItem.iri))
                );
              this.props.actions.selectFacetValue(this.props.relation)({iri, tuple, label: label?.value});
            } else if (oldSelections.size > newSelections.size) {
              // Item deselected
              const deselected =
                oldSelections.find(oldItem => 
                  !newSelections.some(newItem => oldItem.iri.equals(newItem.iri))
                )
              this.props.actions.deselectFacetValue(this.props.relation)(deselected);
            } else {
              // One item deselected, one selected. 
              // That happens when we select item in already selected subtree
              const deselected =
                oldSelections.find(oldItem => 
                  !newSelections.some(newItem => oldItem.iri.equals(newItem.iri))
                )
              const {iri, label, tuple} = 
                newSelections.find(newItem => 
                  !oldSelections.some(oldItem => oldItem.iri.equals(newItem.iri))
                );
              this.props.actions.replaceFacetValue(this.props.relation)(deselected, {iri, tuple, label: label?.value});
            }
          }          
        }
        ),
      )
    );
  }

  private renderFacetValues(facetValues: Array<Resource | Literal>, kind: 'resource' | 'literal') {
    const rangeLabel = this.props.relation.hasRange.label;
    const filterString = this.state.filterString ? this.state.filterString : '';

    const showNoFacetValuesWarning = facetValues.length === 0 && !this.props.data.viewState.values.loading;

    const showTooManyFacetValuesWarning =
      this.props.config.facetValuesThreshold > 0 && facetValues.length > this.props.config.facetValuesThreshold;

    if (this.props.data.viewState.values.error) {
      return D.div(
        { className: 'facet__relation__values' },
        D.em(
          {},
          'An error has occurred! Probably, there are too many facet values for the selected relation. Please, try to refine your search.'
        )
      );
    } else if (showNoFacetValuesWarning) {
      return D.div({ className: 'facet__relation__values' }, D.em({}, 'Values not found...'));
    } else {
      return D.div(
        { className: 'facet__relation__values' },
        showTooManyFacetValuesWarning
          ? D.em(
              { className: 'facet__relation__warning' },
              `Only first ${this.props.config.facetValuesThreshold} facet values are shown! Please refine your search `
            )
          : null,
        createElement(ClearableInput, {
          type: 'text',
          className: 'facet__relation__values__filter',
          placeholder: `Search ${nlp.noun(rangeLabel).pluralize()}`,
          value: filterString,
          onClear: () => this.setState({ filterString: undefined }),
          onChange: (event) => {
            const value = (event.target as any).value;
            this.setState({ filterString: value });
          },
        }),
        Infinite(
          {key: 'facet-values', 
            elementHeight: 20,
            containerHeight: 200,
            className: 'facet__relation__values_list_container', 
          },
          facetValues
            .filter((facetValue) => {
              const text = kind === 'resource' ? (facetValue as Resource).label : (facetValue as Literal).literal.value;
              return !filterString || text.toLowerCase().indexOf(filterString.toLowerCase()) >= 0;
            })
            .map((facetValue) =>
              FacetValue({
                key: kind === 'resource' ? (facetValue as Resource).iri.value : (facetValue as Literal).literal.value,
                kind: kind,
                facetValue: {
                  entity: facetValue,
                  tupleTemplate: this.props.data.viewState.valuesTemplate,
                  selected: this.isTermSelected(facetValue),
                },
                highlight: filterString,
                actions: {
                  selectFacetValue: this.props.actions.selectFacetValue(this.props.relation),
                  deselectFacetValue: this.props.actions.deselectFacetValue(this.props.relation),
                },
              })
            )
        )
      );
    }
  }

  private renderSlider(facetValues: Array<NumericRange | DateRange>, kind: 'numeric-range' | 'date-range') {
    const value = maybe
      .fromNullable(_.find(this.props.data.ast.conjuncts, (c) => c.relation.iri.equals(this.props.relation.iri)))
      .chain((conjunct) => {
        if (_.isEmpty(conjunct.disjuncts)) {
          return maybe.Nothing<NumericRange | DateRange>();
        } else {
          return maybe.Just(_.head(conjunct.disjuncts).value);
        }
      });
    return FacetSlider({
      kind: kind,
      data: facetValues,
      value: value,
      actions: {
        toggleFacetValue: this.props.actions.selectFacetValue(this.props.relation),
      },
    });
  }

  private onRelationClick() {
    return () => {
      if (this.isSelectedRelation(this.props)) {
        this.props.actions.deselectRelation();
      } else {
        trigger({
          eventType: SearchFacetPropertySelected,
          source: this.props.config.id,
          data: this.props.relation.iri.value,
        });
        this.props.actions.selectRelation(this.props.relation);
      }
    };
  }

  private isTermSelected(facetValueEntity: Resource | Literal) {
    return maybe
      .fromNullable(this.props.data.viewState.selectedValues.get(this.props.relation))
      .chain((values) => maybe.fromNullable(values.find((value) => F.partialValueEquals(value, facetValueEntity))))
      .map((_) => true)
      .getOrElse(false);
  }
}

export const RelationFacet = createFactory(RelationFacetComponent);
export default RelationFacet;
