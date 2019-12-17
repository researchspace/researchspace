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
import { Children, ReactNode, cloneElement } from 'react';

import { Component } from 'platform/api/components';

import {
  ResourceEditorFormProps, CompositeValue, FieldDefinition,
  SemanticForm, computeValuePatch, FieldValue, generateSubjectByTemplate,
} from 'platform/components/forms';
import { isValidChild, universalChildren } from 'platform/components/utils';

import * as styles from './EntityForm.scss';
import { Rdf } from 'platform/api/rdf';

export interface EntityFormProps {
  newSubjectTemplate?: string;
  suggestIri?: boolean;
  acceptIriAuthoring?: boolean;
  fields: ReadonlyArray<FieldDefinition>;
  model: CompositeValue;
  onSubmit: (newData: CompositeValue) => void;
  onCancel: () => void;
}

interface State {
  model: CompositeValue;
  suggestIri: boolean;
}

export class EntityForm extends Component<EntityFormProps, State> {
  private initModel: CompositeValue;
  private formRef: SemanticForm;
  constructor(props: EntityFormProps, context) {
    super(props, context);
    const suggestIri = this.props.suggestIri === undefined ?
      this.modelEqualToSuggested(this.props.model) : this.props.suggestIri;
    this.initModel = suggestIri ?
      this.modifyModelsIriBySuggestion(this.props.model) : this.props.model;
    this.state = {model: this.initModel, suggestIri: suggestIri};
  }

  componentWillReceiveProps(nextProps: EntityFormProps) {
    if (this.props.model !== nextProps.model) {
      this.initModel = nextProps.model;
      this.setState({model: this.initModel});
    }
  }

  private mapChildren(children: ReactNode): ReactNode {
    return Children.map(children, child => {
      if (isValidChild(child)) {
        if (child.type === 'button') {
          if (child.props.name === 'reset') {
            return cloneElement(child, {onClick: this.onReset});
          } else if (child.props.name === 'submit') {
            return cloneElement(child, {onClick: this.onSubmit});
          } else if (child.props.name === 'cancel') {
            return cloneElement(child, {onClick: () => this.props.onCancel()});
          }
        }
        if (child.props.children) {
          return cloneElement(child, {}, universalChildren(
            this.mapChildren(child.props.children)));
        }
      }
      return child;
    });
  }

  private onModelUpdate(newModel: CompositeValue) {
    const modelToSet =
      this.state.suggestIri ? this.modifyModelsIriBySuggestion(newModel) : newModel;
    this.setState({model: modelToSet});
  }

  private modifyModelsIriBySuggestion(model: CompositeValue): CompositeValue {
    return {
      ...model,
      subject: generateSubjectByTemplate(
        this.props.newSubjectTemplate,
        undefined,
        { ...model, subject: new Rdf.Iri('')}
      ),
    };
  }

  private modelEqualToSuggested(model: CompositeValue): boolean {
    return generateSubjectByTemplate(
      this.props.newSubjectTemplate,
      undefined,
      { ...model, subject: new Rdf.Iri('')}
    ).value === model.subject.value;
  }

  private onSubmit = () => {
    this.formRef.finalize(this.state.model).observe({
      value: model => {
        this.props.onSubmit(model);
      },
      error: () => this.props.onSubmit(this.state.model),
    });
  }

  private onReset = () => {
    this.setState({model: this.initModel});
  }

  private onChangeIri(e: React.FormEvent<HTMLInputElement>) {
    const target = (e.target as HTMLInputElement);
    const iri = target.value;
    this.setState(prevState => {
        return {
            suggestIri: false,
            model: {
                ...prevState.model,
                subject: new Rdf.Iri(iri),
            }
        };
    });
  }

  private onChangeSuggestingMode() {
    this.setState(prevState => {
      const newSuggestionMode = !prevState.suggestIri;
      const curModel = prevState.model;
        return {
          suggestIri: newSuggestionMode,
          model: newSuggestionMode ? this.modifyModelsIriBySuggestion(curModel) : curModel,
        };
    });
  }

  private renderIri() {
    const {model, suggestIri} = this.state;
    return (
        <div className='semantic-form-input-decorator semantic-form-input-decorator--with-header'>
            <div style={{display: 'flex'}}>
              <label style={{marginLeft: -12}}>IRI</label>
              <label style={{marginLeft: 5, opacity: 0.8}}>
                (Suggest IRI
                  <input
                    type='checkbox'
                    checked={suggestIri}
                    onClick={() => this.onChangeSuggestingMode()}
                  />
                )
              </label>
            </div>
            <input
                className='plain-text-field__text form-control'
                value={model.subject.value}
                onChange={e => this.onChangeIri(e)}
            />
        </div>
    );
  }

  render() {
    const mapped = this.mapChildren(this.props.children);
    return (
      <div className={styles.dialog}>
        <div className={styles.content}>
          {this.props.acceptIriAuthoring ? this.renderIri() : null}
          <SemanticForm
            newSubjectTemplate={this.props.newSubjectTemplate}
            ref={form => this.formRef = form}
            fields={this.props.fields}
            model={this.state.model}
            onLoaded={() => { /* nothing */ }}
            onChanged={model => this.onModelUpdate(model)}>
            {mapped}
          </SemanticForm>
        </div>
      </div>
    );
  }
}
