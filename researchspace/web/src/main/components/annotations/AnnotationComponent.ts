/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

import {
  DOM as D, createFactory, createElement,
  MouseEvent, KeyboardEvent
} from 'react';
import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { navigateToResource, refresh, navigationConfirmation } from 'platform/api/navigation';
import {
  factory as AnnotationTextEditor, component as AnnotationTextEditorComponent
} from './AnnotationTextEditorComponent';
import {
  LdpAnnotationService, Annotation, RdfaLink,
} from '../../services/LDPAnnotationService';
import {
  Error, Alert, AlertType, AlertConfig,
} from 'platform/components/ui/alert';
import { TemplateItem } from 'platform/components/ui/template';

import '../../scss/annotation-component.scss';

/* create factories */
const Input = createFactory(ReactBootstrap.FormControl);
const Button = createFactory(ReactBootstrap.Button);


const ANNOTATION_EDITOR_REF = 'annotation-editor';

interface State {
  target: Data.Maybe<Rdf.Iri>
  label?: string
  initText?: string
  submitDisabled?: boolean
  alert: Data.Maybe<AlertConfig>
  initalizationError: Data.Maybe<string>
}

interface Props {
  annotationTarget?: string
  annotationToEdit?: string
  metadata?: string
  readOnly?: boolean,
  rdfaRelationQueryConfig: any
  dropTemplateConfig: Array<any>
  // After submitting new annotation component will reload page (navigateToNew = false)
  // or navigate to new resource (if true)
  navigateToNew?: boolean
}

export class AnnotationComponentClass extends Component<Props, State> {
  private navigationListenerUnsubscribe?: () => void;

  constructor(props, context) {
    super(props, context);
    if (props.readOnly === true && props.annotationToEdit === undefined) {
      throw 'readOnly can be used only with annotationToEdit';
    }
    this.state = {
      target: maybe.Nothing<Rdf.Iri>(),
      alert: maybe.Nothing<AlertConfig>(),
      initalizationError: maybe.Nothing<string>(),
    };
  }

  isEditMode() {
    return this.props.annotationToEdit ? true : false;
  }

  isNavigateToNew() {
    return typeof this.props.navigateToNew === 'undefined' ? true : this.props.navigateToNew;
  }

  componentDidMount() {
    if (!this.props.readOnly) {
      this.navigationListenerUnsubscribe =
        navigationConfirmation('Changes you made to Semantic Narrative will not be saved!');
    }
  }

  componentWillUnmount() {
    if (this.navigationListenerUnsubscribe) {
      this.navigationListenerUnsubscribe();
    }
  }

  componentWillMount() {
    if (this.props.annotationTarget && this.props.annotationToEdit) {
      this.setState(state => {
        state.initalizationError = maybe.Just(
          `Wrong configuration: Only annotationTarget or
            annotationToEdit can be set at the same time.`
        );
        return state;
      });
    } else if (this.props.annotationTarget) {
      this.setState(state => {
        state.target = maybe.Just(Rdf.iri(this.props.annotationTarget.replace(/<|>/g, '')));
        return state;
      });
    } else if (this.props.annotationToEdit) {
      LdpAnnotationService.getAnnotation(
        Rdf.iri(this.props.annotationToEdit.replace(/<|>/g, ''))
      ).onValue((annotation: Annotation) => {
        this.setState(state => {
          state.target = maybe.fromNullable(annotation.target);
          state.label = annotation.label;
          state.initText = annotation.html;
          return state;
        });
      });
    }
  }

  render() {
    if (this.state.initalizationError.isJust) {
      return createElement(TemplateItem, {template: {source: this.state.initalizationError.get()}});
    }
    return D.div({className: 'annotation-component'},
      this.props.readOnly === true ?
        D.h1({}, this.state.label) :
        Input({
          className: 'annotation-component__label-field',
          type: 'text',
          ref: 'annotation-label',
          placeholder: 'Title',
          onChange: (e) => {
            const newValue = (e.target as any).value;
            this.setState(state => { state.label = newValue; return state; });
          },
          value: this.state.label ? this.state.label : '',
        }),
      AnnotationTextEditor({
        ref: ANNOTATION_EDITOR_REF,
        readOnly: this.props.readOnly === true,
        annotationIri: this.props.annotationToEdit ?
          Rdf.iri(this.props.annotationToEdit.replace(/<|>/g, '')) :
          null,
        initText: this.state.initText,
        rdfaRelationQueryConfig: this.props.rdfaRelationQueryConfig,
        dropTemplateConfig: this.props.dropTemplateConfig,
      }),
      this.props.readOnly === true ?
        null :
        D.div({},
          createElement(Alert, this.state.alert.map(config => config).getOrElse({ alert: AlertType.NONE, message: '' })),
          Button({
            className: 'annotation-component__submit-button',
            bsSize: 'small',
            bsStyle: 'default',
            onClick: this.onSubmit,
          }, this.isEditMode() ? 'Update' : 'Submit')
        )
    );
  }

  getEditorValue(): string {
    const editor = this.refs[ANNOTATION_EDITOR_REF] as AnnotationTextEditorComponent;
    return editor.getValue();
  }

  onSubmit = (e: MouseEvent<ReactBootstrap.Button>): void => {
    e.preventDefault();
    e.stopPropagation();
    const editor = this.refs[ANNOTATION_EDITOR_REF] as AnnotationTextEditorComponent;
    const conditions = [
      {condition: this.state.label, message: 'Title should not be empty'},
      {condition: !editor.isEmpty(), message: 'Body should not be empty'},
      {condition: editor.allRdfaRelationsAreSet(), message: 'All semantic blocks should have RDFa rel attribute set'},
    ];
    let messages = [];
    for (let i = 0; i < conditions.length; ++i) {
      if (!conditions[i].condition) {
        messages.push(conditions[i].message);
      }
    }
    if (messages.length) {
      this.setState(state => {
        state.alert = maybe.Just({ alert: AlertType.DANGER, message: messages.join('. ') });
        return state;
      });
      return;
    }

    const annotation: Annotation = {
      target: this.state.target.getOrElse(null),
      label: this.state.label,
      html: editor.getValue(),
      rdfa: editor.getRdfaLinks(),
      metadata: this.props.metadata,
    };

    if (this.isEditMode()) {
      LdpAnnotationService.updateAnnotation(
        Rdf.iri(this.props.annotationToEdit.replace(/<|>/g, '')), annotation
      ).onValue(annotationUri =>
        refresh()
      ).onError(err => {
        this.setState(state => {
          state.alert = maybe.Just({ alert: AlertType.DANGER, message: err.response.text });
          return state;
        });
      });
    } else {
      LdpAnnotationService.addAnnotation(
        annotation
      ).onValue(annotationUri =>
        this.isNavigateToNew() ? navigateToResource(annotationUri).onValue(v => v) : refresh()
      ).onError(err => {
        this.setState(state => {
          state.alert = maybe.Just({ alert: AlertType.DANGER, message: err.response.text });
          return state;
        });
      });
    }
  }
}

export type component = AnnotationComponentClass;
export const component = AnnotationComponentClass;
export const factory = createFactory(AnnotationComponentClass);
export default component;
