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

import { createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { navigateToResource } from 'platform/api/navigation';

import { Query, QueryService, QueryServiceClass } from 'platform/api/services/ldp-query';

import { QueryValidatorComponent } from './QueryValidatorComponent';

const FormGroup = createFactory(ReactBootstrap.FormGroup);
const Alert = createFactory(ReactBootstrap.Alert);
const Button = createFactory(ReactBootstrap.Button);

const QueryValidator = createFactory(QueryValidatorComponent);

const SELECT_TEMPLATE_COUNT_QUERY = `PREFIX spin: <http://spinrdf.org/spin#>
SELECT (COUNT(?template) as ?templateCount) WHERE {
  ?template spin:body ?query
}`;

export interface Props {
  iri?: string;
}

export interface State {
  query?: Query;
  isValid?: boolean;
  templateCount?: number;
}

export class QueryEditorComponent extends Component<Props, State> {
 private queryService: QueryServiceClass ;
  constructor(props: Props, context: any) {
    super(props, context);
    const semanticContext = this.context.semanticContext;
    this.queryService = QueryService(semanticContext);
    this.state = {isValid: false};
  }

  componentDidMount() {
    const {iri} = this.props;

    if (iri) {
      this.getQueryTemplateCount(iri).onValue(templateCount => {
        this.setState({templateCount});
      });
    }
  }

  private createQuery = () => {
    this.queryService.addItem(this.state.query).onValue(
      iri => navigateToResource(iri).onValue(() => {/* nothing */})
    ).onError(
      () => {/* nothing */}
    );
  }

  private updateQuery = () => {
    const iri = Rdf.iri(this.props.iri);
    return this.queryService.updateItem(iri, this.state.query).onValue(
      () => {/* nothing */}
    ).onError(
      () => {/* nothing */}
    );
  }

  private getQueryTemplateCount(iri: string): Kefir.Property<number> {
    const query = SparqlClient.setBindings(
      SparqlUtil.parseQuery(SELECT_TEMPLATE_COUNT_QUERY),
      {'query': Rdf.iri(iri)}
    );
    const context = this.context.semanticContext;
    return SparqlClient.select(query, {context: context}).map(res => {
      return parseInt(res.results.bindings[0]['templateCount'].value);
    });
  }

  private onChangeQuery = (query: Query, isValid: boolean) => {
    this.setState({query, isValid});
  }

  public render() {
    const {iri} = this.props;
    const {isValid, templateCount} = this.state;

    return D.div({},
      FormGroup({},
        templateCount
          ? Alert({bsStyle: 'warning'},
            D.strong({}, 'Warning! '),
            `This query is used in ${templateCount} templates.
              Modifications to the query below may break existing templates.`
          )
          : null,
        QueryValidator({
          iri: this.props.iri,
          onChange: this.onChangeQuery,
        })
      ),
      Button({
        bsStyle: 'success',
        disabled: !isValid,
        onClick: iri ? this.updateQuery : this.createQuery,
      }, iri ? 'Update' : 'Create')
    );
  }
}

export type component = QueryEditorComponent;
export const component = QueryEditorComponent;
export const factory = createFactory(component);
export default component;
