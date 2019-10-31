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
import * as Kefir from 'kefir';
import { ReactNode, Props } from 'react';
import { Cancellation } from 'platform/api/async';
import { FieldDefinitionProp } from '../FieldDefinition';
import {
  SingleValueInput, SingleValueInputProps, CompositeInput, CompositeInputProps
} from '../inputs';
import { componentHasType, componentDisplayName } from 'platform/components/utils';
import FormSwitchCase, {FormSwitchCaseProps} from './FormSwitchCase';
import {
  FieldValue, DataState, CompositeValue, EmptyValue, ErrorKind
} from '../FieldValues';
import HiddenInput, { HiddenInputProps } from '../inputs/HiddenInput';
import { queryValues } from '../QueryValues';
import { Rdf } from 'platform/api/rdf';
import { generateSubjectByTemplate } from '../FormModel';
import { Spinner } from 'platform/components/ui/spinner';

export interface FormSwitchProps extends SingleValueInputProps {
    fields: ReadonlyArray<FieldDefinitionProp>;
    newSubjectTemplate?: string;
    children?: ReactNode;
    switchOnField?: string;
}

type ComponentProps = FormSwitchProps & Props<FormSwitch>;

interface SwitchCaseType {
  label: string;
  type: Rdf.Iri;
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
 *
 */

export class FormSwitch extends SingleValueInput<ComponentProps, {}> {
  private readonly cancellation = new Cancellation();

  private switchOperations = this.cancellation.derive();
  private fieldValuesMap = new Map<string, FieldValue>();
  private refToInput: CompositeInput | null;
  private typeMap: Immutable.Iterable<string, SwitchCaseType> = Immutable.Map();
  private chosenType: SwitchCaseType;
  private isLoading: boolean;
  private shouldReload = false;

