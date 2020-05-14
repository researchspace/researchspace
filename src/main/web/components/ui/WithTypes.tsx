/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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
import * as React from 'react';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { rdfs, rdf } from 'platform/api/rdf/vocabularies';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Cancellation } from 'platform/api/async';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';

interface Props {
  iri?: string
  types?: Array<string>
  templateContext: any
  template: string
  variables: any
}

interface State {
  loading: boolean
  result: {
    directTypes: String[]
    inferredTypes: String[]
    allTypes: String[]
    allTypesLabels: String
    directTypesLabels: String
  }
}

export class WithTypes extends Component<Props, State> {
  private readonly cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);

    this.state = {
      loading: true,
      result: {
        directTypes: [],
        inferredTypes: [],
        allTypes: [],
        allTypesLabels: '',
        directTypesLabels: ''
      }
    };
  }

  componentDidMount() {
    if (this.props.iri || !_.isEmpty(this.props.types)) {
      this.fetchTypes(this.props);
    } else {
      this.setState({loading: false});
    }
  }

  componentWillReceiveProps(props: Props) {
    if (this.props.iri !== props.iri) {
      this.fetchTypes(props);
    } else if (!_.isEqual(this.props.types, props.types) && !_.isEmpty(props.types)) {
      this.fetchTypes(props);
    }
  }

  fetchTypes = (props: Props) => {
    let query =
      SparqlUtil.parseQuerySync<SparqlJs.ConstructQuery>(
        `CONSTRUCT {
          ?iri a ?t .
          ?t rdfs:label ?tLabel .
          ?t rdfs:subClassOf ?type .
          ?type rdfs:label ?label .
        } WHERE {
          BIND(COALESCE(?__iri__, <http://example.com>) AS ?iri) .
          OPTIONAL {
            ?t rdfs:label ?tEngLabel .
            FILTER(LANG(?tEngLabel) = "en")
          }
          OPTIONAL {
            ?t rdfs:label ?tNoLangLabel .
            FILTER(LANG(?tNoLangLabel) = "")
          }
          BIND(COALESCE(?tEngLabel, ?tNoLangLabel, REPLACE(STR(?t), "^.*/(.*)$", "$1")) AS ?tLabel) .
          OPTIONAL {
            ?t rdfs:subClassOf+ ?type .
            OPTIONAL {
              ?type rdfs:label ?engLabel .
              FILTER(LANG(?engLabel) = "en")
            }
            OPTIONAL {
              ?type rdfs:label ?noLangLabel .
              FILTER(LANG(?noLangLabel) = "")
            }
            BIND(COALESCE(?engLabel, ?noLangLabel, REPLACE(STR(?type), "^.*/(.*)$", "$1")) AS ?label) .
          }
        }`
      );

    if (props.types && !_.isEmpty(props.types)) {
      query = SparqlClient.prepareParsedQuery(
        props.types.map(t => ({'t': Rdf.iri(t)}))
      )(query);
    } else if (props.iri) {
      query.where.unshift({
        type: 'bgp',
        triples: [
          {
            subject: '?__iri__', predicate: rdf.type.value, object: '?t'
          } as SparqlJs.Triple,
        ]
      });
      query = SparqlClient.setBindings(query, {'__iri__': Rdf.iri(props.iri)});
    }


    this.cancellation.map(
      SparqlClient.construct(query)
    ).observe({
      value: value => {
        const labels = {};
        const directTypes = [];
        const inferredTypes = [];

        value.forEach(t => {
          if (t.p.equals(rdfs.label)) {
            labels[t.s.value] = t.o.value;
          }

          if (t.p.equals(rdf.type)) {
            directTypes.push(t.o.value);
          }

          if (t.p.equals(rdfs.subClassOf)) {
            inferredTypes.push(t.o.value);
          }
        });

        const allTypes = directTypes.concat(inferredTypes);

        const allTypesLabels = [];
        allTypes.forEach(t => allTypesLabels.push(labels[t]));

        const directTypesLabels = [];
        directTypes.forEach(t => directTypesLabels.push(labels[t]));

        this.setState({
          loading: false,
          result: {
            directTypes, inferredTypes, allTypes,
            allTypesLabels: allTypesLabels.join(', '),
            directTypesLabels: directTypesLabels.join(', ')
          }
        });
      }
    });
  }

  render() {
    if (this.state.loading) {
      return <Spinner />;
    } else {
      return <TemplateItem template={{
        source: this.props.template,
        options: {...this.props.templateContext, ...this.state.result, ...this.props.variables}
        }} />;
    }
  }
}

export default WithTypes;
