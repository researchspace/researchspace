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

import * as React from 'react';
import * as Kefir from 'kefir';
import { keyBy, mapValues } from 'lodash';
import * as SparqlJs from 'sparqljs';
import { Modal, Button } from 'react-bootstrap';

import { Component, ComponentContext, ContextTypes } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { addNotification } from 'platform/components/ui/notification';
import { getOverlaySystem } from 'platform/components/ui/overlay';

import { Cancellation } from 'platform/api/async';
import {
  QueryTemplateService, QueryTemplateServiceClass,
} from 'platform/api/services/ldp-query-template';
import { QueryService, QueryServiceClass, Query } from 'platform/api/services/ldp-query';
import { Spinner } from 'platform/components/ui/spinner';

import { Template } from 'platform/components/query-editor';
import {
  ComponentContext as QueryEditorContext, ContextTypes as QueryEditorContextTypes,
} from './SparqlQueryEditorContext';

export interface QueryCatalogTemplateProps {
  /** Query template IRI. */
  iri: string;
}

type Props = QueryCatalogTemplateProps & React.Props<QueryCatalogTemplate>;

interface State {
  readonly fetchingQuery?: boolean;
}

/**
 * @example
 * <query-catalog-template iri="IRI">
 *   <mp-label iri="IRI"></mp-label>
 * </query-catalog-template>
 */
export class QueryCatalogTemplate extends Component<Props, State> {
  static readonly contextTypes = {...ContextTypes, ...QueryEditorContextTypes};
  context: ComponentContext & QueryEditorContext;

  private cancellation = new Cancellation();
  private applyingTemplate = this.cancellation.derive();

  private queryTemplateService: QueryTemplateServiceClass;
  private queryService: QueryServiceClass;

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {};

    const {semanticContext} = this.context;
    this.queryTemplateService = QueryTemplateService(semanticContext);
    this.queryService = QueryService(semanticContext);
  }

  render() {
    return <div onClick={this.fetchAndSetQuery}>
      {this.props.children}
      {this.state.fetchingQuery ? <Spinner spinnerDelay={0} /> : null}
    </div>;
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private fetchAndSetQuery = () => {
    if (this.state.fetchingQuery) { return; }

    const {queryEditorContext} = this.context;
    if (!queryEditorContext) { return; }

    this.applyingTemplate.cancelAll();
    this.applyingTemplate = this.cancellation.derive();
    this.applyingTemplate.map(this.fetchTemplateWithQuery()).observe({
      value: ([template, query]) => {
        const hasDefaultArguments = Boolean(
          template.args.find(arg => arg.defaultValue !== undefined)
        );
        if (hasDefaultArguments) {
          this.showParametrizationDialog(parametrize => {
            this.setQuery({query, template, parametrize});
          });
        } else {
          this.setQuery({query, template, parametrize: false});
        }
        this.setState({fetchingQuery: false});
      },
      error: error => {
        addNotification({
          level: 'error',
          message: 'Failed to fetch query template',
        }, error);
        this.setState({fetchingQuery: false});
      },
    });

    this.setState({fetchingQuery: true});
  }

  private showParametrizationDialog(onSelect: (parametrize: boolean) => void) {
    const dialogRef = 'query-parametrization-dialog';
    const onHide = () => getOverlaySystem().hide(dialogRef);
    getOverlaySystem().show(
      dialogRef,
      <Modal onHide={onHide} show={true} style={{textAlign: 'center'}}>
        <Modal.Header>
          <Modal.Title>Do you want to apply the default arguments?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button bsStyle='primary' onClick={() => {
            onHide();
            onSelect(true);
          }}>Apply</Button>
          <Button bsStyle='default' style={{marginLeft: 5}} onClick={() => {
            onHide();
            onSelect(false);
          }}>
            Don't Apply
          </Button>
        </Modal.Body>
      </Modal>
    );
  }

  private setQuery(params: { query: Query; template: Template; parametrize: boolean; }) {
    const {query, template, parametrize} = params;
    let resultQuery = query.value;
    if (parametrize) {
      try {
        resultQuery = SparqlUtil.serializeQuery(
          applyDefaultArguments(query, template));
      } catch (e) {
        addNotification({
          level: 'warning',
          message: 'Failed to substitute default values for query template arguments',
        }, e);
      }
    }
    this.context.queryEditorContext.setQuery(resultQuery);
  }

  private fetchTemplateWithQuery(): Kefir.Property<[Template, Query]> {
    return this.queryTemplateService
      .getQueryTemplate(Rdf.iri(this.props.iri))
      .flatMap(({template, queryIri}) => this.queryService
        .getQuery(Rdf.iri(queryIri))
        .map((query): [Template, Query] => [template, query]),
      ).toProperty();
  }
}

function applyDefaultArguments(query: Query, template: Template): SparqlJs.SparqlQuery {
  const parsedQuery = SparqlUtil.parseQuery(query.value);
  const argsWithDefaults = template.args.filter(arg => Boolean(arg.defaultValue));
  if (argsWithDefaults.length === 0) {
    return parsedQuery;
  }
  const bindings = mapValues(
    keyBy(argsWithDefaults, arg => arg.variable),
    arg => arg.defaultValue);
  return SparqlClient.setBindings(parsedQuery, bindings);
}

export default QueryCatalogTemplate;
