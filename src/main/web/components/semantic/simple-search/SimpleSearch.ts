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

import { ReactElement, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

import { SparqlClient } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { navigateToResource } from 'platform/api/navigation';
import { Component, ComponentContext } from 'platform/api/components';
import { AutoCompletionInput, AutoCompletionInputProps } from 'platform/components/ui/inputs';

import { SemanticSimpleSearchConfig } from './Config';
export { SemanticSimpleSearchConfig } from './Config';
import './SimpleSearch.scss';

export interface SimpleSearchProps extends SemanticSimpleSearchConfig {
  onSelected?: (value: SparqlClient.Binding | SparqlClient.Binding[]) => void;
  defaultQuery?: string;
  multi?: boolean;
  autofocus?: boolean;
}

interface BackwardCompatibilityProps extends SimpleSearchProps {
  inputPlaceholder?: string;
  resourceSelection?: { resourceBindingName?: string; template: string };
}

interface SimpleSearchState {
  result?: Data.Maybe<SparqlClient.SparqlSelectResult>;
  isLoading?: boolean;
}

export class SimpleSearch extends Component<SimpleSearchProps, SimpleSearchState> {
  constructor(props: SimpleSearchProps, context: ComponentContext) {
    super(props, context);
  }

  static defaultProps = {
    placeholder: 'Search all, minimum 3 characters',
    searchTermVariable: '__token__',
    minSearchTermLength: 3,
    resourceBindingName: 'resource',
    template: '<mp-label iri="{{resource.value}}"></mp-label>',
    autofocus: true,
  };

  public render() {
    return D.div(
      {
        className: 'search-widget',
      },
      this.renderAutosuggestion()
    );
  }

  private renderAutosuggestion = (): ReactElement<AutoCompletionInputProps> => {
    const {
      minSearchTermLength,
      resourceBindingName,
      query,
      placeholder,
      searchTermVariable,
      multi,
      defaultQuery,
      escapeLuceneSyntax,
      tokenizeLuceneQuery,
    } = this.backwardCompatibleProps(this.props as BackwardCompatibilityProps);
    // use external onSelected function if any
    const onSelected = this.props.onSelected
      ? this.props.onSelected
      : (value) => {
          navigateToResource(value[resourceBindingName] as Rdf.Iri).onValue((x) => x);
        };
    const autoSuggestionProps = {
      placeholder: placeholder,
      query: query,
      escapeLuceneSyntax: escapeLuceneSyntax,
      tokenizeLuceneQuery: tokenizeLuceneQuery,
      multi: multi,
      defaultQuery: defaultQuery,
      minimumInput: minSearchTermLength,
      valueBindingName: resourceBindingName,
      searchTermVariable: searchTermVariable,
      actions: {
        onSelected: onSelected,
      },
      templates: {
        suggestion: this.props.template,
      },
      autofocus: this.props.autofocus,
    };

    return createElement(
      AutoCompletionInput,
      // remove all undefined props so default values are properly picked
      _.omitBy<AutoCompletionInputProps, AutoCompletionInputProps>(autoSuggestionProps, _.isUndefined)
    );
  };

  private backwardCompatibleProps(props: BackwardCompatibilityProps): SimpleSearchProps {
    if (props.inputPlaceholder) {
      props = {
        ...props,
        placeholder: props.inputPlaceholder,
      };
    }
    if (props.resourceSelection) {
      props.resourceBindingName = props.resourceSelection.resourceBindingName;
      props.template = props.resourceSelection.template;
      props = {
        ...props,
        resourceBindingName: props.resourceSelection.resourceBindingName,
        template: props.resourceSelection.template,
      };
    }
    return props;
  }
}

export default SimpleSearch;
