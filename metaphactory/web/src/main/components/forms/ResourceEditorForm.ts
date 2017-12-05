/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
  Component, Props, ReactNode, Children, cloneElement, MouseEvent, createElement,
} from 'react';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource, refresh, getCurrentResource } from 'platform/api/navigation';
import { BrowserPersistence, isValidChild, universalChildren } from 'platform/components/utils';

import { FieldDefinitionProp } from './FieldDefinition';
import { DataState, FieldValue, FieldError, CompositeValue } from './FieldValues';
import { readyToSubmit } from './FormModel';
import { SemanticForm, SemanticFormProps } from './SemanticForm';
import { ValuePatch, computeValuePatch, applyValuePatch } from './Serialization';

import { TriplestorePersistence } from './persistence/TriplestorePersistence';
import RawSparqlPersistence from './persistence/RawSparqlPersistence';
import LdpPersistence from './persistence/LdpPersistence';
import SparqlPersistence from './persistence/SparqlPersistence';
import { RecoverNotification } from './static/RecoverNotification';

/**
 * @see getPostActionUrlQueryParams().
 */
export interface ResourceEditorFormProps {
  fields: FieldDefinitionProp[];
  /**
   * IRI of instance described by the form.
   * This value will be passed down to all queries as $subject.
   */
  subject?: Rdf.Iri | string;
  /**
   * URI template to customize subject generation.
   *
   * The template allows to reference form values, e.g if there is field A that uniquely
   * identify record, we can specify subject template as `http://collection.bm.com/records/{{A}}`,
   * where A will be substituted with value of the field A.
   *
   * `{{UUID}}` placeholder allows to substitute a random UUID.
   */
  newSubjectTemplate?: string;
  initializeModel?: (model: CompositeValue) => CompositeValue;
  persistence?: TriplestorePersistence | string;
  children?: ReactNode;
  /**
   * Whether intermediate user inputs to the form should
   * be persisted on client-side persistence layer (such as local storage, cookies etc).
   * If undefined or false, the form will neither try persist change
   * nor try to recover on initalization form states from the persistence layer.
   */
  browserPersistence?: boolean;
  /**
   * Optional identifier to be used to recover cached
   * form states from the local storage. By default the current {@link ResourceContext} will
   * be used as identifier. However, if several forms being embedded on a page,
   * unique and static form idenfier need to be assigned manually.
   */
  formId?: string;
  /**
   * Optional post-action to be performed after saving the form.
   * Can be either "none", "reload" or "redirect" (redirects to the subject of the form)
   * or any IRI string to which the form will redirect.
   */
  postAction?: 'none' | 'reload' | 'redirect' | string | ((subject: Rdf.Iri) => void);
  debug?: boolean;
}

interface State {
  readonly model?: CompositeValue;
  readonly modelState?: DataState;
  readonly submitting?: boolean;
  readonly recoveredFromStorage?: boolean;
}

const BROWSER_PERSISTENCE = BrowserPersistence.adapter<ValuePatch>();

/**
 * Form component to create and edit resources represented by input fields.
 *
 * The component supports submitting or reverting the form to the intial
 * state by specifying <button> element as child with the following name attribute:
 *   'reset' - revert form content to intial state.
 *   'submit' - persist form content as new or edited resource.
 *
 * @example
 * <resource-editor-form subject='http://exmaple.com/thing/foo' fields='{[...]}'>
 *   <!-- all the children will be passed down to SemanticForm -->
 *   <plain-text-input for='person-name'></plain-text-input>
 *   <div style='color: blue;'>
 *     <datetimepicker-text-input for='event-date'>
 *     </datetimepicker-text-input>
 *   </div>
 *   <!-- Button's onClick handler binds by 'name' attribute -->
 *   <semantic-form-errors></semantic-form-errors>
 *   <button name='reset' type='button' class='btn btn-default'>Reset</button>
 *   <button name='submit' type='button' class='btn btn-primary'>Submit</button>
 * </resource-editor-form>
 *
 * @example
 *  <!-- enable storing and recovering intermediate inputs from client persistence layer -->
 *  <resource-editor-form
 *  	subject='http://exmaple.com/thing/foo'
 *  	fields='{[...]}'
 *  	browser-persistence=true
 *  >
 *    <semantic-form-recover-notification></semantic-form-recover-notification>
 *    <!-- ... -->
 *  <resource-editor-form>
 *
 *  <!--
 *   custom form identifier for client persistence when using multiple forms on the same page
 *  -->
 *  <resource-editor-form
 *  	subject='http://exmaple.com/thing/foo'
 *  	fields='{[...]}'
 *    browser-persistence=true
 *  	form-id='form123'
 *  >
 *    <semantic-form-recover-notification></semantic-form-recover-notification>
 *    <!-- ... -->
 *  <resource-editor-form>
 */
