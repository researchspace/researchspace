/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import * as Kefir from 'kefir';
import * as React from 'react';
import ReactSelect, { Option } from 'react-select';

import { Component } from 'platform/api/components';
import { Rdf, vocabularies } from 'platform/api/rdf';
const { oa } = vocabularies;

import * as Forms from 'platform/components/forms';

import { crmdig } from 'researchspace/data/vocabularies';

import * as Schema from '../model/AnnotationSchema';
import { WorkspaceHandlers, AnnotationBodyType } from '../model/ComponentModel';

import * as styles from './AnnotationEditForm.scss';

export interface AnnotationEditFormProps {
  subject: Rdf.Iri | undefined;
  subjectTemplate: string;
  selectedText: string | undefined;
  annotationBodyType: Rdf.Iri | undefined;
  annotationTypes: ReadonlyMap<string, AnnotationBodyType>;
  handlers: WorkspaceHandlers;
}

interface State {
  formKey?: number;
  selectedBodyType?: Rdf.Iri;
}

export class AnnotationEditForm extends Component<AnnotationEditFormProps, State> {
  private static readonly FIELDS: ReadonlyArray<Forms.FieldDefinition> = [
    Schema.RdfType,
    Schema.OAHasBody,
  ];

  constructor(props: AnnotationEditFormProps, context: any) {
    super(props, context);
    this.state = {
      formKey: 0,
      selectedBodyType: this.props.annotationBodyType,
    };
  }

  componentWillReceiveProps(nextProps: AnnotationEditFormProps) {
    if (!Schema.sameIri(this.props.annotationBodyType, nextProps.annotationBodyType)) {
      this.setState((state): State => ({
        formKey: state.formKey + 1,
        selectedBodyType: nextProps.annotationBodyType,
      }));
    }
  }

  render() {
    const {subject, subjectTemplate, annotationTypes, handlers} = this.props;
    const {formKey, selectedBodyType} = this.state;
    const metadata = selectedBodyType ? annotationTypes.get(selectedBodyType.value) : undefined;
    return (
      <Forms.ResourceEditorForm
        key={formKey}
        fields={AnnotationEditForm.FIELDS}
        subject={subject}
        newSubjectTemplate={subjectTemplate}
        postAction='none'
        persistence={{
          persist: (intialModel, currentModel) => {
            if (!selectedBodyType) {
              return Kefir.constantError<any>(new Error('Missing annotation type'));
            }
            if (Forms.FieldValue.isEmpty(currentModel)) {
              return Kefir.constant(undefined);
            }
            return handlers.persistAnnotation(subject, selectedBodyType, currentModel);
          }
        }}>
        <div className={styles.formContent}>
          {this.props.selectedText ? (
            <div className={styles.selectedFragment}>
              Selected fragment:
              <div className={styles.selectedFragmentText}>{this.props.selectedText}</div>
            </div>
          ) : null}
          {this.renderBodyTypeSelector()}
          <Forms.HiddenInput for={Schema.RdfType.id}
            defaultValues={[
              oa.Annotation.value,
              crmdig.D29_Annotation_Object.value,
            ]}
          />
          <div className={styles.bodyInput}>
            {metadata ? React.cloneElement(metadata.input as any, {renderHeader: false}) : null}
          </div>
        </div>
        <button name='submit'
          className='btn btn-primary'>
          {Schema.sameIri(subject, Schema.PLACEHOLDER_ANNOTATION)
            ? 'Create annotation' : 'Update annotation'}
        </button>
        <button className={`btn btn-default ${styles.cancelButton}`}
          onClick={handlers.cancelEditingAnnotation}>
          Cancel
        </button>
      </Forms.ResourceEditorForm>
    );
  }

  private renderBodyTypeSelector() {
    const {annotationTypes} = this.props;
    const {selectedBodyType} = this.state;

    interface TypeOption extends Option<string> {
      type: AnnotationBodyType;
    }

    const options: TypeOption[] = [];
    annotationTypes.forEach(type => {
      options.push({type, value: type.iri.value, label: type.label});
    });

    const optionRenderer = (option: Option): JSX.Element => {
      const {type} = option as TypeOption;
      return (
        <div>
          {type.iconUrl ? <img className={styles.bodyTypeIcon} src={type.iconUrl} /> : null}
          {type.label}
        </div>
      );
    };

    return (
      <ReactSelect
        clearable={false}
        placeholder='Select annotation type...'
        value={selectedBodyType ? selectedBodyType.value : undefined}
        options={options}
        optionRenderer={optionRenderer}
        valueRenderer={optionRenderer}
        onChange={newValue => {
          if (Array.isArray(newValue) || typeof newValue.value !== 'string') { return; }
          const type = annotationTypes.get(newValue.value);
          this.setState((state): State => ({
            formKey: state.formKey + 1,
            selectedBodyType: type.iri,
          }));
        }}
      />
    );
  }
}
