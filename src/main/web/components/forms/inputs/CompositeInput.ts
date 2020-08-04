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

import { createElement, Props, ReactNode } from 'react';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';

import { Spinner } from 'platform/components/ui/spinner';

import { FieldDefinitionProp, FieldDefinition, normalizeFieldDefinition } from '../FieldDefinition';
import {
  FieldValue,
  EmptyValue,
  CompositeValue,
  FieldError,
  FieldState,
  DataState,
  mergeDataState,
} from '../FieldValues';
import { InputMapping, validateFieldConfiguration, renderFields } from '../FieldMapping';
import { fieldInitialState, generateSubjectByTemplate, loadDefaults, tryBeginValidation } from '../FormModel';

import {
  SingleValueInput,
  SingleValueInputProps,
  SingleValueHandler,
  SingleValueHandlerProps,
} from './SingleValueInput';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandler,
  ValuesWithErrors,
} from './MultipleValuesInput';

export interface CompositeInputProps extends SingleValueInputProps {
  fields: ReadonlyArray<FieldDefinitionProp>;
  newSubjectTemplate?: string;
  children?: ReactNode;
}

type ComponentProps = CompositeInputProps & Props<CompositeInput>;

interface InputState {
  readonly dataState: DataState.Ready | DataState.Verifying;
  readonly validation: Cancellation;
}
const READY_INPUT_STATE: InputState = {
  dataState: DataState.Ready,
  validation: Cancellation.cancelled,
};

const VALIDATION_DEBOUNCE_DELAY = 500;

type ChildInput = MultipleValuesInput<MultipleValuesProps, unknown>;

export class CompositeInput extends SingleValueInput<ComponentProps, {}> {
  private readonly cancellation = new Cancellation();
  private compositeOperations = this.cancellation.derive();

  private shouldReload = true;
  private compositeState: DataState.Loading | DataState.Ready = DataState.Ready;
  private inputRefs = new Map<string, Array<ChildInput | null>>();
  private inputStates = new Map<string, InputState>();

  constructor(props: ComponentProps, context: any) {
    super(props, context);
  }

  private getHandler(): CompositeHandler {
    const { handler } = this.props;
    if (!(handler instanceof CompositeHandler)) {
      throw new Error('Invalid value handler for CompositeInput');
    }
    return handler;
  }

  componentDidMount() {
    this.tryLoadComposite(this.props);
  }

