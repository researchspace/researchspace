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
import * as Immutable from 'immutable';
import { Cancellation } from 'platform/api/async';
import { FieldDefinition, normalizeFieldDefinition } from '../FieldDefinition';
import {
  SingleValueInput, SingleValueInputProps, SingleValueHandler, SingleValueHandlerProps,
  CompositeInput, CompositeInputProps
} from '../inputs';
import { componentHasType, componentDisplayName } from 'platform/components/utils';
import FormSwitchCase, {FormSwitchCaseProps} from './FormSwitchCase';
import {
  FieldValue, DataState, CompositeValue, EmptyValue, ErrorKind
} from '../FieldValues';
import HiddenInput, { HiddenInputProps } from '../inputs/HiddenInput';
import { queryValues } from '../QueryValues';
import { Rdf } from 'platform/api/rdf';
import { Spinner } from 'platform/components/ui/spinner';

export interface FormSwitchProps extends SingleValueInputProps {
  switchOnField: string;
  children: React.ReactElement<FormSwitchCaseProps>;
}

const CLASS_NAME = 'form-switch';

/**
 * The component FormSwitch allows the end users to select different forms depending
 * on the one type of an object, but with different realizes. For example: There is
 * an object which has a type "event". Events for an artefact: repatriation, sale,
 * excavation, theft, ect. Every event has an own realise.
 *
 * "general-switch-type" - the field which define a general type of switch i.e.
 * define a type of each composite-input.
 *
 * "switch-on-field=switch-case-type" - the field which define types
 * of switch cases. This is a service field. It works only with
 * "default-value=iri:special-type" of hidden-input.
 *
 * "label" - label for a list of types.
 *
 * @example
 * <semantic-form-switch for='{general-switch-type}'
 *  switch-on-field='switch-case-type'>
 *    <semantic-form-switch-case label='case label 1'>
 *      <semantic-form-composite-input
 *        for='{general-switch-type}'
 *        new-subject-template='template'
 *        fields='[{fieldDefinitions}]'>
 *        <semantic-form-hidden-input for='{switch-case-type}'
 *          default-value='http://www.example.com/spec-type-1'>
 *        </semantic-form-hidden-input>
 *        ... child inputs ...
 *      </semantic-form-composite-input>
 *    </semantic-form-switch-case>
 *    <semantic-form-switch-case label='case label 2'>
 *      <semantic-form-composite-input
 *        for='{general-switch-type}'
 *        new-subject-template='template'
 *        fields='[{fieldDefinitions}]'>
 *        <semantic-form-hidden-input for='{switch-case-type}'
 *          default-value='http://www.example.com/spec-type-2'>
 *        </semantic-form-hidden-input>
 *          ... another child inputs ...
 *        </semantic-form-composite-input>
 *      </semantic-form-switch-case>
 *  </semantic-form-switch>
 */
export class FormSwitch extends SingleValueInput<FormSwitchProps, {}> {
  private readonly cancellation = new Cancellation();

  private switchOperations = this.cancellation.derive();
  private fieldValuesMap = new Map<string, FieldValue>();
  private refToInput: CompositeInput | null;
  private chosenType: SwitchCaseType;
  private isLoading: boolean;
  private shouldReload = false;

  constructor(props: FormSwitchProps, context: any) {
    super(props, context);
    this.chosenType = this.getHandler().cases.first();
    this.isLoading = FieldValue.isAtomic(props.value);
  }

  private getHandler(): FormSwitchHandler {
    if (!(this.props.handler instanceof FormSwitchHandler)) {
      throw new Error('Invalid value handler for FormSwitch');
    }
    return this.props.handler;
  }

  dataState(): DataState {
    if (this.isLoading) {
      return DataState.Loading;
    }
    if (this.refToInput) {
      return this.refToInput.dataState();
    }
    return DataState.Ready;
  }

  componentDidMount() {
    if (FieldValue.isAtomic(this.props.value)) {
      this.shouldReload = true;
    }
    this.tryLoadSwitch(this.props);
  }

