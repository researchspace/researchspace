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

import * as React from 'react';
import { Component, ReactInstance, ReactNode, createElement } from 'react';
import { findDOMNode } from 'react-dom';
import { Just, Nothing } from 'data.maybe';
import * as Immutable from 'immutable';
import { Row, Col, Button, FormControl, Modal, ModalDialogProps } from 'react-bootstrap';
import * as YASR from 'yasgui-yasr';

import { SparqlClient, SparqlUtil, QueryContext } from 'platform/api/sparql';
import { getCurrentUrl } from 'platform/api/navigation';
import {
  ContextTypes, ComponentContext, SemanticContextProvider,
} from 'platform/api/components';
import { Cancellation } from 'platform/api/async';
import { getRepositoryStatus } from 'platform/api/services/repository';
import { Permissions } from 'platform/api/services/security';
import { HasPermisssion } from 'platform/components/security/HasPermission';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { QueryTemplate } from 'platform/components/query-editor';

import { MetaphactsYASRTable } from './MetaphactsYASRTable';
import { SparqlEditor } from './SparqlEditor';

import {
  ContextTypes as EditorContextTypes,
  ComponentContext as EditorContext,
} from './SparqlQueryEditorContext';

import './SparqlQueryEditor.scss';
import 'yasgui-yasr/dist/yasr.css';

export interface SparqlQueryEditorProps { }

interface State {
  readonly isExecuting?: boolean;
  readonly alertState?: Data.Maybe<AlertConfig>;
  readonly query?: string;
  readonly repositoryStatus?: Immutable.Map<string, boolean>;
  readonly selectedRepository?: string;
}

const CLASS_NAME = 'SparqlQueryEditor';

export class SparqlQueryEditor extends Component<SparqlQueryEditorProps, State> {
  static readonly contextTypes = {...ContextTypes, ...EditorContextTypes};
  context: ComponentContext & EditorContext;

  private readonly cancellation = new Cancellation();

  private editor: SparqlEditor;
  private resultHolder: ReactInstance;

  private yasr: YasguiYasr.Yasr;

  constructor(props: SparqlQueryEditorProps, context: any) {
    super(props, context);
    this.state = {
      isExecuting: false,
      alertState: Nothing<AlertConfig>(),
    };
  }

