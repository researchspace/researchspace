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

import { createElement, ReactNode, Component, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';

import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import { FieldDefinitionProp } from './FieldDefinition';
import { FieldValue, EmptyValue, AtomicValue, CompositeValue, ErrorKind, DataState } from './FieldValues';

import { CompositeInput, CompositeInputProps, SingleValueHandler } from './inputs';
import { FormErrors } from './static/FormErrors';

import './forms.scss';

export interface SemanticFormProps {
  fields?: ReadonlyArray<FieldDefinitionProp>;
  model: EmptyValue | AtomicValue | CompositeValue;
  onChanged: (model: CompositeValue) => void;
  onLoaded: (model: CompositeValue) => void;
  onUpdated?: (dataState: DataState) => void;
  newSubjectTemplate?: string;
  children?: ReactNode;
  debug?: boolean;
}

enum LoadingState {
  None,
  Loading,
  Completed,
}

/**
 * Component to view and edit semantic data represented by a collection of fields.
 * This component is an equivalent of HTML <form> element for display and modification
 * of data represented by {@link Rdf.Node}s.
 *
 * Usage and lifecycle:
 *
 *   1. Render form with inputs as children (either {@link SingleValueInput} or
 *      {@link MultipleValuesInput}, former automatically wrapped by {@link CardinalitySupport}).
 *
 *      Child inputs provided with field definition and current field state from model
 *      based on 'for' property of input component.
 *
 *   2. Props.onLoaded is called on mount with intialized model derived from
 *      intially provided model by filtering unused field definitions and adding information
 *      about configuration errors (e.g. missing field defintion for input).
 *
 *   3. Props.onChanged is called on model change:
 *      a. when intial value and value set of field is loaded
 *      b. when user changed field value using form's input
 *      c. when new value of edited field finished validation by Sparql query
 */
export class SemanticForm extends Component<SemanticFormProps, {}> {
  private readonly cancellation = new Cancellation();

  private handler: SingleValueHandler;

  private input: CompositeInput;
  private lastDataState: DataState | undefined;
  private loadingState = LoadingState.None;
  private pendingModel: FieldValue;

  constructor(props: SemanticFormProps, context: any) {
    super(props, context);
    this.handler = CompositeInput.makeHandler({
      definition: undefined,
      baseInputProps: {
        fields: this.props.fields || [],
        newSubjectTemplate: this.props.newSubjectTemplate,
        children: this.props.children,
      },
    });
  }

  componentDidMount() {
    this.pendingModel = this.props.model;
  }

  componentWillReceiveProps(nextProps: SemanticFormProps) {
    if (nextProps.model !== this.props.model) {
      this.pendingModel = nextProps.model;
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private updateModel = (reducer: (previous: FieldValue) => FieldValue) => {
    this.pendingModel = reducer(this.pendingModel);
    if (!FieldValue.isComposite(this.pendingModel)) {
      throw new Error('CompositeValue.updateValue returned non-composite');
    }
    this.props.onChanged(this.pendingModel);
  };

  componentDidUpdate(prevProps: SemanticFormProps) {
    const dataState = this.input ? this.input.dataState() : DataState.Loading;
    const modelOrDataStateChanged = !(this.props.model === prevProps.model && this.lastDataState === dataState);
    this.lastDataState = dataState;

    if (modelOrDataStateChanged) {
      if (this.props.onUpdated) {
        this.props.onUpdated(dataState);
      }

      if (this.props.debug) {
        console.log(`[${LoadingState[this.loadingState]}] ${DataState[dataState]}`, asDebugJSObject(this.props.model));
      }

      // transition from None to Loading
      if (this.loadingState === LoadingState.None && dataState === DataState.Loading) {
        this.loadingState = LoadingState.Loading;
        if (this.props.debug) {
          console.log(`[-> ${LoadingState[this.loadingState]}]`);
        }
      } else if (
        // transition from Loading to Ready
        this.loadingState === LoadingState.Loading &&
        dataState === DataState.Ready &&
        FieldValue.isComposite(this.props.model)
      ) {
        this.loadingState = LoadingState.Completed;
        if (this.props.debug) {
          console.log(`[-> ${LoadingState[this.loadingState]}]`);
        }
        this.props.onLoaded(this.props.model);
      }
    }
  }

  private onCompositeMounted = (input: CompositeInput) => {
    this.input = input;
  };

  /**
   * Performs validation of model with form inputs.
   * This is useful when model is only partially validated or not validated at all,
   * e.g. loaded as initial state, restored from previous session, etc.
   */
  validate(model: CompositeValue): CompositeValue {
    const validated = this.handler.validate(model);
    if (!FieldValue.isComposite(validated)) {
      throw new Error('Expected to return either composite or empty value from CompositeInput.validate');
    }
    return validated;
  }

  finalize(model: CompositeValue): Kefir.Property<CompositeValue> {
    return this.handler
      .finalize(model, FieldValue.empty)
      .flatMap((finalized) =>
        FieldValue.isComposite(finalized)
          ? Kefir.constant(finalized)
          : Kefir.constantError<any>(new Error('Expected CompositeValue as finalize result'))
      )
      .toProperty();
  }

  render() {
    if (FieldValue.isEmpty(this.props.model)) {
      return createElement(Spinner);
    }

    const hasConfigurationErrors = this.props.model.errors.some((e) => e.kind === ErrorKind.Configuration);

    return D.div(
      { className: 'semantic-form' },
      createElement(CompositeInput, {
        ref: this.onCompositeMounted,
        handler: this.handler,
        fields: this.props.fields || [],
        newSubjectTemplate: this.props.newSubjectTemplate,
        dataState: DataState.Ready,
        updateValue: this.updateModel,
        value: this.props.model,
        // in case of configuration errors show FormErrors component instead of form content
        children: hasConfigurationErrors
          ? createElement(
              ErrorNotification,
              { title: 'Errors in form configuration' },
              createElement(FormErrors, { model: this.props.model })
            )
          : this.props.children,
      }),
      this.props.debug ? D.pre({}, JSON.stringify(asDebugJSObject(this.props.model), null, 2)) : null
    );
  }
}

function asDebugJSObject(value: FieldValue): object {
  switch (value.type) {
    case EmptyValue.type:
      return { type: EmptyValue.type };
    case AtomicValue.type:
      return {
        type: AtomicValue.type,
        value: value.value.toString(),
        label: value.label,
        errors: value.errors.toArray(),
      };
    case CompositeValue.type:
      return {
        type: CompositeValue.type,
        subject: value.subject.toString(),
        fields: value.fields
          .map((state) => ({
            values: state.values.map(asDebugJSObject).toArray(),
            errors: state.errors.toArray(),
          }))
          .toObject(),
      };
  }
}

export default createFactory(SemanticForm);
