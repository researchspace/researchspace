/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import * as React from 'react';
import { Children, ReactNode, cloneElement } from 'react';

import { Component } from 'platform/api/components';

import {
  CompositeValue,
  FieldDefinition,
  SemanticForm,
  generateSubjectByTemplate,
  wasIriGeneratedByTemplate,
} from 'platform/components/forms';
import { isValidChild, universalChildren } from 'platform/components/utils';

import * as styles from './EntityForm.scss';
import { Rdf } from 'platform/api/rdf';

export interface EntityFormProps {
  newSubjectTemplate?: string;
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
    const isIriGeneratedByTemplate = this.modelEqualToSuggested(this.props.model);
    this.initModel = this.props.model;
    this.state = {
      model: this.initModel,
      suggestIri: Boolean(this.props.acceptIriAuthoring) && isIriGeneratedByTemplate,
    };
  }

  componentWillReceiveProps(nextProps: EntityFormProps) {
    if (this.props.model !== nextProps.model) {
      this.initModel = nextProps.model;
      this.setState({ model: this.initModel });
    }
  }

  private mapChildren(children: ReactNode): ReactNode {
    return Children.map(children, (child) => {
      if (isValidChild(child)) {
        if (child.type === 'button') {
          if (child.props.name === 'reset') {
            return cloneElement(child, { onClick: this.onReset });
          } else if (child.props.name === 'submit') {
            return cloneElement(child, { onClick: this.onSubmit });
          } else if (child.props.name === 'cancel') {
            return cloneElement(child, { onClick: () => this.props.onCancel() });
          }
        }
        if (child.props.children) {
          return cloneElement(child, {}, universalChildren(this.mapChildren(child.props.children)));
        }
      }
      return child;
    });
  }

  private onModelUpdate(newModel: CompositeValue) {
    const modelToSet =
      this.props.acceptIriAuthoring && this.state.suggestIri ? this.modifyModelsIriBySuggestion(newModel) : newModel;
    this.setState({ model: modelToSet });
  }

  private modifyModelsIriBySuggestion(model: CompositeValue): CompositeValue {
    if (this.modelEqualToSuggested(model)) {
      return model;
    }
    return {
      ...model,
      subject: generateSubjectByTemplate(this.props.newSubjectTemplate, undefined, {
        ...model,
        subject: new Rdf.Iri(''),
      }),
    };
  }

  private modelEqualToSuggested(model: CompositeValue): boolean {
    return wasIriGeneratedByTemplate(model.subject.value, this.props.newSubjectTemplate, undefined, {
      ...model,
      subject: new Rdf.Iri(''),
    });
  }

  private onSubmit = () => {
    this.formRef.finalize(this.state.model).observe({
      value: (model) => {
        this.props.onSubmit(model);
      },
      error: () => this.props.onSubmit(this.state.model),
    });
  };

  private onReset = () => {
    this.setState({ model: this.initModel });
  };

  private onChangeIri(e: React.FormEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    const iri = target.value;
    this.setState((prevState) => {
      return {
        suggestIri: false,
        model: {
          ...prevState.model,
          subject: new Rdf.Iri(iri),
        },
      };
    });
  }

  private onChangeSuggestingMode() {
    this.setState((prevState) => {
      const newSuggestionMode = !prevState.suggestIri;
      const curModel = prevState.model;
      return {
        suggestIri: newSuggestionMode,
        model: newSuggestionMode ? this.modifyModelsIriBySuggestion(curModel) : curModel,
      };
    });
  }

  private renderIri() {
    const { model, suggestIri } = this.state;
    return (
      <div className="semantic-form-input-decorator semantic-form-input-decorator--with-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Resource IRI</label>
          <label style={{ marginLeft: 5, fontWeight: 'normal' }}>
             - suggest IRI
            <input style={{ marginLeft: 5 }} type="checkbox" checked={suggestIri} onClick={() => this.onChangeSuggestingMode()} />
          </label>
        </div>
        <input
         style={{ marginBottom: 15 }}
          className="plain-text-field__text form-control"
          value={model.subject.value}
          onChange={(e) => this.onChangeIri(e)}
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
            ref={(form) => (this.formRef = form)}
            fields={this.props.fields}
            model={this.state.model}
            onLoaded={() => {
              /* nothing */
            }}
            onChanged={(model) => this.onModelUpdate(model)}
          >
            {mapped}
          </SemanticForm>
        </div>
      </div>
    );
  }
}
