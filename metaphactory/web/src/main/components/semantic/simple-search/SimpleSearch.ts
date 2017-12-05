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

import { ReactElement, createElement, DOM } from 'react';
import * as _ from 'lodash';

import { SparqlClient } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { navigateToResource } from 'platform/api/navigation';
import { Component, ComponentContext } from 'platform/api/components';
import { AutoCompletionInput, AutoCompletionInputProps } from 'platform/components/ui/inputs';

import { SemanticSimpleSearchConfig } from './Config';
export { SemanticSimpleSearchConfig } from './Config';
import './SimpleSearch.scss';

export type SimpleSearchProps = SemanticSimpleSearchConfig;

interface SimpleSearchState {
  result?: Data.Maybe<SparqlClient.SparqlSelectResult>;
  isLoading?: boolean;
}

export class SimpleSearch extends Component<SimpleSearchProps, SimpleSearchState>  {
  constructor(props: SimpleSearchProps, context: ComponentContext) {
    super(props, context);
  }

  static defaultProps = {
    placeholder: 'type to search, minimum 3 symbols ...',
    searchTermVariable: '__token__',
    minSearchTermLength: 3,
    resourceBindingName: 'resource',
    template: '<mp-label iri="{{resource.value}}"></mp-label>'
  };

  public render() {
    return DOM.div(
      {
        className: 'search-widget',
      },
      this.renderAutosuggestion()
    );
  }

  private renderAutosuggestion = (): ReactElement<AutoCompletionInputProps> => {
    const {
      minSearchTermLength, resourceBindingName, query, placeholder, searchTermVariable
    } = this.backwardCompatibleProps(this.props);
    const autoSuggestionProps = {
      placeholder: placeholder,
      query: query,
      minimumInput: minSearchTermLength,
      valueBindingName: resourceBindingName,
      searchTermVariable: searchTermVariable,
      actions: {
        onSelected: (value) => {
          navigateToResource(
            value[resourceBindingName] as Rdf.Iri
          ).onValue(x => x);
        },
      },
      templates: {
        suggestion: this.props.template,
      },
    };
    return createElement(
      AutoCompletionInput,
      // remove all undefined props so default values are properly picked
      _.omitBy<AutoCompletionInputProps, AutoCompletionInputProps>(
        autoSuggestionProps, _.isUndefined
      )
    );
  };

  private backwardCompatibleProps(props: any): SimpleSearchProps {
    if (props.inputPlaceholder) {
      props.placeholder = props.inputPlaceholder;
    }
    if (props.resourceSelection) {
      props.resourceBindingName = props.resourceSelection.resourceBindingName;
      props.template = props.resourceSelection.template;
    }
    return props;
  }
}

export default SimpleSearch;
