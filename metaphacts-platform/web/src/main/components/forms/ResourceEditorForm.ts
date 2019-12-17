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

import {
  Props, ReactNode, Children, cloneElement, MouseEvent, createElement,
} from 'react';
import * as Kefir from 'kefir';
import { uniqBy } from 'lodash';
import * as fileSaver from 'file-saver';
import * as moment from 'moment';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { navigateToResource, refresh, getCurrentResource } from 'platform/api/navigation';
import { Rdf } from 'platform/api/rdf';
import { addNotification } from 'platform/components/ui/notification';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import {
  BrowserPersistence, isValidChild, componentHasType, universalChildren
} from 'platform/components/utils';
import { ErrorNotification } from 'platform/components/ui/notification';
import { trigger } from 'platform/api/events';

import { FieldDefinitionProp } from './FieldDefinition';
import { DataState, FieldValue, FieldError, CompositeValue } from './FieldValues';
import { readyToSubmit } from './FormModel';
import { SemanticForm, SemanticFormProps } from './SemanticForm';
import { ValuePatch, computeValuePatch, applyValuePatch } from './Serialization';

import {
  TriplestorePersistence, isTriplestorePersistence
} from './persistence/TriplestorePersistence';
import { LdpPersistence, LdpPersistenceConfig } from './persistence/LdpPersistence';
import { SparqlPersistence, SparqlPersistenceConfig } from './persistence/SparqlPersistence';
import {
  RawSparqlPersistence, RawSparqlPersistenceConfig
} from './persistence/RawSparqlPersistence';
import { SparqlPersistence as SparqlPersistenceClass } from './persistence/SparqlPersistence';
import { RecoverNotification } from './static/RecoverNotification';

import { CompositeInput } from './inputs/CompositeInput';
import * as FormEvents from './FormEvents';

export type PostAction = (
  'none' | 'reload' | 'redirect' | 'event' | string | ((subject: Rdf.Iri) => void)
);

/**
 * @see getPostActionUrlQueryParams().
 */
