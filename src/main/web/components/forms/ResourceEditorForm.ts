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

import { Props, ReactNode, Children, cloneElement, MouseEvent, createElement } from 'react';
import * as Kefir from 'kefir';
import { uniqBy } from 'lodash';
import * as fileSaver from 'file-saver';
import * as moment from 'moment';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { getCurrentResource } from 'platform/api/navigation';
import { Rdf } from 'platform/api/rdf';
import { addNotification } from 'platform/components/ui/notification';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import { BrowserPersistence, isValidChild, componentHasType, universalChildren } from 'platform/components/utils';
import { ErrorNotification } from 'platform/components/ui/notification';
import { listen, trigger } from 'platform/api/events';

import { FieldDefinitionProp } from './FieldDefinition';
import { DataState, FieldValue, FieldError, CompositeValue } from './FieldValues';
import { readyToSubmit } from './FormModel';
import { SemanticForm, SemanticFormProps } from './SemanticForm';
import { ValuePatch, computeValuePatch, applyValuePatch } from './Serialization';

import { TriplestorePersistence, isTriplestorePersistence } from './persistence/TriplestorePersistence';
import { LdpPersistence } from './persistence/LdpPersistence';
import { SparqlPersistence } from './persistence/SparqlPersistence';
import { RawSparqlPersistence } from './persistence/RawSparqlPersistence';
import { SparqlPersistence as SparqlPersistenceClass } from './persistence/SparqlPersistence';
import { RecoverNotification } from './static/RecoverNotification';

