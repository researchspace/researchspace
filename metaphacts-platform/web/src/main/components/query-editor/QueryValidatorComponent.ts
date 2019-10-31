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

import { createFactory, createElement, FormEvent } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import {Just, Nothing} from 'data.maybe';
import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, QueryVisitor } from 'platform/api/sparql';
import { Query, OperationType, QueryService, QueryServiceClass} from 'platform/api/services/ldp-query';
import { SparqlEditor } from 'platform/components/sparql-editor';

import './query-validator.scss';

const FormGroup = createFactory(ReactBootstrap.FormGroup);
const FormControl = createFactory(ReactBootstrap.FormControl);
const ControlLabel = createFactory(ReactBootstrap.ControlLabel);
const HelpBlock = createFactory(ReactBootstrap.HelpBlock);

export interface Value {
  value: string | QueryValue;
  error?: Error;
}

export interface QueryValue {
  query: string;
  type: SparqlJs.SparqlQuery['type'] | '';
  queryType: OperationType | '';
  variables: string[];
}

export interface Props {
  iri?: string;
  query?: Query;
  viewOnly?: boolean;
  onChange?: (query: Query, isValid: boolean) => void;
  onChangeVariables?: (variables: string[]) => void;
}

export interface State {
  label?: Data.Maybe<Value>;
  query?: Data.Maybe<Value>;
  isValid?: boolean;
}

export class QueryValidatorComponent extends Component<Props, State> {
  private label: Kefir.Pool<string> = Kefir.pool<string>();
  private query: Kefir.Pool<string> = Kefir.pool<string>();
  private queryService: QueryServiceClass;

  constructor(props: Props, context: any) {
    super(props, context);
    const semanticContext = this.context.semanticContext;
    this.queryService = QueryService(semanticContext);
    this.state = {
      label: Nothing<Value>(),
      query: Nothing<Value>(),
      isValid: false,
    };
  }

  componentWillMount() {
    this.initPool();
  }

  componentDidMount() {
    this.onUpdateProps({}, this.props);
  }

  componentWillReceiveProps(nextProps: Props) {
    this.onUpdateProps(this.props, nextProps);
  }

  private onUpdateProps(previous: Partial<Props>, props: Props) {
    const {iri, query} = props;
    if (iri && iri !== previous.iri) {
      this.fetchQuery(props.iri);
    } else if (query && query !== previous.query) {
      // TODO: need to lift up state
      if (!(previous.query && previous.query.value === query.value)) {
        this.query.plug(Kefir.constant(query.value));
      }
      if (!(previous.query && previous.query.label === query.label)) {
        const labelValue: Value = {value: query.label};
        this.setState({label: Just(labelValue)});
      }
    }
  }

  private fetchQuery = (iri: string) => {
    this.queryService.getQuery(Rdf.iri(iri)).onValue(query => {
      const {label, value} = query;

      this.label.plug(Kefir.constant(label));
      this.query.plug(Kefir.constant(value));
    });
  }

  private initPool = () => {
    const labelMapped = this.label.flatMap<Value>(this.validateLabel);
    labelMapped.onValue(
      v => this.setState({label: Just(v)})
    ).onError(
      v => this.setState({label: Just(v), isValid: false}, this.onChangeResult)
    );

    const queryMapped = this.query.flatMap<Value>(this.validateQuery);
    queryMapped.onValue(
      v => this.setState({query: Just(v), isValid: true}, () => {
        this.onChangeVariables();
        this.onChangeResult();
      })
    ).onError(
      v => this.setState({query: Just(v), isValid: false}, () => {
        this.onChangeVariables();
        this.onChangeResult();
      })
    );

    Kefir.combine(
      [
        labelMapped.map(v => v.value).toProperty(
          () => {if (this.state.label.isJust) { return this.state.label.get().value; }}
        ),
        queryMapped.map(v => v.value).toProperty(
          () => {if (this.state.query.isJust) { return this.state.query.get().value; }}
        ),
      ], (label, query) => {
        if (!label || !query) {
          return;
        }

        this.setState({isValid: true}, this.onChangeResult);
        return {};
      }
    ).onValue(o => o);
  }