  render() {
    return <Row className={CLASS_NAME}>
      <Col componentClass='div' md={12}>
          <SparqlEditor ref={editor => this.editor = editor}
            backdrop={this.state.isExecuting}
            query={this.state.query}
            onChange={query => {
              this.context.queryEditorContext.setQuery(query.value, {silent: true});
              this.setState({query: query.value});
            }}
            autocompleters={['variables', 'prefixes']}
            persistent={() => 'sparqlEndpoint'}
          />
          {this.state.alertState.map(config => createElement(Alert, config)).getOrElse(null)}
          <div className={`form-inline ${CLASS_NAME}__controls`}>
            <HasPermisssion permission={Permissions.queryEditorSelectEndpoint}>
              {this.renderRepositorySelector()}
            </HasPermisssion>
            <Button
              bsStyle='primary'
              disabled={this.state.isExecuting}
              onClick={() => this.executeQuery(this.state.query)}>
              {this.state.isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            <HasPermisssion permission={Permissions.queryEditorSave}>
              <Button onClick={() => getOverlaySystem().show(
                  SaveQueryModal.KEY,
                  <SaveQueryModal query={this.state.query}
                    onHide={() => getOverlaySystem().hide(SaveQueryModal.KEY)}>
                  </SaveQueryModal>,
                )}>
                Save
              </Button>
            </HasPermisssion>
          </div>
          <div ref={resultHolder => this.resultHolder = resultHolder}
            style={{visibility: this.state.isExecuting ? 'hidden' : 'visible'}} />
      </Col>
    </Row>;
  }

  private renderRepositorySelector() {
    const options: ReactNode[] = [];
    if (this.state.repositoryStatus) {
      options.push(<option key='@empty' value=''>(from context)</option>);
      this.state.repositoryStatus.forEach((running, repository) => options.push(
        <option key={repository} disabled={!running} value={repository}>
          {repository}
        </option>,
      ));
    } else {
      options.push(<option key='@loading' value=''>Loading...</option>);
    }

    return (
      <span className={`${CLASS_NAME}__repositorySelector`}>
        <label>
          Repository:
          <FormControl componentClass='select'
            className={`${CLASS_NAME}__repositorySelectorDropdown`}
            value={this.state.selectedRepository}
            onChange={e => this.setState({
              selectedRepository: (e.target as HTMLSelectElement).value,
            })}>
            {options}
          </FormControl>
        </label>
      </span>
    );
  }

  componentDidMount() {
    const element = findDOMNode(this.resultHolder);
    delete YASR.plugins['table'];
    delete YASR.plugins['pivot'];
    delete YASR.plugins['gChart'];
    YASR.registerOutput('metaphactsTable', (yasr) => {
      return MetaphactsYASRTable(yasr);
    });
    this.yasr = YASR(element, {
      outputPlugins: ['rawResponse', 'metaphactsTable', 'boolean', 'error'],
      useGoogleCharts: false,
      persistency: {
        results: false,
      },
    });

    const {queryEditorContext} = this.context;
    const contextQuery = queryEditorContext.getQuery();
    const initialQuery = contextQuery.getOrElse(this.editor.getQuery().value);
    if (contextQuery.isNothing) {
      queryEditorContext.setQuery(initialQuery, {silent: true});
    }
    this.setState({query: initialQuery});

    // if a query is supplied via request parameter,
    // we are going to execute it after the component has been mounted
    if (getCurrentUrl().hasSearch('query')) {
      this.executeQuery(initialQuery);
    }

    this.cancellation.map(queryEditorContext.queryChanges).onValue(query => {
      this.setState({
        alertState: Nothing<AlertConfig>(),
        query: query.getOrElse(undefined),
      });
    });

    this.cancellation.map(getRepositoryStatus()).onValue(
      repositoryStatus => this.setState({repositoryStatus}));
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private executeQuery = (query: string) => {
    this.setState({isExecuting: true});

    try {
      const parsedQuery = SparqlUtil.parseQuery(query);
      this.addRecentQueries(query);
      switch (parsedQuery.type) {
        case 'query':
          this.sendSparqlQuery(parsedQuery, parsedQuery.queryType);
          break;
        case 'update':
          this.executeSparqlUpdate(parsedQuery);
          break;
      }
    } catch (e) {
      this.setState({
        isExecuting: false,
        alertState: Just<AlertConfig>({
          alert: AlertType.DANGER,
          message: e.message,
        }),
      });
    }
  }

  private sendSparqlQuery = (query: SparqlJs.SparqlQuery, queryType: string) => {
    SparqlClient.accumulateStringStream(
      SparqlClient.streamSparqlQuery(
        query,
        SparqlClient.stringToSparqlQueryForm[queryType],
        this.getQueryContext()
      ),
    ).onAny(event => {
      if (event.type === 'value') {
        this.yasr.setResponse(event.value);
        this.setState({
          alertState: Nothing<AlertConfig>(),
          isExecuting: false,
        });
      } else if (event.type === 'error') {
        // seems typings are wrong in kefir
        const e: any = event as any;
        this.setState({
          isExecuting: false,
          alertState: Just<AlertConfig>({
            alert: AlertType.DANGER,
            message: e.value['statusText'] ? e.value['statusText'] : e.value['message'],
          }),
        });
      }
    });
  }

  private executeSparqlUpdate  = (query: SparqlJs.SparqlQuery) => {
    SparqlClient.executeSparqlUpdate(query as SparqlJs.Update, this.getQueryContext())
      .onValue(v => {
        this.setState({
          alertState: Nothing<AlertConfig>(),
          isExecuting: false,
        });
        this.yasr.setResponse('SPARQL Update Operation executed!');
      }).onError((e: Error) => {
        this.setState({
          isExecuting: false,
          alertState: Just<AlertConfig>({
            alert: AlertType.DANGER,
            message: e.message,
          }),
        });
      });
  }

  private getQueryContext = () => {
    const contextOverride: Partial<QueryContext> = this.state.selectedRepository
      ? {repository: this.state.selectedRepository} : undefined;
    return {context: {...this.context.semanticContext, ...contextOverride}};
  }

  private addRecentQueries = (query: string) => {
    this.context.queryEditorContext.setQuery(query);
  }
}

interface SaveQueryModalProps extends ModalDialogProps {
  query: string;
}

class SaveQueryModal extends Component<SaveQueryModalProps, void> {
  static readonly KEY = 'SparqlQueryEditor-SaveQuery';
  render() {
    const {onHide, query} = this.props;
    return (
      <Modal show={true} onHide={onHide} bsSize='large'>
        <Modal.Header closeButton={true}>
          <Modal.Title>Save Query</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SemanticContextProvider repository='assets'>
            <QueryTemplate defaultQuery={query} />
          </SemanticContextProvider>
        </Modal.Body>
      </Modal>
    );
  }
}

export default SparqlQueryEditor;