  constructor(props: ComponentProps, context: any) {
    super(props, context);
    this.initializeTypeMap();
    if (FieldValue.isAtomic(props.value)) {
      this.isLoading = true;
    } else {
      this.isLoading = false;
    }
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

  validate(selected: FieldValue): FieldValue {
    return selected;
  }

  finalize(owner: EmptyValue | CompositeValue, value: FieldValue): Kefir.Property<FieldValue> {
    if (!FieldValue.isComposite(value)) {
      return Kefir.constant(value);
    }
    const ownerSubject = FieldValue.isComposite(owner) ? owner.subject : undefined;
    return Kefir.constant(CompositeValue.set(value, {
      subject: generateSubjectByTemplate(undefined, ownerSubject, value),
    }));
  }

  componentDidMount() {
    if (FieldValue.isAtomic(this.props.value)) {
      this.shouldReload = true;
    }
    this.tryLoadSwitch(this.props);
  }

  componentWillReceiveProps(nextProps: ComponentProps) {
    if (this.props.value !== nextProps.value) {
      this.shouldReload = true;
    }
    this.tryLoadSwitch(nextProps);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private tryLoadSwitch(props: ComponentProps) {
    if (props.dataState !== DataState.Ready) {
      return;
    }
    if (this.shouldReload) {
      this.shouldReload = false;
      this.loadSwitch(props);
    }
  }

  private loadSwitch = (props: ComponentProps) => {
    this.switchOperations = this.cancellation.deriveAndCancel(this.switchOperations);
    if (FieldValue.isAtomic(props.value)) {
      const typeDefinition = this.getDefinition(this.typeMap.first());
      if (typeDefinition) {
        this.isLoading = true;
        this.switchOperations.map(
          queryValues(typeDefinition.selectPattern, FieldValue.asRdfNode(props.value) as Rdf.Iri)
        ).observe({
          value: types => {
            const typeSet = Immutable.Set(types.map(type => type.value));
            const foundType = this.typeMap.get(typeSet.first().value);
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
      } else {
        this.props.updateValue(v => FieldValue.replaceError(v, {
          kind: ErrorKind.Configuration,
          message: `Failed find a definition for switch-on-field "${this.props.switchOnField}"`,
        }));
      }
    } else if (this.isLoading) {
      this.isLoading = false;
      this.props.updateValue(v => v);
    }
  }

  private getDefinition(currentType: SwitchCaseType): FieldDefinitionProp | undefined {
    const childrenSwitch = (React.Children.toArray(this.props.children) as
      React.ReactElement<FormSwitchCaseProps>[]);
    for (const child of childrenSwitch) {
      const compositeInput = getCheckedComposite(this.props, child);
      const compositeChildren = (React.Children.toArray(compositeInput.props.children) as
        React.ReactElement<any>[]);
      let definition: FieldDefinitionProp;
      for (const field of compositeInput.props.fields) {
        if (field.id === this.props.switchOnField) {
          definition = field;
        }
      }
      const hiddenInput = getCheckedHiddenChildren(this.props, compositeChildren);
      if (currentType && hiddenInput.props.defaultValue === currentType.type.value) {
        return definition;
      }
    }
    return undefined;
  }

  private initializeTypeMap = () => {
    const typeArray: [string, SwitchCaseType][] = [];
    const children = (React.Children.toArray(this.props.children) as
      React.ReactElement<FormSwitchCaseProps>[]);
    for (const child of children) {
      const compositeInput = getCheckedComposite(this.props, child);
      const compositeChildren = (React.Children.toArray(compositeInput.props.children) as
        React.ReactElement<any>[]);
      const hiddenInput = getCheckedHiddenChildren(this.props, compositeChildren);
      typeArray.push(
        [hiddenInput.props.defaultValue,
        {
          label: child.props.label,
          type: Rdf.iri(hiddenInput.props.defaultValue),
        },
      ]);
    }
    if (typeArray.length !== 0) {
      this.typeMap = Immutable.OrderedMap(typeArray);
      this.chosenType = this.typeMap.first();
    }
  }

  private renderSwitch(currentType: SwitchCaseType) {
    if (this.typeMap.size === 0) {
      return;
    }
    return (
      <div className={`${CLASS_NAME}__content`}>
        <select className={`${CLASS_NAME}__select`}
          onChange={this.selectType}
          value={currentType.type.value}>
          {this.typeMap.map((typeItem, index) => {
            const key = `${typeItem.type}-${index}`;
            return <option
              key={key}
              value={typeItem.type.value}>
                {typeItem.label}
              </option>;
          }).toArray()}
        </select>
      </div>
    );
  }

  private findCurrentCase = (
    currentType: SwitchCaseType
  ): React.ReactElement<CompositeInputProps> => {
    const children = (React.Children.toArray(this.props.children) as
      React.ReactElement<FormSwitchCaseProps>[]);
    for (const child of children) {
      const compositeInput = getCheckedComposite(this.props, child);
      const compositeChildren = (React.Children.toArray(compositeInput.props.children) as
        React.ReactElement<any>[]);
      const hiddenInput = getCheckedHiddenChildren(this.props, compositeChildren);
      if (hiddenInput.props.defaultValue !== currentType.type.value) {
        continue;
      }
      return compositeInput;
    }
    throw new Error('Unknown case');
  }

  private constructCurrentType = (currentType: SwitchCaseType) => {
    if (this.typeMap.size === 0) {
      return;
    }
    const { dataState, definition, updateValue, value } = this.props;
    const transferredProps: Partial<CompositeInputProps> & React.Props<CompositeInput> = {
      value: value,
      dataState: dataState,
      definition: definition,
      updateValue: updateValue,
      key: currentType.type.value,
      ref: v => this.refToInput = v,
    };
    const currentCase = this.findCurrentCase(currentType);
    return React.cloneElement(currentCase, transferredProps);
  }

  private selectType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const previousType = selectCurrentType(this.props, this.typeMap, this.chosenType);
    const nextType = this.typeMap.get(event.target.value);
    this.chosenType = nextType;
    this.fieldValuesMap.set(previousType.type.value, this.props.value);
    this.props.updateValue(() => {
      return this.fieldValuesMap.get(nextType.type.value) || FieldValue.empty;
    });
  }

  render() {
    if (this.isLoading) {
      return <Spinner />;
    }
    const currentType = selectCurrentType(this.props, this.typeMap, this.chosenType);
    const currentCase = this.constructCurrentType(currentType);
    return <div className={CLASS_NAME}>
      {this.renderSwitch(currentType)}
      {currentCase}
    </div>;
  }
}

function getCheckedComposite(
  props: ComponentProps, child: React.ReactElement<FormSwitchCaseProps>
): React.ReactElement<CompositeInputProps>  {
  if (!componentHasType(child, FormSwitchCase)) {
    throw new Error(`Invalid type of component: ${componentDisplayName(child)}`);
  }
  if (React.Children.count(child.props.children) !== 1) {
    const errorMessage = `Expected single input for ` +
    `<semantic-form-composite-input></semantic-form-composite-input> into ` +
    `<semantic-form-switch-case></semantic-form-switch-case>`;
    throw new Error(errorMessage);
  }
  const switchCaseChild = React.Children.only(child.props.children);
  if (!(componentHasType(switchCaseChild, CompositeInput)
    && switchCaseChild.props.for === props.for
  )) {
    throw new Error(`Invalid type of the component "${componentDisplayName(switchCaseChild)}"`);
  }
  return switchCaseChild;
}

function getCheckedHiddenChildren(
  props: ComponentProps, compositeChildren: React.ReactElement<any>[]
): React.ReactElement<HiddenInputProps> {
  const hiddenInputs = compositeChildren.filter((compositeChild: React.ReactElement<any>) => {
    return componentHasType(compositeChild, HiddenInput)
      && compositeChild.props.for === props.switchOnField
      && compositeChild.props.defaultValue;
  });
  if (hiddenInputs.length !== 1) {
    const errorMessage = `Expected single input for ` +
      `<semantic-form-hidden-input for='${props.switchOnField}' ` +
      `default-value='special type'></semantic-form-hidden-input>`;
    throw new Error(errorMessage);
  }
  return hiddenInputs[0];
}

function selectCurrentType(
  props: ComponentProps,
  typeMap: Immutable.Iterable<string, SwitchCaseType>,
  currentType: SwitchCaseType
): SwitchCaseType {
  if (typeMap.size === 0 || !FieldValue.isComposite(props.value)) {
    return currentType;
  }
  const typeFieldState = props.value.fields.get(props.switchOnField);
  if (typeFieldState && typeFieldState.values.size === 1) {
    const valueType = typeFieldState.values.first();
    if (FieldValue.isAtomic(valueType)) {
      const foundType = typeMap.get(valueType.value.value);
      if (foundType) {
        return foundType;
      }
    }
  }
  return currentType;
}

export default FormSwitch;
