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
import { Component, FormEvent } from 'react';
import { FormGroup, FormControl, Col, ControlLabel, HelpBlock, Button } from 'react-bootstrap';
import { Just, Nothing } from 'data.maybe';
import * as Kefir from 'kefir';
import { isEqual } from 'lodash';

import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';
import {
  validateType, FieldValue, FieldError, ErrorKind, AtomicValue, EmptyValue,
} from 'platform/components/forms';

import { VALUE_TYPES, Argument, Value } from './QueryTemplateTypes';

export interface Props {
  argument: Argument;
  variables: string[];
  notAvailableLabels: string[];
  notAvailableVariables: string[];
  onDelete: () => void;
  onChange: (arg: Argument, isValid: boolean) => void;
}

interface State {
  label?: Data.Maybe<Value>;
  variable?: Data.Maybe<Value>;
  comment?: Data.Maybe<Value>;
  valueType?: Data.Maybe<Value>;
  defaultValue?: AtomicValue | EmptyValue;
  isValid?: boolean;
  optional?: boolean;
}

export class QueryTemplateEditArgument extends Component<Props, State> {
  private label = Kefir.pool<string>();
  private variable = Kefir.pool<string>();
  private comment = Kefir.pool<string>();
  private valueType = Kefir.pool<string>();
  private defaultValue = Kefir.pool<string>();
  private optional = Kefir.pool<boolean>();

  constructor(props: Props) {
    super(props);

    this.state = {
      label: Nothing<Value>(),
      variable: Nothing<Value>(),
      comment: Nothing<Value>(),
      valueType: Nothing<Value>(),
      defaultValue: FieldValue.empty,
      optional: false,
      isValid: false,
    };
  }

  componentWillMount() {
    const labelMapped = this.label.flatMap<Value>(this.validateLabel);
    labelMapped.onValue(
      v => this.setState({label: Just(v)}, this.onChange)
    ).onError(
      v => this.setState({label: Just(v), isValid: false}, this.onChange)
    );

    const variableMapped = this.variable.flatMap<Value>(this.validateVariable);
    variableMapped.onValue(
      v => this.setState({variable: Just(v)}, this.onChange)
    ).onError(
      v => this.setState({variable: Just(v), isValid: false}, this.onChange)
    );

    const commentMapped = this.comment.flatMap<Value>(v => Kefir.constant<Value>({value: v}));
    commentMapped.onValue(
      v => this.setState({comment: Just(v)}, this.onChange)
    ).onError(
      v => this.setState({comment: Just(v), isValid: false}, this.onChange)
    );

    const valueTypeMapped = this.valueType.flatMap<Value>(this.validateInputField);
    valueTypeMapped.onValue(
      v => this.setState({valueType: Just(v)}, this.onChange)
    ).onError(
      v => this.setState({valueType: Just(v), isValid: false}, this.onChange)
    );

    const defaultValueMapped = Kefir.combine(
      [valueTypeMapped.flatMapErrors<Value>(v => Kefir.constant(v)), this.defaultValue],
      (valueType, defaultValue): AtomicValue | EmptyValue => {
        if (!defaultValue) {
          return FieldValue.empty;
        } else if (valueType.error) {
          return {
            type: AtomicValue.type,
            value: Rdf.literal(defaultValue),
            errors: FieldError.noErrors.push({
              kind: ErrorKind.Input,
              message: 'Specify value type first',
            }),
          };
        }
        const type = Rdf.iri(valueType.value);
        const value = XsdDataTypeValidation.sameXsdDatatype(type, vocabularies.xsd.anyURI)
          ? Rdf.iri(defaultValue) : Rdf.literal(defaultValue, type);
        return validateType({value}, type);
      },
    ).flatMap(v => FieldValue.getErrors(v).size > 0 ? Kefir.constantError(v) : Kefir.constant(v));

    defaultValueMapped.observe({
      value: defaultValue => this.setState({defaultValue}, this.onChange),
      error: defaultValue => this.setState({defaultValue, isValid: false}, this.onChange),
    });

    const optionalMapped = this.optional.flatMap(v => Kefir.constant<boolean>(v));
    optionalMapped.onValue(
      v => {
        this.setState({optional: v}, this.onChange);
      }
    ).onError(
      v => this.setState({optional: v, isValid: false}, this.onChange)
    );

    Kefir.combine(
      [
        labelMapped.map(v => v.value),
        variableMapped.map(v => v.value),
        commentMapped.map(v => v.value),
        valueTypeMapped.map(v => v.value),
        optionalMapped.map(v => v),
        defaultValueMapped,
      ],
      (label, variable, comment, valueType, optional) => {
        if (!label || !variable || !valueType) { return; }
        this.setState({isValid: true}, this.onChange);
        return {};
      },
    ).onValue(() => { /* nothing */ });
  }

  componentDidMount() {
    const argument = this.props.argument;

    this.label.plug(Kefir.constant(argument.label));
    this.variable.plug(Kefir.constant(argument.variable));
    this.comment.plug(Kefir.constant(argument.comment));
    this.valueType.plug(Kefir.constant(argument.valueType));
    this.defaultValue.plug(Kefir.constant(
      argument.defaultValue ? argument.defaultValue.value : ''));
    this.optional.plug(Kefir.constant(argument.optional));
  }

  componentDidUpdate(prevProps: Props) {
    if (!isEqual(prevProps.variables, this.props.variables)
      || !isEqual(prevProps.notAvailableVariables, this.props.notAvailableVariables)
    ) {
      this.variable.plug(Kefir.constant(this.state.variable.get().value));
    }

    if (!isEqual(prevProps.notAvailableLabels, this.props.notAvailableLabels)) {
      this.label.plug(Kefir.constant(this.state.label.get().value));
    }
  }

