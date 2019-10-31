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

import * as Maybe from 'data.maybe';
import * as React from 'react';
import * as SparqlJs from 'sparqljs';

import { Component } from 'platform/api/components';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { SimpleSearch, SimpleSearchProps } from '../../simple-search/SimpleSearch';
import { setSearchDomain } from '../commons/Utils';
import { BaseConfig } from './KeywordSearch';
import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';

export interface SemanticEntitySearchConfig extends BaseConfig<string>, SimpleSearchProps {

    /**
     * SPARQL Select query string, which will be provided to the search framework as base query.
     * The query stringwill be parameterized through the values as selected by the user from
     * auto-suggestion list, which is generated through the `search-query`. Selected values will be
     * injected using the same binding variable name as specified by the `resource-binding-name`
     * attribute i.e. effectively using the same as variable name as returned by the `search-query`.
     */
    query: string

    /**
     * SPARQL Select query string which is used to provide a autosuggestion list of resources.
     * Needs to expose result using a projection variable equal to the `resource-binding-name`
     * attribute.
     *
     * @default `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX bds: <http://www.bigdata.com/rdf/search#>
            SELECT ?resource WHERE {
                ?resource rdfs:label|skos:prefLabel ?label .
                ?label bds:search ?__token__ ;
                bds:minRelevance "0.5" ;
                bds:relevance ?score ;
                bds:matchAllTerms "true" .
                BIND(STRLEN(?label) as ?length)
            } ORDER BY DESC(?score) ?length`
     */
    searchQuery?: string

    /**
     * Whether multi-selection of values should be allowed. If set to `true`,
     * VALUES clause will be used to inject the values into the base `query` for filtering.
     * If set to `false`, only a single value can be selected from the autosuggestion.
     * The value will be injected by replacement of the binding variable.
     *
     * @default false
     */
    multi: boolean

    /**
     * Name of the bind variable (whithout question mark), which is returned
     * (a) as projection variable by the `search-query`
     * and
     * (b) used to inject the selected values into the base `query`.
     *
     * @default resource
     */
    resourceBindingName?: string
}

interface EntitySearchProps extends SemanticEntitySearchConfig {}

/**
 * @example
 <semantic-search>
  <semantic-search-query-entities
        domain="<http://www.w3.org/2000/01/rdf-schema#Resource>"
        template='<span>
                <mp-label iri="{{resource.value}}"></mp-label> - ({{resource.value}})
            </span>'
    multi='true'
    query='SELECT DISTINCT ?subject WHERE {?subject a ?resource} LIMIT 10'
    default-query='SELECT DISTINCT ?resource WHERE {?resource a owl:Class} LIMIT 2'
     >
  </semantic-search-query-entities>

  <semantic-search-result-holder>
    <semantic-search-result>
      <semantic-table id="table" query="SELECT ?subject WHERE { }"></semantic-table>
    </semantic-search-result>
  </semantic-search-result-holder>
</semantic-search>
 */
class EntitySearch extends Component<EntitySearchProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <EntitySearchInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends EntitySearchProps {
  context: InitialQueryContext;
}

class EntitySearchInner extends React.Component<InnerProps, {}> {
    static defaultProps = {
        searchQuery: `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX bds: <http://www.bigdata.com/rdf/search#>
            SELECT ?resource WHERE {
                ?resource rdfs:label|skos:prefLabel ?label .
                ?label bds:search ?__token__ ;
                bds:minRelevance "0.5" ;
                bds:relevance ?score ;
                bds:matchAllTerms "true" .
                BIND(STRLEN(?label) as ?length)
            } ORDER BY DESC(?score) ?length`,
        template: '<span><mp-label iri="{{resource.value}}"></mp-label></span>' ,
        resourceBindingName: 'resource',
    };

    componentDidMount() {
        setSearchDomain(this.props.domain, this.props.context);
    }

    componentWillReceiveProps(props: InnerProps) {
      const {context} = props;
      if (context.searchProfileStore.isJust && context.domain.isNothing) {
        setSearchDomain(props.domain, context);
      }
    }

    render() {
        if (!this.props.query) {
            throw new Error(`The mandatory configuration attribute "query" is not set.`);
        }

        const {
            placeholder, style, className, multi, template,
            searchQuery, resourceBindingName, defaultQuery,
            escapeLuceneSyntax,
        } = this.props;
        return <SimpleSearch
                query={searchQuery}
                onSelected={this.onSelected}
                template={template}
                multi={multi}
                placeholder={placeholder}
                resourceBindingName={resourceBindingName}
                defaultQuery={defaultQuery}
                escapeLuceneSyntax={escapeLuceneSyntax}>
            </SimpleSearch>;
    }

    onSelected = (binding: SparqlClient.Binding & SparqlClient.Binding[]) => {
        // reset search if selection is emtpy e.g. after removal of initial selections
        if (this.isEmptySelection(binding)) {
            return this.props.context.setBaseQuery(Maybe.Nothing());
        }
        const variableName = this.props.resourceBindingName;
        const parsedQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(
            this.props.query
        );
        let query;

        if (this.props.multi) {
            // use values clause for multi value parameterization i.e. filtering
            const value = binding.map(node => ({[variableName] : node.resource}));
            query = SparqlClient.prepareParsedQuery(value)(parsedQuery);
        } else {
            // use setBinding i.e. replacement for single selection paramerization
            query = SparqlClient.setBindings(
                parsedQuery, { [variableName] : binding[variableName]}
            );
        }

        this.props.context.setBaseQuery(Maybe.Just(query));
    }

    isEmptySelection(binding: SparqlClient.Binding & SparqlClient.Binding[]) {
        return (Array.isArray(binding) && !binding.length) || !binding;
    }
}

export default EntitySearch;