  componentWillReceiveProps(nextProps: FormSwitchProps) {
    if (this.props.value !== nextProps.value) {
      this.shouldReload = true;
    }
    this.tryLoadSwitch(nextProps);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private tryLoadSwitch(props: FormSwitchProps) {
    if (props.dataState !== DataState.Ready) {
      return;
    }
    if (this.shouldReload) {
      this.shouldReload = false;
      this.loadSwitch(props);
    }
  }

  private loadSwitch(props: FormSwitchProps) {
    this.switchOperations = this.cancellation.deriveAndCancel(this.switchOperations);
    if (FieldValue.isAtomic(props.value)) {
      const node = FieldValue.asRdfNode(props.value);
      const handler = this.getHandler();
      if (!node.isIri()) {
        this.props.updateValue(v => FieldValue.replaceError(v, {
          kind: ErrorKind.Loading,
          message: `Cannot choose a switch case for non-IRI value ${node}`,
        }));
      } else if (!handler.typeDefinition) {
        this.props.updateValue(v => FieldValue.replaceError(v, {
          kind: ErrorKind.Configuration,
          message: `Failed find a definition for switch-on-field "${this.props.switchOnField}"`,
        }));
      } else {
        this.isLoading = true;
        this.switchOperations.map(
          queryValues(handler.typeDefinition.selectPattern, node)
        ).observe({
          value: types => {
            const typeSet = Immutable.Set(types.map(type => type.value));
            const foundType = handler.cases.find(caseType => typeSet.has(caseType.type));
            if (foundType) {
              this.isLoading = false;
              this.chosenType = foundType;
            }
            this.props.updateValue(v => {
              return foundType ? v : FieldValue.replaceError(v, {
                kind: ErrorKind.Loading,
                message:
                  `Cannot choose an switch case for set of types ` +
                  types.map(t => t.value.toString()).join(', '),
              });
            });
          },
        });
      }
    } else if (this.isLoading) {
      this.isLoading = false;
      this.props.updateValue(v => v);
    }
  }

  render() {
    if (this.isLoading) {
      return <Spinner />;
    }
    const {value} = this.props;
    const handler = this.getHandler();
    const selectedCase = handler.selectCaseForValue(value, this.chosenType);
    return <div className={CLASS_NAME}>
      {this.renderSwitch(selectedCase)}
      {this.renderCase(selectedCase)}
    </div>;
  }

  private renderSwitch(currentType: SwitchCaseType) {
    const handler = this.getHandler();
    if (handler.cases.size === 0) {
      return;
    }
    return (
      <div className={`${CLASS_NAME}__content`}>
        <select className={`${CLASS_NAME}__select`}
          onChange={this.onChangeCaseType}
          value={currentType.type.value}>
          {handler.cases.toArray().map(caseType => (
            <option key={caseType.type.value}
              value={caseType.type.value}>
              {caseType.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  private onChangeCaseType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const {value} = this.props;
    const handler = this.getHandler();
    const previousType = handler.selectCaseForValue(value, this.chosenType);
    const nextType = handler.cases.get(event.target.value);
    this.chosenType = nextType;
    this.fieldValuesMap.set(previousType.type.value, this.props.value);
    this.props.updateValue(() => {
      return this.fieldValuesMap.get(nextType.type.value) || FieldValue.empty;
    });
  }

  private renderCase(caseType: SwitchCaseType): JSX.Element {
    const handler = this.getHandler();
    if (handler.cases.size === 0) {
      return;
    }
    const {dataState, definition, updateValue, value} = this.props;
    const transferredProps: Partial<CompositeInputProps> & React.Props<CompositeInput> = {
      value: value,
      handler: caseType.handler,
      dataState: dataState,
      definition: definition,
      updateValue: makeAttachingDiscriminatorUpdater(updateValue, caseType.type),
      key: caseType.type.value,
      ref: this.onCaseInputMount,
    };
    return React.cloneElement(caseType.composite, transferredProps);
  }

  private onCaseInputMount = (input: CompositeInput | null) => {
    this.refToInput = input;
  }

  static makeHandler(props: SingleValueHandlerProps<FormSwitchProps>): SingleValueHandler {
    return new FormSwitchHandler(props);
  }
}

/**
 * Creates a field updater function which ensures that field value always has discriminator.
 */
function makeAttachingDiscriminatorUpdater(
  baseUpdateValue: SingleValueInputProps['updateValue'],
  discriminator: Rdf.Node
): SingleValueInputProps['updateValue'] {
  return reducer => {
    baseUpdateValue(previous => {
      const updated = reducer(previous);
      return FieldValue.isComposite(updated)
        ? CompositeValue.set(updated, {discriminator})
        : updated;
    });
  };
}

class FormSwitchHandler implements SingleValueHandler {
  readonly switchOnField: string;
  readonly typeDefinition: FieldDefinition | undefined;
  readonly cases: Immutable.OrderedMap<string, SwitchCaseType>;

  constructor(props: SingleValueHandlerProps<FormSwitchProps>) {
    this.switchOnField = props.baseInputProps.switchOnField;
    this.cases = computeCases(props);
    this.typeDefinition = this.getTypeDefinition();
  }

  private getTypeDefinition() {
    for (const field of this.cases.first().composite.props.fields) {
      if (field.id === this.switchOnField) {
        return normalizeFieldDefinition(field);
      }
    }
    return undefined;
  }

  selectCaseForValue(value: FieldValue, defaultCase: SwitchCaseType) {
    if (this.cases.size === 0 || !FieldValue.isComposite(value) || !value.discriminator) {
      return defaultCase;
    }
    const foundType = this.cases.get(value.discriminator.value);
    if (!foundType) {
      console.warn(
        'Trying to render form switch value with unknown discriminator: ' + value.discriminator
      );
    }
    return foundType || defaultCase;
  }

  validate(value: FieldValue): FieldValue {
    if (!FieldValue.isComposite(value)) {
      return SingleValueInput.defaultHandler.validate(value);
    }
    const caseType = this.selectCaseForValue(value, this.cases.first());
    return caseType.handler.validate(value);
  }

  finalize(value: FieldValue, owner: EmptyValue | CompositeValue) {
    if (!FieldValue.isComposite(value)) {
      return SingleValueInput.defaultHandler.finalize(value, owner);
    }
    const caseType = this.selectCaseForValue(value, this.cases.first());
    return caseType.handler.finalize(value, owner);
  }
}

interface SwitchCaseType {
  readonly type: Rdf.Iri;
  readonly label: string;
  readonly handler: SingleValueHandler;
  readonly composite: React.ReactElement<CompositeInputProps>;
}

function computeCases(
  {definition, baseInputProps}: SingleValueHandlerProps<FormSwitchProps>
): Immutable.OrderedMap<string, SwitchCaseType> {
  return Immutable.OrderedMap<string, SwitchCaseType>().withMutations(cases => {
    React.Children.forEach(baseInputProps.children, child => {
      if (!componentHasType(child, FormSwitchCase)) {
        const childType = typeof child === 'object'
          ? (child as React.ReactElement<unknown>).type : undefined;
        throw new Error(`Invalid type of component: ${childType || typeof child}`);
      }
      const caseInput = assertCaseCompositeInput(definition.id, child);
      const switchedOnInput = findSwitchedOnHiddenInput(
        baseInputProps.switchOnField, caseInput.props.children
      );
      const caseKey = switchedOnInput.props.defaultValue;
      cases.set(caseKey, {
        type: Rdf.iri(caseKey),
        label: child.props.label,
        handler: SingleValueInput.getHandlerOrDefault(caseInput.type as any, {
          definition,
          baseInputProps: caseInput.props,
        }),
        composite: caseInput,
      });
    });
  });
}

function assertCaseCompositeInput(
  targetFieldName: string, child: React.ReactElement<FormSwitchCaseProps>
): React.ReactElement<CompositeInputProps>  {
  if (React.Children.count(child.props.children) !== 1) {
    throw new Error(`Expected only a single child for <semantic-form-switch-case>`);
  }
  const caseChild = React.Children.only(child.props.children);
  if (!componentHasType(caseChild, CompositeInput)) {
    throw new Error(`Expected a single <semantic-form-composite-input> as a child`);
  }
  if (caseChild.props.for !== targetFieldName) {
    throw new Error(
      `Expected child <semantic-form-composite-input> to have property ref='${targetFieldName}'`
    );
  }
  return caseChild;
}

function findSwitchedOnHiddenInput(
  switchedOnFieldName: string,
  compositeChildren: React.ReactNode
): React.ReactElement<HiddenInputProps> {
  let hiddenInput: React.ReactElement<HiddenInputProps> | undefined;
  let foundMultiple = false;
  React.Children.forEach(compositeChildren, child => {
    if (componentHasType(child, HiddenInput)) {
      if (child.props.for === switchedOnFieldName && child.props.defaultValue) {
        foundMultiple = hiddenInput !== undefined;
        hiddenInput = child;
      }
    }
  });
  if (!hiddenInput || foundMultiple) {
    const errorMessage = `Expected single input for ` +
      `<semantic-form-hidden-input for='${switchedOnFieldName}' ` +
      `default-value='special type'></semantic-form-hidden-input>`;
    throw new Error(errorMessage);
  }
  return hiddenInput;
}

SingleValueInput.assertStatic(FormSwitch);

export default FormSwitch;