import { CompositeInput } from './inputs/CompositeInput';
import * as FormEvents from './FormEvents';
import {
  ResourceEditorFormProps, TriplestorePersistenceConfig, performFormPostAction, getPostActionUrlQueryParams,
} from './ResourceEditorFormConfig';
import { InputKind } from './inputs/InputCommpons';

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
  public static readonly inputKind = InputKind.SemanticForm;

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

    if (this.props.id) {
      this.cancellation.map(
        listen({
          target: this.props.id,
          eventType: FormEvents.FormRemoveResource,
        })
      ).observe({
        value: (event) => {
          if (event.data.iri === this.props.subject) {
            this.onRemove();
          }
        }
      });
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
      const invalidFieldsIds = uniqBy(invalidFields, 'id')
        .map(({ id }) => `"${id}"`)
        .join(', ');
      this.setState({
        error: `The fields [${invalidFieldsIds}] don't have INSERT or DELETE patterns`,
      });
    }
  }

  private validateNestedFormsFields(children: ReactNode): FieldDefinitionProp[] {
    let invalidFields: FieldDefinitionProp[] = [];
    Children.forEach(children, (element) => {
      if (!isValidChild(element)) {
        return;
      }
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
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    }

    const formProps: SemanticFormProps & Props<SemanticForm> = {
      ref: (form: SemanticForm) => {
        this.form = form;
      },
      fields: this.props.fields,
      model: this.state.model || FieldValue.fromLabeled({ value: getSubject(this.props) }),
      newSubjectTemplate: this.props.newSubjectTemplate,
      onLoaded: (loadedModel) => {
        const initialized = this.props.initializeModel ? this.props.initializeModel(loadedModel) : loadedModel;
        this.initialState = {
          model: initialized,
          submitting: false,
          recoveredFromStorage: false,
        };
        const { model, recoveredFromStorage } = this.applyCachedData(this.initialState.model);
        this.setState({ model, recoveredFromStorage, submitting: false });
      },
      onChanged: (model) => {
        this.setState({ model });
      },
      onUpdated: (modelState) => {
        this.setState({ modelState });
        if (this.initialState && modelState === DataState.Ready) {
          this.saveToStorage(this.state.model);
        }
      },
      debug: this.props.debug,
    };
    return createElement(SemanticForm, formProps, this.mapChildren(this.props.children));
  }

  private applyCachedData(model: CompositeValue): { model: CompositeValue; recoveredFromStorage: boolean } {
    const patch = this.loadFromStorage();
    const patched = applyValuePatch(model, patch);
    if (patched === model || !FieldValue.isComposite(patched)) {
      return { model, recoveredFromStorage: false };
    } else {
      return { model: patched, recoveredFromStorage: true };
    }
  }

  private canSubmit() {
    return (
      this.initialState &&
      !this.state.submitting &&
      this.state.modelState === DataState.Ready &&
      readyToSubmit(this.state.model, FieldError.isPreventSubmit)
    );
  }

  private mapChildren = (children: ReactNode): ReactNode => {
    return Children.map(children, (element) => {
      if (!isValidChild(element)) {
        return element;
      }

      if (componentHasType(element, ResourceEditorForm)) {
        // pass nested editor as is to support independent nested record creation
        return element;
      }

      if (element.type === 'button') {
        switch (element.props.name) {
          case 'reset':
            return cloneElement(element, {
              disabled: !this.initialState || this.state.submitting,
              onClick: this.onReset,
            });
          case 'submit':
            return cloneElement(element, {
              disabled: !this.canSubmit(),
              onClick: this.onSubmit,
            });
          case 'delete':
            return cloneElement(element, {
              disabled: !this.canSubmit(),
              onClick: this.onRemove,
            });
          case 'dry-run':
            return cloneElement(element, {
              disabled: !this.canSubmit(),
              onClick: this.onDryRun,
            });
          case 'load-state': {
            let input: HTMLInputElement;
            const setInput = (value: HTMLInputElement) => (input = value);
            return [
              createElement('input', {
                ref: setInput,
                type: 'file',
                style: { display: 'none' },
                onChange: this.onChangeLoadData,
              }),
              cloneElement(element, {
                onClick: () => this.onLoadData(input),
              }),
            ];
          }
          case 'save-state':
            return cloneElement(element, {
              onClick: this.onSaveData,
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
        return cloneElement(element, {}, universalChildren(this.mapChildren(element.props.children)));
      }

      return element;
    });
  };

  private onReset = (e: MouseEvent<HTMLElement>) => {
    // we need to prevent default action because button is inside form and
    // we don't want to submit the form
    e.preventDefault();
    e.stopPropagation();
    this.resetFormData();
  };

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
      this.setState((state) => ({ model: validatedModel, submitting: true }));

      const initialModel = this.initialState.model;
      this.form
        .finalize(this.state.model)
        .flatMap((finalModel) =>
          this.persistence
            .persist(initialModel, finalModel)
            .map(() =>
              this.props.addToDefaultSet ? addToDefaultSet(finalModel.subject, this.props.id) : Kefir.constant(true)
            )
            .map(() => finalModel)
        )
        .observe({
          value: (finalModel) => {
            // only ignore setState() and always reset localStorage and perform post-action
            // event if the form is already unmounted
            this.resetStorage();
            if (!this.unmounted) {
              this.setState({ model: finalModel, submitting: false });
            }
            const isNewSubject =
              !this.initialState.model || CompositeValue.isPlaceholder(this.initialState.model.subject);
            performFormPostAction({
              postAction: this.props.postAction,
              subject: finalModel.subject,
              eventProps: { isNewSubject, sourceId: this.props.id },
              queryParams: getPostActionUrlQueryParams(this.props),
            });
          },
          error: (error) => {
            if (!this.unmounted) {
              this.setState({ submitting: false });
            }
            addNotification({ level: 'error', message: 'Failed to submit the form' }, error);
          },
        });
    } else {
      this.setState((state) => ({ model: validatedModel, submitting: false }));
    }
  };

  private onRemove = () => {
    const itemToRemove = this.initialState.model.subject;
    this.persistence
      .remove(this.initialState.model)
      .observe({
        value: () => {
          performFormPostAction({
            postAction: this.props.postAction,
            subject: itemToRemove,
            eventProps: { isNewSubject: false, isRemovedSubject: true, sourceId: this.props.id },
            queryParams: getPostActionUrlQueryParams(this.props),
          });
        },
        error: () => {}
      })
    ;
  }

  private onDryRun = () => {
    const initialModel = this.initialState.model;
    this.form
      .finalize(this.state.model)
      .flatMap(
        (finalModel) => (this.persistence as SparqlPersistence).dryPersist(initialModel, finalModel)
      ).onValue(
        res => trigger({
          source: this.props.id,
          eventType: FormEvents.FormDryRunResults,
          data: {
            dryRunResults: res,
          },
        })
      );
  }

  private onSaveData = () => {
    const valuePatch: ValuePatch = computeValuePatch(FieldValue.empty, this.state.model);
    const formId = this.props.formId;
    const dataToSave = JSON.stringify({ formId: formId, valuePatch: valuePatch });
    const fileData = new Blob([dataToSave]);
    const fileName = `${formId}-${moment().format()}.json`;

    fileSaver.saveAs(fileData, fileName);
  };

  private onChangeLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event && event.target.files) {
      const currentFile = event.target.files[0];
      event.target.value = '';
      this.cancellation.map(loadTextFileFromInput(currentFile)).observe({
        value: (data) => {
          const loadedData: { formId: string; valuePatch: ValuePatch } = JSON.parse(data);
          if (loadedData.formId === this.props.formId) {
            const patched = applyValuePatch(this.state.model, loadedData.valuePatch);
            this.setState({ model: patched as CompositeValue });
          }
        },
        error: (error) => {
          this.setState({ error });
        },
      });
    }
  };

  private onLoadData = (input: HTMLInputElement) => {
    input.click();
  };

  private computePersistentId(): string {
    return this.getFormId() + ':' + getCurrentResource().value;
  }

  private saveToStorage = (model: CompositeValue): void => {
    if (this.browserPersistenceEnabled() && this.initialState) {
      const patch = computeValuePatch(this.initialState.model, model);
      BROWSER_PERSISTENCE.set(this.computePersistentId(), patch);
    }
  };

  private loadFromStorage = (): ValuePatch => {
    if (this.browserPersistenceEnabled()) {
      try {
        return BROWSER_PERSISTENCE.get(this.computePersistentId());
      } catch (err) {
        console.warn(err);
      }
    }
    return null;
  };

  private resetStorage = (): void => {
    if (this.browserPersistenceEnabled()) {
      BROWSER_PERSISTENCE.remove(this.computePersistentId());
    }
  };

  /**
   * Whether changes should be persisted or recovered from the client-side
   * persistence layer. Disabled by default.
   */
  private browserPersistenceEnabled = (): boolean => {
    return Boolean(this.props.browserPersistence);
  };

  /**
   * Returns a id to be used as identifier for the client-side persistence layer.
   * If no custom formId is set, the current  {@link ResourceContext} will be returned.
   */
  private getFormId = (): string => {
    return this.props.formId ? this.props.formId : getCurrentResource().value;
  };
}


function normalizePersistenceMode(
  persistenceProp:
    | TriplestorePersistenceConfig['type']
    | TriplestorePersistenceConfig
    | TriplestorePersistence
    | undefined,
  repository: string
): TriplestorePersistence {
  if (!persistenceProp) {
    return new LdpPersistence();
  } else if (isTriplestorePersistence(persistenceProp)) {
    return persistenceProp;
  }

  const config =
    typeof persistenceProp === 'string' ? ({ type: persistenceProp } as TriplestorePersistenceConfig) : persistenceProp;

  const configWithRepository = { repository, ...config };
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

function getInvalidFields(fields: ReadonlyArray<FieldDefinitionProp>) {
  return fields.filter((field) => !field.insertPattern || !field.deletePattern);
}

function loadTextFileFromInput(file: File): Kefir.Stream<string> {
  return Kefir.stream((emitter) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      emitter.emit((event.target as FileReader).result as string);
      emitter.end();
    };
    reader.onerror = (event) => {
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