  componentWillReceiveProps(props: ComponentProps) {
    if (props.value !== this.props.value) {
      // track reload requests separately to be able to suspend
      // composite load until `props.dataState` becomes `DataState.Ready`
      this.shouldReload = true;
    }
    this.tryLoadComposite(props);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private tryLoadComposite(props: ComponentProps) {
    if (!(this.shouldReload && props.dataState === DataState.Ready)) {
      return;
    }
    const shouldLoad =
      !FieldValue.isComposite(props.value) ||
      // composite value requires to load definitions and defaults
      // (e.g. when value is restored from local storage)
      (props.value.fields.size > 0 && props.value.definitions.size === 0);
    if (shouldLoad) {
      this.shouldReload = false;
      this.loadComposite(props);
    }
  }

  private loadComposite(props: ComponentProps) {
    this.compositeOperations = this.cancellation.deriveAndCancel(this.compositeOperations);
    const handler = this.getHandler();

    // filter model from unused field definitions
    // (the ones without corresponding input)
    const filterUnusedFields = <T>(items: Immutable.Iterable<string, T>) =>
      items.filter((item, fieldId) => handler.inputs.has(fieldId)).toMap();

    const definitions = filterUnusedFields(handler.definitions);
    const rawComposite = createRawComposite(props.value, definitions, handler.configurationErrors);

    this.compositeState = DataState.Loading;
    this.inputStates.clear();

    props.updateValue(() => rawComposite);
    this.compositeOperations
      .map(
        // add zero delay to force asynchronous observer call
        loadDefaults(rawComposite, handler.inputs).flatMap((v) => Kefir.later(0, v))
      )
      .observe({
        value: (change) => {
          let loaded = change(rawComposite);
          if (FieldValue.isComposite(props.value)) {
            loaded = mergeInitialValues(loaded, props.value);
          }
          this.compositeState = DataState.Ready;
          this.props.updateValue(() => loaded);
        },
      });
  }

  private onFieldValuesChanged = (def: FieldDefinition, reducer: (previous: ValuesWithErrors) => ValuesWithErrors) => {
    this.props.updateValue((previous) => this.setFieldValue(def, previous, reducer));
  };

  private setFieldValue(
    def: FieldDefinition,
    oldValue: FieldValue,
    reducer: (previous: ValuesWithErrors) => ValuesWithErrors
  ): FieldValue {
    if (!FieldValue.isComposite(oldValue)) {
      return;
    }

    const newValue = reduceFieldValue(def.id, oldValue, reducer);
    if (this.isInputLoading(def.id)) {
      this.inputStates.set(def.id, READY_INPUT_STATE);
    } else {
      this.startValidatingField(def, oldValue, newValue);
    }

    return newValue;
  }

  private isInputLoading(fieldId: string): boolean {
    const refs = this.inputRefs.get(fieldId);
    if (!refs) {
      return true;
    }
    for (const ref of refs) {
      if (!ref || ref.dataState() === DataState.Loading) {
        return true;
      }
    }
    return false;
  }

  private startValidatingField(def: FieldDefinition, oldValue: CompositeValue, newValue: CompositeValue) {
    let { dataState, validation } = this.inputStates.get(def.id) || READY_INPUT_STATE;
    // immediately apply user edits in an input component
    // then update model with validation info when it'll be available
    const modelChange = tryBeginValidation(def, oldValue, newValue);

    dataState = modelChange ? DataState.Verifying : DataState.Ready;
    validation = this.compositeOperations.deriveAndCancel(validation);

    this.inputStates.set(def.id, { dataState, validation });

    if (modelChange) {
      validation.map(Kefir.later(VALIDATION_DEBOUNCE_DELAY, {}).flatMap(() => modelChange)).observe({
        value: (change) => {
          const current = this.props.value;
          if (!FieldValue.isComposite(current)) {
            return;
          }
          const validated = change(current);
          this.inputStates.set(def.id, READY_INPUT_STATE);
          this.props.updateValue(() => validated);
        },
      });
    }
  }

  dataState(): DataState {
    if (!FieldValue.isComposite(this.props.value)) {
      return DataState.Loading;
    } else if (this.compositeState !== DataState.Ready) {
      return this.compositeState;
    }

    let result = DataState.Ready;

    const fieldIds = this.props.value.definitions.map((def) => def.id).toArray();
    for (const fieldId of fieldIds) {
      const refs = this.inputRefs.get(fieldId);
      if (!refs) {
        result = mergeDataState(result, DataState.Loading);
        continue;
      }
      for (const ref of refs) {
        if (ref) {
          result = mergeDataState(result, ref.dataState());
        }
      }
    }

    return result;
  }

  private dataStateForField = (fieldId: string): DataState => {
    if (this.compositeState !== DataState.Ready) {
      return this.compositeState;
    }
    const state = this.inputStates.get(fieldId) || READY_INPUT_STATE;
    return state.dataState;
  };

  render() {
    const composite = this.props.value;
    if (!FieldValue.isComposite(composite)) {
      return createElement(Spinner);
    }

    const children = renderFields(
      this.props.children,
      composite,
      this.getHandler().handlers,
      this.dataStateForField,
      this.onFieldValuesChanged,
      this.onMountInput
    );

    return createElement('div', { className: 'composite-input' }, children);
  }

  private onMountInput = (
    inputId: string,
    inputIndex: number,
    inputRef: MultipleValuesInput<MultipleValuesProps, any> | null
  ) => {
    let refs = this.inputRefs.get(inputId);
    if (!refs) {
      refs = [];
      this.inputRefs.set(inputId, refs);
    }
    refs[inputIndex] = inputRef;
  };

  static makeHandler(props: SingleValueHandlerProps<CompositeInputProps>): CompositeHandler {
    return new CompositeHandler(props);
  }
}

class CompositeHandler implements SingleValueHandler {
  readonly newSubjectTemplate: string | undefined;
  readonly definitions: Immutable.Map<string, FieldDefinition>;
  readonly inputs: Immutable.Map<string, ReadonlyArray<InputMapping>>;
  readonly configurationErrors: Immutable.List<FieldError>;
  readonly handlers: Immutable.Map<string, ReadonlyArray<MultipleValuesHandler>>;

  constructor({ baseInputProps }: SingleValueHandlerProps<CompositeInputProps>) {
    this.newSubjectTemplate = baseInputProps.newSubjectTemplate;
    this.definitions = normalizeDefinitons(baseInputProps.fields);
    const { inputs, errors } = validateFieldConfiguration(this.definitions, baseInputProps.children);
    this.inputs = inputs;
    this.configurationErrors = errors;
    this.handlers = inputs
      .map((mappings) =>
        mappings.map((mapping) =>
          MultipleValuesInput.getHandlerOrDefault(mapping.inputType as any, {
            definition: this.definitions.get(mapping.for),
            baseInputProps: mapping.element.props,
          })
        )
      )
      .toMap();
  }