export class ResourceEditorForm extends Component<ResourceEditorFormProps, State> {
  private initialState: State;
  private persistence: TriplestorePersistence;

  private form: SemanticForm;

  constructor(props: ResourceEditorFormProps) {
    super(props);

    this.persistence = normalizePersistenceMode(this.props.persistence);

    this.state = {
      model: undefined,
      submitting: false,
    };
  }

  public render() {
    const formProps: SemanticFormProps & Props<SemanticForm> = {
      ref: (form: SemanticForm) => { this.form = form; },
      fields: this.props.fields,
      model: this.state.model || FieldValue.fromLabeled({value: getSubject(this.props)}),
      newSubjectTemplate: this.props.newSubjectTemplate,
      onLoaded: loadedModel => {
        const initialized = this.props.initializeModel
          ? this.props.initializeModel(loadedModel) : loadedModel;
        this.initialState = {
          model: initialized,
          submitting: false,
          recoveredFromStorage: false,
        };
        const {model, recoveredFromStorage} = this.applyCachedData(this.initialState.model);
        this.setState({model, recoveredFromStorage, submitting: false});
      },
      onChanged: model => {
        this.setState({model});
      },
      onUpdated: modelState => {
        this.setState({modelState});
        if (this.initialState && modelState === DataState.Ready) {
          this.saveToStorage(this.state.model);
        }
      },
      debug: this.props.debug,
    };
    return createElement(SemanticForm, formProps, this.mapChildren(this.props.children));
  }

  private applyCachedData(
    model: CompositeValue,
  ): { model: CompositeValue; recoveredFromStorage: boolean } {
    const patch = this.loadFromStorage();
    const patched = applyValuePatch(model, patch);
    if (patched === model || !FieldValue.isComposite(patched)) {
      return {model, recoveredFromStorage: false};
    } else {
      return {model: patched, recoveredFromStorage: true};
    }
  }

  private canSubmit() {
    return this.initialState &&
      !this.state.submitting &&
      this.state.modelState === DataState.Ready &&
      readyToSubmit(this.state.model, FieldError.isPreventSubmit);
  }

  private mapChildren = (children: ReactNode): ReactNode => {
    return Children.map(children, element => {
      if (!isValidChild(element)) { return element; }

      if (element.type === ResourceEditorForm) {
        // pass nested editor as is to support independent nested record creation
        return element;
      }

      if (element.type === 'button') {
        switch (element.props.name) {
          case 'reset': return cloneElement(element, {
            disabled: !this.initialState || this.state.submitting,
            onClick: this.onReset,
          });
          case 'submit': return cloneElement(element, {
            disabled: !this.canSubmit(),
            onClick: this.onSubmit,
          });
        }
        return element;
      }

      if (element.type === RecoverNotification) {
        return cloneElement(element, {
          recoveredFromStorage: this.state.recoveredFromStorage,
          discardRecoveredData: () => this.resetFormData(),
        });
      }

      // need to map recursively through all children to find also deep nested
      // buttons (i.e. in tabs) or editors
      if ('children' in element.props) {
        return cloneElement(element, {}, universalChildren(
          this.mapChildren(element.props.children)));
      }

      return element;
    });
  }

  private onReset = (e: MouseEvent<HTMLElement>) => {
    // we need to prevent default action because button is inside form and
    // we don't want to submit the form
    e.preventDefault();
    e.stopPropagation();
    this.resetFormData();
  }

  private resetFormData() {
    let state = this.initialState;
    if (this.props.initializeModel) {
      state = {
        model: this.props.initializeModel(state.model),
        submitting: false,
        recoveredFromStorage: false,
      };
    }

    this.resetStorage();
    this.setState(state);
  }