export interface ResourceEditorFormProps {
  fields: ReadonlyArray<FieldDefinitionProp>;
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
  persistence?:
    TriplestorePersistenceConfig['type'] |
    TriplestorePersistenceConfig |
    TriplestorePersistence;
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
  postAction?: PostAction;
  debug?: boolean;
  /**
   * Used as source id for emitted events.
   */
  id?: string;
  /**
   * `true` if persisted component should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean;
}

export type TriplestorePersistenceConfig =
  | LdpPersistenceConfig
  | SparqlPersistenceConfig
  | RawSparqlPersistenceConfig;

interface State {
  readonly model?: CompositeValue;
  readonly modelState?: DataState;
  readonly submitting?: boolean;
  readonly recoveredFromStorage?: boolean;
  readonly error?: string;
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
 * This functionality can be used to backup form data,
 * to clone forms and to create multiple similar forms
 * without read access to the repository.
 *   'load-state' - load file from disk.
 *   'save-state' - save file to disk.
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
 *   <button name='load-state' type='button' class='btn btn-info'>Load to file</button>
 *   <button name='save-state' type='button' class='btn btn-info'>Save to file</button>
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

  private readonly cancellation = new Cancellation();
  private unmounted = false;

  constructor(props: ResourceEditorFormProps, context) {
    super(props, context);

    // TODO: add ability to use non-default repository to fetch and persist data
    this.persistence = normalizePersistenceMode(this.props.persistence, 'default');

    this.state = {
      model: undefined,
      submitting: false,
    };
  }

  componentDidMount() {
    if (this.persistence instanceof SparqlPersistenceClass) {
      this.validateFields();
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
    this.unmounted = true;
  }

  private validateFields() {
    const invalidFields = [
      ...getInvalidFields(this.props.fields),
      ...this.validateNestedFormsFields(this.props.children),
    ];
    if (invalidFields.length) {
      const invalidFieldsIds = uniqBy(invalidFields, 'id').map(({id}) => `"${id}"`).join(', ');
      this.setState({
        error: `The fields [${invalidFieldsIds}] don't have INSERT or DELETE patterns`,
      });
    }
  }

  private validateNestedFormsFields(children: ReactNode): FieldDefinitionProp[] {
    let invalidFields: FieldDefinitionProp[] = [];
    Children.forEach(children, element => {
      if (!isValidChild(element)) { return; }
      if (componentHasType(element, CompositeInput)) {
        invalidFields = invalidFields.concat(getInvalidFields(element.props.fields));
      }
      if (element.props.children) {
        const invalidNestedFormsFields = this.validateNestedFormsFields(element.props.children);
        invalidFields = invalidFields.concat(invalidNestedFormsFields);
      }
    });
    return invalidFields;
  }

  public render() {
    if (this.state.error) {
      return createElement(ErrorNotification, {errorMessage: this.state.error});
    }

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

      if (componentHasType(element, ResourceEditorForm)) {
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
          case 'load-state': {
            let input: HTMLInputElement;
            const setInput = (value: HTMLInputElement) => input = value;
            return [
              createElement('input', {
                ref: setInput,
                type: 'file',
                style: {display: 'none'},
                onChange: this.onChangeLoadData
              }),
              cloneElement(element, {
                onClick: () => this.onLoadData(input)
              })
            ];
          }
          case 'save-state': return cloneElement(element, {
            onClick: this.onSaveData
          });
        }
        return element;
      }

      if (componentHasType(element, RecoverNotification)) {
        return cloneElement(element, {
          recoveredFromStorage: this.state.recoveredFromStorage,
          discardRecoveredData: () => this.resetFormData(),
        });
      }

      // need to map recursively through all children to find also deep nested
      // buttons (i.e. in tabs) or editors
      if (element.props.children) {
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
      this.form.finalize(this.state.model).flatMap(finalModel =>
        this.persistence.persist(initialModel, finalModel)
          .map(() =>
            this.props.addToDefaultSet
              ? addToDefaultSet(finalModel.subject, this.props.id)
              : Kefir.constant(true)
          )
          .map(() => finalModel)
      ).observe({
        value: finalModel => {
          // only ignore setState() and always reset localStorage and perform post-action
          // event if the form is already unmounted
          this.resetStorage();
          if (!this.unmounted) {
            this.setState({model: finalModel, submitting: false});
          }
          const isNewSubject =
            !this.initialState.model ||
            CompositeValue.isPlaceholder(this.initialState.model.subject);
          performFormPostAction({
            postAction: this.props.postAction,
            subject: finalModel.subject,
            eventProps: {isNewSubject, sourceId: this.props.id},
            queryParams: getPostActionUrlQueryParams(this.props),
          });
        },
        error: error => {
          if (!this.unmounted) {
            this.setState({submitting: false});
          }
          addNotification({level: 'error', message: 'Failed to submit the form'}, error);
        },
      });
    } else {
      this.setState(state => ({model: validatedModel, submitting: false}));
    }
  }

  private onSaveData = () => {
    const valuePatch: ValuePatch = computeValuePatch(FieldValue.empty, this.state.model);
    const formId = this.props.formId;
    const dataToSave = JSON.stringify({formId: formId, valuePatch: valuePatch});
    const fileData = new Blob([dataToSave]);
    const fileName = `${formId}-${moment().format()}.json`;

    fileSaver.saveAs(fileData, fileName);
  }

  private onChangeLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event && event.target.files) {
      const currentFile = event.target.files[0];
      event.target.value = '';
      this.cancellation.map(
        loadTextFileFromInput(currentFile)
      ).observe({
        value: (data) => {
          const loadedData: {formId: string, valuePatch: ValuePatch} = JSON.parse(data);
          if (loadedData.formId === this.props.formId) {
            const patched = applyValuePatch(this.state.model, loadedData.valuePatch);
            this.setState({model: patched as CompositeValue});
          }
        },
        error: (error) => {
          this.setState({error});
        }
      })
    }
  }

  private onLoadData = (input: HTMLInputElement) => {
    input.click();
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
}

  /**
   * Performs either a reload (default) or a redirect after the form has been submited
   * and the data been saved. Alsow can trigger the events:
   * - FormEvents.FormResourceCreated
   * - FormEvents.FormResourceUpdate
   * if the action is 'event'
   * if the action is 'none' nothing happen
   * TODO should be moved outside when separating the components
   */
  export function performFormPostAction(parameters: {
    postAction: PostAction;
    subject: Rdf.Iri;
    eventProps: {isNewSubject: boolean, sourceId: string};
    queryParams?: { [paramKey: string]: string },
  }) {
    const {postAction = 'reload', subject, eventProps, queryParams} = parameters;
    if (postAction === 'none') { return; }

    if (postAction === 'reload') {
      refresh();
    } else if (postAction === 'redirect') {
      navigateToResource(
        subject,
        queryParams
      ).onValue(v => v);
    } else if (postAction === 'event') {
      if (!eventProps.sourceId) {
        throw new Error('If you want use postAction \'event\', you have to define the id as well.');
      }
      if (eventProps.isNewSubject) {
        trigger({
          eventType: FormEvents.FormResourceCreated,
          source: eventProps.sourceId,
          data: {iri: subject.value}
        });
      } else {
        trigger({
          eventType: FormEvents.FormResourceUpdated,
          source: eventProps.sourceId,
          data: {iri: subject.value}
        });
      }
      return;
    } else if (typeof postAction === 'function') {
      postAction(subject);
    } else {
      navigateToResource(Rdf.iri(postAction), queryParams).onValue(v => v);
    }
  }

function normalizePersistenceMode(
  persistenceProp:
    TriplestorePersistenceConfig['type'] |
    TriplestorePersistenceConfig |
    TriplestorePersistence |
    undefined,
  repository: string
): TriplestorePersistence {
  if (!persistenceProp) {
    return new LdpPersistence();
  } else if (isTriplestorePersistence(persistenceProp)) {
    return persistenceProp;
  }

  const config = typeof persistenceProp === 'string'
    ? {type: persistenceProp} as TriplestorePersistenceConfig
    : persistenceProp;

  const configWithRepository = {repository, ...config};
  switch (configWithRepository.type) {
    case 'sparql':
      return new SparqlPersistence(configWithRepository);
    case 'client-side-sparql':
      return new RawSparqlPersistence(configWithRepository);
    case 'ldp':
      return new LdpPersistence(configWithRepository);
    default: {
      const unknownConfig = configWithRepository as TriplestorePersistenceConfig;
      console.warn(`Unknown from persistence type '${unknownConfig.type}', using LDP as fallback`);
      return new LdpPersistence();
    }
  }
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
export function getPostActionUrlQueryParams(props: ResourceEditorFormProps) {
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

function getInvalidFields(fields: ReadonlyArray<FieldDefinitionProp>) {
  return fields.filter(field => !field.insertPattern || !field.deletePattern);
}

function loadTextFileFromInput(file: File): Kefir.Stream<string> {
  return Kefir.stream(emitter => {
    const reader = new FileReader();
    reader.onload = (event) => {
      emitter.emit((event.target as FileReader).result as string);
      emitter.end();
    };
    reader.onerror = event => {
      emitter.error(event);
      emitter.end();
    };
    reader.readAsText(file);
    return () => {
      if (reader.readyState === 1 /* LOADING */) {
        reader.abort();
      }
    };
  });
}

export default ResourceEditorForm;