  validate(value: FieldValue) {
    if (!FieldValue.isComposite(value)) {
      return value;
    }
    return CompositeValue.set(value, {
      fields: value.fields
        .map((state, fieldId) => {
          const handlers = this.handlers.get(fieldId);
          if (!handlers || handlers.length === 0) {
            return state;
          }
          let validated = state;
          for (const handler of handlers) {
            validated = handler.validate(validated);
          }
          return FieldState.set(state, validated);
        })
        .toMap(),
    });
  }

  finalize(value: FieldValue, owner: EmptyValue | CompositeValue): Kefir.Property<CompositeValue> {
    const finalizedComposite = this.finalizeSubject(value, owner);

    const fieldProps = finalizedComposite.fields
      .map((state, fieldId) => {
        const handlers = this.handlers.get(fieldId);
        if (!handlers || handlers.length === 0) {
          return Kefir.constant(state);
        }
        let finalizing = Kefir.constant(state.values);
        for (const handler of handlers) {
          finalizing = finalizing.flatMap((v) => handler.finalize(v, finalizedComposite)).toProperty();
        }
        return finalizing.map((values) => {
          return FieldState.set(state, { values, errors: FieldError.noErrors });
        });
      })
      .toMap();

    return zipImmutableMap(fieldProps).map((fields) => {
      return CompositeValue.set(finalizedComposite, { fields });
    });
  }

  finalizeSubject(value: FieldValue, owner: EmptyValue | CompositeValue): CompositeValue {
    const sourceValue: CompositeValue = FieldValue.isComposite(value) ? value : createRawComposite(value);

    const ownerSubject = FieldValue.isComposite(owner) ? owner.subject : undefined;
    return CompositeValue.set(sourceValue, {
      subject: generateSubjectByTemplate(this.newSubjectTemplate, ownerSubject, sourceValue),
    });
  }
}

function normalizeDefinitons(rawFields: ReadonlyArray<FieldDefinitionProp>) {
  return Immutable.Map<string, FieldDefinition>().withMutations((result) => {
    for (const raw of rawFields) {
      if (result.has(raw.id)) {
        continue;
      }
      const parsed = normalizeFieldDefinition(raw);
      result.set(parsed.id, parsed);
    }
  });
}

function zipImmutableMap<K, V>(map: Immutable.Map<K, Kefir.Property<V>>): Kefir.Property<Immutable.Map<K, V>> {
  const mapAsArray = map
    .map((kefirValue, key) => {
      return kefirValue.map((value) => ({ key, value }));
    })
    .toArray();

  if (mapAsArray.length > 0) {
    return Kefir.zip(mapAsArray)
      .map((values) =>
        Immutable.Map<K, V>().withMutations((newMap) => {
          for (const { key, value } of values) {
            newMap.set(key, value);
          }
        })
      )
      .toProperty();
  } else {
    return Kefir.constant(Immutable.Map());
  }
}

function createRawComposite(
  sourceValue: FieldValue,
  definitions = Immutable.Map<string, FieldDefinition>(),
  errors = FieldError.noErrors
): CompositeValue {
  return {
    type: CompositeValue.type,
    subject: getSubject(sourceValue),
    definitions,
    fields: definitions.map(fieldInitialState).toMap(),
    errors,
  };
}

function getSubject(value: FieldValue): Rdf.Iri {
  if (FieldValue.isComposite(value)) {
    return value.subject;
  } else if (FieldValue.isAtomic(value)) {
    const node = FieldValue.asRdfNode(value);
    if (node.isIri()) {
      return node;
    }
  }
  return Rdf.iri('');
}

function mergeInitialValues(base: CompositeValue, patch: CompositeValue): CompositeValue {
  if (patch.fields.size === 0) {
    return base;
  }
  return CompositeValue.set(base, {
    fields: base.fields
      .map((state, fieldId) => {
        return patch.fields.get(fieldId, state);
      })
      .toMap(),
  });
}

function reduceFieldValue(
  fieldId: string,
  previous: CompositeValue,
  reducer: (previous: ValuesWithErrors) => ValuesWithErrors
) {
  const fieldState = previous.fields.get(fieldId, FieldState.empty);
  const updatedState = FieldState.set(
    fieldState,
    reducer({
      values: fieldState.values,
      errors: fieldState.errors,
    })
  );
  const fields = previous.fields.set(fieldId, updatedState);
  return CompositeValue.set(previous, { fields });
}

SingleValueInput.assertStatic(CompositeInput);

export default CompositeInput;