  private onChangeResult = () => {
    if (this.props.onChange) {
      this.props.onChange(this.getQuery(), this.state.isValid);
    }
  }

  private onChangeVariables = () => {
    if (this.props.onChangeVariables) {
      const value = this.state.query.get().value as QueryValue;
      this.props.onChangeVariables(value.variables);
    }
  }

  private validateLabel = (v: string): Kefir.Property<Value> => {
    if (v.length < 1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error('Short description is required.'),
      });
    }
    return Kefir.constant<Value>({value: v});
  }

  private validateQuery = (query: string): Kefir.Property<Value> => {
    if (query === undefined) {
      return Kefir.constantError<Value>({
        value: {
          query: undefined,
          type: undefined,
          queryType: undefined,
          variables: [],
        },
        error: new Error('Query is empty'),
      });
    }
    return SparqlUtil.parseQueryAsync(query).flatMap<Value>( (q: SparqlJs.SparqlQuery) => {
      const queryType = (q.type === 'update') ? 'UPDATE' : q.queryType;
      return Kefir.constant<Value>({
        value: {
          query,
          type: q.type,
          queryType: queryType,
          variables: this.getVariables(q),
        },
      });
    }).flatMapErrors<Value>(e => {
      return Kefir.constantError<Value>({
        value: {
          query,
          type: undefined,
          queryType: undefined,
          variables: [],
        },
        error: e.error || new Error(e.message),
      });
    }).toProperty();
  }

  private getFormValue = (e: FormEvent<ReactBootstrap.FormControl>): Kefir.Property<any> => {
    return Kefir.constant((e.target as any).value);
  }

  private getVariables = (query: SparqlJs.SparqlQuery): string[] => {
    const visitor = new (class extends QueryVisitor {
      variables: string[] = [];

      variableTerm(variable: SparqlJs.Term) {
        const name = variable.substr(1);

        if (this.variables.indexOf(name) === -1 && name !== '') {
          this.variables.push(name);
        }

        return super.variableTerm(variable);
      }
    });

    visitor.sparqlQuery(query);

    return visitor.variables;
  }

  private getQuery = (): Query => {
    const {label, query} = this.state;
    return {
      label: label.isJust ? (label.get().value as string) : '',
      value: query.isJust ? (query.get().value as QueryValue).query : '',
      type: query.isJust ? (query.get().value as QueryValue).type : '',
      queryType: query.isJust ? (query.get().value as QueryValue).queryType : '',
    };
  }

  private getValidationState = (value: Data.Maybe<Value>): 'success' | 'warning' | 'error' => {
    if (value.isJust && value.get().error) {
      return 'error';
    }
  }

  render() {
    const {viewOnly} = this.props;

    const {label, query} = this.state;

    const queryValue = query.isJust ? (query.get().value as QueryValue).query : '';

    return D.div({className: 'mp-query-validator'},
      FormGroup({validationState: this.getValidationState(label)},
        ControlLabel({}, 'Short Description*'),
        FormControl({
          type: 'text',
          value: label.isJust ? label.get().value as string : '',
          onChange: e => this.label.plug(this.getFormValue(e)),
          disabled: viewOnly,
        }),
        this.getValidationState(label) === 'error'
          ? HelpBlock({}, label.get().error.message)
          : null
      ),
      FormGroup({},
        ControlLabel({}, 'Query Type'),
        FormControl({
          type: 'text',
          value: query.isJust ? (query.get().value as QueryValue).queryType : '',
          disabled: true,
        })
      ),
      viewOnly
        ? D.pre({}, D.code({}, queryValue))
        : createElement(SparqlEditor, {
          query: queryValue,
          syntaxErrorCheck: false,
          onChange: e => this.query.plug(Kefir.constant(e.value)),
        }),
      FormGroup({validationState: this.getValidationState(query), style: {marginBottom: 0}},
        this.getValidationState(query) === 'error'
          ? HelpBlock({style: {marginBottom: 0}}, query.get().error.message)
          : null
      )
    );
  }
}

export type component = QueryValidatorComponent;
export const component = QueryValidatorComponent;
export const factory = createFactory(component);
export default component;