  private onChange = () => {
    const {label, variable, comment, valueType, defaultValue, isValid, optional} = this.state;
    const argument = {
      label: label.get().value,
      variable: variable.get().value,
      comment: comment.get().value,
      valueType: valueType.get().value,
      defaultValue: FieldValue.asRdfNode(defaultValue) || undefined,
      optional: optional,
    };

    this.props.onChange(argument, isValid);
  }

  private validateInputField = (v: string): Kefir.Property<Value> => {
    if (v.length < 1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error('Please fill out this field.'),
      });
    }
    return Kefir.constant<Value>({value: v});
  }

  private validateLabel = (v: string): Kefir.Property<Value> => {
    if (v.length < 1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error('Please fill out this field.'),
      });
    }

    if (this.props.notAvailableLabels.indexOf(v) !== -1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error(`Label duplicated.`),
      });
    }

    return Kefir.constant<Value>({value: v});
  }

  private validateVariable = (v: string): Kefir.Property<Value> => {
    if (v.length < 1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error('Please fill out this field.'),
      });
    }

    if (this.props.variables.indexOf(v) === -1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error(`Variable '${v}' is not in the query.`),
      });
    }

    if (this.props.notAvailableVariables.indexOf(v) !== -1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error(`Variable duplicated.`),
      });
    }

    return Kefir.constant<Value>({value: v});
  }

  private getFormValue = (e: FormEvent<FormControl>) : Kefir.Property<any> => {
    return Kefir.constant((e.target as any).value);
  }

  render() {
    const {variables, onDelete} = this.props;
    const {label, variable, comment, valueType, defaultValue, optional} = this.state;

    return <div className='form-horizontal'>
      <FormGroup validationState={label.isJust && label.get().error ? 'error' : undefined}>
        <Col sm={2}><ControlLabel>Label</ControlLabel></Col>
        <Col sm={10}>
          <FormControl type='text'
            value={label.isJust ? label.get().value : ''}
            onChange={e => this.label.plug(this.getFormValue(e))} />
          {label.isJust && label.get().error
            ? <HelpBlock>{label.get().error.message}</HelpBlock>
            : null}
        </Col>
      </FormGroup>
      <FormGroup validationState={variable.isJust && variable.get().error ? 'error' : undefined}>
        <Col sm={2}><ControlLabel>Variable</ControlLabel></Col>
        <Col sm={10}>
          <FormControl componentClass='select'
            value={variable.isJust ? variable.get().value : ''}
            onChange={e => this.variable.plug(this.getFormValue(e))}>
            <option value='' disabled={true} style={{display: 'none'}}>
              -- select variable --
            </option>
            {variables.map((item, index) => <option key={index} value={item}>{item}</option>)}
          </FormControl>
          {variable.isJust && variable.get().error
            ? <HelpBlock>{variable.get().error.message}</HelpBlock>
            : null}
        </Col>
      </FormGroup>
      <FormGroup validationState={valueType.isJust && valueType.get().error ? 'error' : undefined}>
        <Col sm={2}><ControlLabel>Value Type</ControlLabel></Col>
        <Col sm={10}>
          <FormControl componentClass='select'
            value={valueType.isJust ? valueType.get().value : ''}
            onChange={e => this.valueType.plug(this.getFormValue(e))}>
            <option value='' disabled={true} style={{display: 'none'}}>
              -- select value type --
            </option>
            {VALUE_TYPES.map(item =>
              <option key={item.value} value={item.value}>{item.label}</option>)}
          </FormControl>
          {valueType.isJust && valueType.get().error
            ? <HelpBlock>{valueType.get().error.message}</HelpBlock>
            : null}
        </Col>
      </FormGroup>
      <FormGroup validationState={
        FieldValue.getErrors(defaultValue).size > 0 ? 'error' : undefined
      }>
        <Col sm={2}><ControlLabel>Default Value</ControlLabel></Col>
        <Col sm={10}>
          <FormControl type='text'
            value={FieldValue.isAtomic(defaultValue) ? defaultValue.value.value : ''}
            onChange={e => this.defaultValue.plug(this.getFormValue(e))} />
          {FieldValue.getErrors(defaultValue).size > 0
            ? <HelpBlock>{FieldValue.getErrors(defaultValue).first().message}</HelpBlock>
            : null}
        </Col>
      </FormGroup>
      <FormGroup validationState={comment.isJust && comment.get().error ? 'error' : undefined}>
        <Col sm={2}><ControlLabel>Comment</ControlLabel></Col>
        <Col sm={10}>
          <FormControl type='text'
            value={comment.isJust ? comment.get().value : ''}
            onChange={e => this.comment.plug(this.getFormValue(e))} />
          {comment.isJust && comment.get().error
            ? <HelpBlock>{comment.get().error.message}</HelpBlock>
            : null}
        </Col>
      </FormGroup>
      <FormGroup>
        <Col sm={2}><ControlLabel>Optional</ControlLabel></Col>
        <Col sm={10}>
          <FormControl type='checkbox' style={{width: '20px'}}
            checked={optional}
            onChange={e => {
              // TODO
              this.optional.plug(Kefir.constant((e.target as any).checked));
            }} />
        </Col>
      </FormGroup>
      <div className='text-right'>
        <Button bsStyle='danger' bsSize='xsmall' onClick={onDelete}>
          <span className='fa fa-times'> Delete</span>
        </Button>
      </div>
    </div>;
  }
}

export default QueryTemplateEditArgument;