  private onSubmit = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const validatedModel = this.form.validate(this.state.model);
    if (readyToSubmit(validatedModel, FieldError.isPreventSubmit)) {
      this.setState(state => ({model: validatedModel, submitting: true}));

      const initialModel = this.initialState.model;
      const finalModel = this.form.finalize(this.state.model);
      this.persistence.persist(initialModel, finalModel).observe({
        value: () => {
          this.resetStorage();
          this.performPostAction(finalModel.subject);
        },
        error: err => console.error(err),
      });
    } else {
      this.setState(state => ({model: validatedModel, submitting: false}));
    }
  }

  private computePersistentId(): string {
    return this.getFormId() + ':' + getCurrentResource().value;
  }

  private saveToStorage = (model: CompositeValue): void => {
    if (this.browserPersistenceEnabled() && this.initialState) {
      const patch = computeValuePatch(this.initialState.model, model);
      BROWSER_PERSISTENCE.set(this.computePersistentId(), patch);
    }
  }

  private loadFromStorage = (): ValuePatch => {
    if (this.browserPersistenceEnabled()) {
      try {
        return BROWSER_PERSISTENCE.get(this.computePersistentId());
      } catch (err) {
        console.warn(err);
      }
    }
    return null;
  }

  private resetStorage = (): void => {
    if (this.browserPersistenceEnabled()) {
      BROWSER_PERSISTENCE.remove(this.computePersistentId());
    }
  }

  /**
   * Whether changes should be persisted or recovered from the client-side
   * persistence layer. Disabled by default.
   */
  private browserPersistenceEnabled = (): boolean =>  {
    return Boolean(this.props.browserPersistence);
  }

  /**
   * Returns a id to be used as identifier for the client-side persistence layer.
   * If no custom formId is set, the current  {@link ResourceContext} will be returned.
   */
  private getFormId = (): string => {
    return this.props.formId ? this.props.formId : getCurrentResource().value;
  }

  /**
   * Performs either a reload (default) or an redirect after the form as been submited
   * and the data been saved.
   * TODO should be moved outside when separating the components
   */
  private performPostAction = (subject: Rdf.Iri): void => {
    if (this.props.postAction === 'none') { return; }

    if (!this.props.postAction || this.props.postAction === 'reload') {
      refresh();
    } else if (this.props.postAction === 'redirect') {
      navigateToResource(
        subject,
        getPostActionUrlQueryParams(this.props)
      ).onValue(v => v);
    } else if (typeof this.props.postAction === 'function') {
      this.props.postAction(subject);
    } else {
      navigateToResource(
        Rdf.iri(this.props.postAction),
        getPostActionUrlQueryParams(this.props)
      ).onValue(v => v);
    }
  }
}

function normalizePersistenceMode(
  persistenceProp: TriplestorePersistence | string
): TriplestorePersistence {
  let persistence = persistenceProp;
  if (typeof persistence === 'string') {
    persistence = getPersistenceMode(persistence);
  }
  return persistence || LdpPersistence;
}

function getPersistenceMode(persistenceMode: string): TriplestorePersistence | undefined {
  switch (persistenceMode) {
    case 'client-side-sparql': return RawSparqlPersistence;
    case 'ldp': return LdpPersistence;
    case 'sparql': return SparqlPersistence;
  }
  return undefined;
}

/**
 * Returns the current subject as {@link Rdf.Iri} by guessing
 * from the supplied properties. Will return <> if undefined.
 */
function getSubject(props: ResourceEditorFormProps): Rdf.Iri {
  let subjectIri = props.subject;
  if (typeof subjectIri === 'string') {
    subjectIri = Rdf.iri(subjectIri);
  }
  return subjectIri || Rdf.iri('');
}

const POST_ACTION_QUERY_PARAM_PREFIX = 'urlqueryparam';

/**
 * Extracts user-defined `urlqueryparam-<KEY>` query params from
 * a form configuration to provide them on post action navigation.
 */
function getPostActionUrlQueryParams(props: ResourceEditorFormProps) {
  const params: { [paramKey: string]: string } = {};

  for (const key in props) {
    if (Object.hasOwnProperty.call(props, key)) {
      if (key.indexOf(POST_ACTION_QUERY_PARAM_PREFIX) === 0) {
        const queryKey = key.substring(POST_ACTION_QUERY_PARAM_PREFIX.length).toLowerCase();
        params[queryKey] = props[key];
      }
    }
  }

  return params;
}

export default ResourceEditorForm;
