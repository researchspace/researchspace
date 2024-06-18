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
import { createElement, cloneElement, Props, ReactNode, Children } from 'react';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';

import { Spinner } from 'platform/components/ui/spinner';

import { FieldDefinitionProp, FieldDefinition, normalizeFieldDefinition } from '../FieldDefinition';
import {
  FieldValue,
  EmptyValue,
  AtomicValue,
  CompositeValue,
  FieldError,
  FieldState,
  DataState,
  mergeDataState,
  ErrorKind,
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

import { InputKind } from './InputCommpons';

import DateObject from 'react-date-object';
import * as GregorianCalendar from 'react-date-object/calendars/gregorian';
import * as JulianCalendar from 'date-object/calendars/cjs/julian';
import * as ArabicCalendar from 'react-date-object/calendars/arabic';
import * as PersianCalendar from 'react-date-object/calendars/persian';
import * as JalaliCalendar from 'react-date-object/calendars/jalali';
import * as IndianCalendar from 'react-date-object/calendars/indian';
import * as GregorianEnLocale from 'react-date-object/locales/gregorian_en';
import * as ArabicEnLocale from 'react-date-object/locales/arabic_en';
import * as PersianEnLocale from 'react-date-object/locales/persian_en';
import * as IndianEnLocale from 'react-date-object/locales/indian_en';

const XSD_DATE_FORMAT = 'YYYY-MM-DD';
const DATE_LABEL_FORMAT = 'YYYY-M-D';

export interface CompositeTimespanState {
  timespanType?: 'day' | 'year' | 'range' | 'unspecified';
  timespanCalendar?: string;
}

export interface CompositeTimespanInputProps extends SingleValueInputProps {
  fields: ReadonlyArray<FieldDefinitionProp>;
  newSubjectTemplate?: string;
  children?: ReactNode;
  dateLabelFormat?: string;
}

type ComponentProps = CompositeTimespanInputProps & Props<CompositeTimespanInput>;

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

/**
 * Form component to select a complex timespan date with calendar and type.
 * 
 * Optional properties:
 * - date-label-format: format string for date label (defined by react-date-object)
 * 
 * Required child elements:
 * - semantic-form-select-input for 'type' with values 'day', 'year', 'range', 'unspecified'
 * - semantic-form-select-input for 'calendar' with values 'gregorian', 'islamic', 'persian', 'jalali', 'indian', 'julian'
 * - semantic-form-calendardate-input for 'date_day'
 * - semantic-form-calendardate-input for 'date_from'
 * - semantic-form-calendardate-input for 'date_until'
 * - semantic-form-text-input for 'label'
 *
 * @example
 * <semantic-form-composite-timespan-input for="date"
 *     new-subject-template="/date"
 *     date-label-format="YYYY MMMM D"
 *     fields="[[fieldDefinitions
 *     label='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_label'
 *     type='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_type'
 *     calendar='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_calendar'
 *     notes='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_notes'
 *     date_day='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_day'
 *     date_from='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_from'
 *     date_until='http://templates.mpiwg-berlin.mpg.de/ismi/fieldDefinition/date_until'
 *     ]]">
 *   <semantic-form-text-input for="label"></semantic-form-text-input>
 *   <semantic-form-select-input for="type"></semantic-form-select-input>
 *   <semantic-form-select-input for="calendar"></semantic-form-select-input>
 *   <semantic-form-calendardate-input for="date_day"></semantic-form-calendardate-input>
 *   <semantic-form-calendardate-input for="date_from" yearstart="true"></semantic-form-calendardate-input>
 *   <semantic-form-calendardate-input for="date_until" yearend="true"></semantic-form-calendardate-input>
 *   <semantic-form-text-input for="notes"></semantic-form-text-input>
 * </semantic-form-composite-timespan-input>
 */
export class CompositeTimespanInput extends SingleValueInput<ComponentProps, CompositeTimespanState> {
  public static readonly inputKind = InputKind.CompositeInput;

  private readonly cancellation = new Cancellation();
  private compositeOperations = this.cancellation.derive();

  private shouldReload = true;
  private compositeState: DataState.Loading | DataState.Ready = DataState.Ready;
  private inputRefs = new Map<string, Array<ChildInput | null>>();
  private inputStates = new Map<string, InputState>();

  constructor(props: ComponentProps, context: any) {
    super(props, context);
    this.state = {
      timespanType: undefined,
      timespanCalendar: undefined
    }
  }

  private getHandler(): CompositeTimespanHandler {
    const { handler } = this.props;
    if (!(handler instanceof CompositeTimespanHandler)) {
      throw new Error('Invalid value handler for CompositeTimespanInput');
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
          // set initial state from child select components
          const typeField = loaded.fields.get('type');
          const typeValue = getSelectValue(typeField);
          const calendarField = loaded.fields.get('calendar');
          const calendarValue = getSelectValue(calendarField);
          const newState = {timespanType: typeValue, timespanCalendar: calendarValue};
          this.setState(newState);
          this.forceUpdateDateFields();
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

    let newValue = reduceFieldValue(def.id, oldValue, reducer);
    if (this.isInputLoading(def.id)) {
      this.inputStates.set(def.id, READY_INPUT_STATE);
    } else {
      this.startValidatingField(def, oldValue, newValue);
    }

    // change state based on child select components
    if (def.id === 'type') {
      const field = newValue.fields.get('type');
      const value = getSelectValue(field);
      if (value !== this.state.timespanType) {
        this.setState({timespanType: value});
        this.updateLabel(newValue, value, this.state.timespanCalendar);
        this.forceUpdateDateFields();
      }
    } else if (def.id === 'calendar') {
      const field = newValue.fields.get('calendar');
      const value = getSelectValue(field);
      if (value !== this.state.timespanCalendar) {
        this.setState({timespanCalendar: value});
        this.updateLabel(newValue, this.state.timespanType, value);
        this.forceUpdateDateFields();
      }
    } else if (def.id.startsWith('date_')) {
      newValue = this.updateLabel(newValue, this.state.timespanType, this.state.timespanCalendar);
    }
    return newValue;
  }

  // update label field from date fields
  private updateLabel(newValue: CompositeValue, type: string, calendar: string): CompositeValue {
    if (type === 'unspecified') return; 
    let timespanLabel = '??';
    const dateLabelFormat = this.props.dateLabelFormat || DATE_LABEL_FORMAT;
    if (type === 'year' || type === 'range') {
      const fromField = newValue.fields.get('date_from');
      const fromXsdDate = getDatePickerValue(fromField);
      const untilField = newValue.fields.get('date_until');
      const untilXsdDate = getDatePickerValue(untilField);
      if (fromXsdDate && untilXsdDate) {
        const fromCalDate = convertToCalendarDate(fromXsdDate, calendar);
        const untilCalDate = convertToCalendarDate(untilXsdDate, calendar);
        if (type === 'year') {
          timespanLabel = fromCalDate.format('YYYY') 
            + ' (' + calendar + ')';
        } else if (type === 'range') {
          timespanLabel = fromCalDate.format(dateLabelFormat) 
            + ' - ' + untilCalDate.format(dateLabelFormat)
            + ' (' + calendar + ')';
        }
      }
    } else if (type === 'day') {
      const dayField = newValue.fields.get('date_day');
      const dayXsdDate = getDatePickerValue(dayField);
      if (dayXsdDate) {
        const dayCalDate = convertToCalendarDate(dayXsdDate, calendar);
        timespanLabel = dayCalDate.format(dateLabelFormat)
            + ' (' + calendar + ')';
      }
    }
    // set label field value
    let labelState = newValue.fields.get('label') as FieldState;
    let labelValue = labelState.values.get(0) as AtomicValue;
    labelValue = AtomicValue.set(labelValue, {value: Rdf.literal(timespanLabel)});
    labelState = FieldState.set(labelState, {values: labelState.values.set(0, labelValue)});
    newValue = CompositeValue.set(newValue, {fields: newValue.fields.set('label', labelState)})
    // set visible label element
    const labelRefs = this.inputRefs.get('label') as ChildInput[];
    for (const ref of labelRefs) {
      ref.inputs.forEach((input) => {
        const textField = input[0];
        textField?.setState({text: timespanLabel});
      });
    }
    return newValue;
  }

  // forceUpdate all date picker components
  private forceUpdateDateFields() {
    this.inputRefs.forEach((refs, key) => {
      if (key.startsWith('date_')) {
        for (const ref of refs) {
          ref?.forceUpdate();
        }
      }
    });
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
    
    // update props of child components
    let childComponents = this.props.children;
    // default mode: day
    let datePickerMode = 'day';
    let datePickerDay = true;
    let datePickerFrom = false;
    let datePickerUntil = false;
    let calendarSelect = true;
    switch (this.state.timespanType) {
      case 'year':
        datePickerMode = 'year';
        datePickerDay = false;
        datePickerFrom = true;
        datePickerUntil = true;
        break;
      case 'range':
        datePickerDay = false;
        datePickerFrom = true;
        datePickerUntil = true;
        break;
      case 'unspecified':
        datePickerDay = false;
        datePickerFrom = false;
        datePickerUntil = false;
        calendarSelect = false;
        break;
    }
    const datePickerCalendar = this.state.timespanCalendar;
    childComponents = Children.map(this.props.children, (child: ReactNode) => {
      const name = child.props.for;
      if (name.startsWith('date_')) {
        if (!(this.state.timespanType && this.state.timespanCalendar)) {
          // render date picker when state is undefined
          return child;
        }
        if ((name === 'date_day' && datePickerDay)
        || (name === 'date_from' && datePickerFrom)
        || (name === 'date_until' && datePickerUntil)) {
          // return clone with modified props
          return cloneElement(child, {
            mode: datePickerMode,
            calendar: datePickerCalendar
          });
        } else {
          // omit unused date picker
          return null;
        }
      } else if (name === 'calendar') {
        if (this.state.timespanType && !calendarSelect) {
          // omit unused calendar select
          return null;
        } else {
          return child;
        }
      } else {
        return child;
      }
    });

    // render child components
    const childElements = renderFields(
      childComponents,
      composite,
      this.getHandler().handlers,
      this.dataStateForField,
      this.onFieldValuesChanged,
      this.onMountInput
    );

    return createElement('div', { className: 'composite-input' }, childElements);
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

  static makeHandler(props: SingleValueHandlerProps<CompositeTimespanInputProps>): CompositeTimespanHandler {
    return new CompositeTimespanHandler(props);
  }
}

class CompositeTimespanHandler implements SingleValueHandler {
  readonly newSubjectTemplate: string | undefined;
  readonly definitions: Immutable.Map<string, FieldDefinition>;
  readonly inputs: Immutable.Map<string, ReadonlyArray<InputMapping>>;
  readonly configurationErrors: Immutable.List<FieldError>;
  readonly handlers: Immutable.Map<string, ReadonlyArray<MultipleValuesHandler>>;

  constructor({ baseInputProps }: SingleValueHandlerProps<CompositeTimespanInputProps>) {
    this.newSubjectTemplate = baseInputProps.newSubjectTemplate;
    this.definitions = normalizeDefinitions(baseInputProps.fields);
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
    // check that years are the same in year mode
    let yearError: string;
    const type = getSelectValue(value.fields.get('type'));
    if (type === 'year') {
      const calendar = getSelectValue(value.fields.get('calendar'));
      const fromIsoDate = getDatePickerValue(value.fields.get('date_from'));
      const fromDate = convertToCalendarDate(fromIsoDate, calendar);
      const untilIsoDate = getDatePickerValue(value.fields.get('date_until'));
      const untilDate = convertToCalendarDate(untilIsoDate, calendar);
      // compare years
      if (fromDate?.year !== untilDate?.year) {
        yearError = "Start and end year must be the same in 'year' mode!";
      }
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
          // add year error
          if (fieldId === 'date_until' && yearError) {
            const fieldError:FieldError = {
              kind: ErrorKind.Input, 
              message: yearError};
            validated = FieldState.set(validated, {errors: validated.errors.push(fieldError)});
          }
          return FieldState.set(state, validated);
        })
        .toMap(),
    });
  }

  finalize(value: FieldValue, owner: EmptyValue | CompositeValue): Kefir.Property<CompositeValue> {
    const finalizedComposite = this.finalizeSubject(value, owner);

    const type = getSelectValue(finalizedComposite.fields.get('type'));

    const fieldProps = finalizedComposite.fields
      .map((state, fieldId) => {
        // remove values of invalid date-type field combinations
        if (type === 'unspecified' && (fieldId.startsWith('date_') || fieldId === 'calendar')) {
          state = FieldState.empty;
        } else if (type === 'day' && (fieldId === 'date_from' || fieldId === 'date_until')) {
          state = FieldState.empty;
        } else if ((type === 'range' || type === 'year') && fieldId === 'date_day') {
          state = FieldState.empty;
        }
        // run normal handlers
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

function normalizeDefinitions(rawFields: ReadonlyArray<FieldDefinitionProp>) {
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

// get current value (i.e. label) from Select field state
function getSelectValue(field: FieldState) {
  return field?.values.first()?.label;
}

// get current value (xsd:Date) from CalendarDatePicker field state
function getDatePickerValue(field: FieldState) {
  return field?.values.first()?.value?.value;
}

// convert isoDate to DateObject in current calendar
function convertToCalendarDate(isoDate: string, calendar: string): DateObject {
  if (!isoDate) return undefined;
  switch (calendar) {
    case 'gregorian':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(GregorianCalendar, GregorianEnLocale);
    case 'islamic':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(ArabicCalendar, ArabicEnLocale);
    case 'persian':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(PersianCalendar, PersianEnLocale);
    case 'jalali':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(JalaliCalendar, PersianEnLocale);
    case 'indian':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(IndianCalendar, IndianEnLocale);
    case 'julian':
      return new DateObject({date: isoDate, format: XSD_DATE_FORMAT}).convert(JulianCalendar, GregorianEnLocale);
  }
}




SingleValueInput.assertStatic(CompositeTimespanInput);

export default CompositeTimespanInput;
