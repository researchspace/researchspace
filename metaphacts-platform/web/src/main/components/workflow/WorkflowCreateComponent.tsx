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
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { listen, trigger } from 'platform/api/events';
import { addNotification } from 'platform/components/ui/notification';
import { WorkflowService, WorkflowData } from 'platform/api/services/WorkflowService';
import { ErrorPresenter } from 'platform/components/ui/notification';
import { Alert } from 'react-bootstrap';

import * as WorkflowEvents from './WorkflowEvents';

export interface WorkflowCreateConfig {
  /**
   * IRI of a workflow definition
   */
  definition: string;

  /**
   * First step of workflow instantiation
   */
  firstStep: string;

  /**
   * IRI of a resource to handled by workflow
   */
  subject?: string;

  /**
   * Unique id to refer to in case of using in couple with event system.
   */
  id?: string;

  /**
   * In that case the body of the component is empty,
   * component listen to 'Workflow.Create' event and
   * fires 'Workflow.Created' event.
   */
  useEventSystem?: boolean;

  /**
   * IRI of the first step assignee (by default unassigned)
   */
  assignee?: string;

  /**
   * Sparql query to construct metadata for worflow instantiation
   * Example:
   * ```
   * metadata-query='CONSTRUCT {
   *   ?metadataIri <http://example.com/hasLanguage>
   *   "english"^^<http://www.w3.org/2001/XMLSchema#string>;
   *   <http://example.com/hasPrice> "1000"^^<http://www.w3.org/2001/XMLSchema#integer> .
   * } WHERE {}
   * ```
   */
  metadataQuery?: string;

  /**
   * URI template to customize worflow IRI generation.
   * `{{UUID}}` placeholder allows to substitute a random UUID.
   */
  newWorkflowIriTemplate?: string;

  /**
   * CSS class for the component
   */
  className?: string;
}

interface State {
  readonly error?: any;
  readonly exists?: boolean;
}

/**
 * Component creates the workflow instantiation for a target resource.
 * There are two modes of using this component:
 * - UI mode - this mode provides user interface with a button to manually crete the instantiation
 * - Event System mode - component listen to the "Workflow.Create" event and creates instantiations
 * in response to the event.
 *
 * Examples:
 * 1) Create workflow using the basic component UI
 * <mp-workflow-create
 *   id='workflow-create-1'
 *   definition='http://example.com/workflow/definition'
 *   first-step='http://example.com/workflow/step/toDo'
 *   resource-iri='http://example.com/resource/example-source-12345'
 *   new-subject-template='http://example.com/workflow-example-{{UUID}}'
 *   metadata-query='CONSTRUCT {
 *     ?subject <http://example.com/hasLanguage>
 *     "english"^^<http://www.w3.org/2001/XMLSchema#string>;
 *     <http://example.com/hasPrice> "1000"^^<http://www.w3.org/2001/XMLSchema#integer>;
 *     <http://example.com/hasTime> "12:45"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
 *     <http://example.com/hasPower> <http://example.com/ability/teleport> .
 *   } WHERE {}'
 *   assignee='http://example.com/assignee-example'>
 * </mp-workflow-create>
 *
 * 2) Create workflow using event system where the event system listen events from a semantic form
 * <!-- a) Create a new entity using Form and fire 'Form.ResourceCreated' event -->
 * <semantic-form
 *   id='semantic-form-example'
 *   post-action='event'
 *   new-subject-template='http://example.com/person-name-{{UUID}}'
 *   fields='[
 *     {
 *       "id": "name",
 *       "label": "Name",
 *       "description": "",
 *       "xsdDatatype": "xsd:string",
 *       "minOccurs": "1",
 *       "maxOccurs": "1",
 *       "selectPattern": "SELECT $value WHERE {$subject rdfs:label $value}",
 *       "insertPattern": "INSERT {$subject rdfs:label $value}WHERE{}"
 *     }
 *   ]'>
 *   <semantic-form-text-input for='name'></semantic-form-text-input>
 *   <button name='submit'>Create</button>
 *   <button name='reset'>Reset</button>
 * </semantic-form>
 *
 * <!-- b) Catch 'Form.ResourceCreated' event and proxy it to the <mp-workflow-create/> -->
 * <mp-event-proxy id='form-resource-created' on-event-type='Form.ResourceCreated'
 *   proxy-event-type='Workflow.Create' proxy-targets='["workflow-form-resource"]'>
 * </mp-event-proxy>
 *
 * <!-- c) Create workflow for the new antity and fire 'Workflow.Created' event -->
 * <mp-workflow-create
 *   id='workflow-form-resource'
 *   first-step='http://example.com/workflow/toDo'
 *   new-workflow-iri-template='http://example.com/workflow-example-{{UUID}}'
 *   definition='http://example.com/workflow/definition'
 *   assignee='http://example.com/person/alice'
 *   use-event-system=true>
 * </mp-workflow-create>
 *
 * <!-- d) Catch 'Workflow.Created' event and proxy it to the <mp-event-target-redirect/> -->
 * <mp-event-proxy id='workflow-proxy' on-event-type='Workflow.SubjectGetInWorkflow'
 *   proxy-event-type='RedirectAction.perform' proxy-targets='["redirect-to-resource"]'>
 * </mp-event-proxy>
 *
 * <!-- e) Redirect to the created resource -->
 * <mp-event-target-redirect
 *   id='redirect-to-resource'
 *   action='redirect'
 * ></mp-event-target-redirect>
 */
export class WorkflowCreateComponent extends Component<WorkflowCreateConfig, State> {
  private readonly cancellation = new Cancellation();
  private queryCancellation = this.cancellation.derive();

  private workflowService = new WorkflowService();

  constructor(props: WorkflowCreateConfig, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    const {subject, id, useEventSystem } = this.props;

    if (!(subject || useEventSystem)) {
      throw new Error(
        'Component is used in the basic mode. You should provide "subject" ' +
        'because it wont be provided via event system.'
      );
    }
    if (useEventSystem && !id) {
      throw new Error(
        'You should provide "id" if you want ' +
        'the component to be used as event target or source.'
      );
    }

    if (useEventSystem) {
      this.initializeEventListener();
    } else {
      this.queryCancellation = this.cancellation.deriveAndCancel(this.queryCancellation);
      this.queryCancellation.map(
        this.workflowService.isWorkflowExist(Rdf.iri(subject))
      ).observe({
        value: exists => this.setState({exists}),
        error: error => this.setState({error})
      });
    }
  }

  private initializeEventListener () {
    const { id } = this.props;
    this.cancellation.map(listen({
      eventType: WorkflowEvents.WorkflowCreate,
      target: id,
    })).observe({
      value: result => {
        if (result.data && result.data.iri) {
          this.createWorkflowInstantiation(result.data.iri);
        } else {
          addNotification({
            level: 'error',
            message: 'Supplied event doesn\'t provide the "iri" parameter',
          });
        }
      },
      error: (error) => this.setState({error})
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private createWorkflowInstantiation(subject: string) {
    const {
      definition, assignee, firstStep,
      metadataQuery, newWorkflowIriTemplate,
      useEventSystem,
    } = this.props;
    const workflowData: WorkflowData = {
      subject: new Rdf.Iri(subject),
      definition: new Rdf.Iri(definition),
      firstStep: new Rdf.Iri(firstStep),
      metadataQuery,
      assignee: new Rdf.Iri(assignee),
      newWorkflowIriTemplate: newWorkflowIriTemplate
    };

    this.queryCancellation = this.cancellation.deriveAndCancel(this.queryCancellation);
    this.queryCancellation.map(
      this.workflowService.isWorkflowExist(workflowData.subject)
    ).flatMap(exists => {
      if (exists) {
        addNotification({
          level: 'error',
          message: `The worflow instantiation for "${subject}" already exists.`
        });
        return Kefir.never<Rdf.Iri>();
      } else {
        return this.workflowService.createWorkflowInstantiation(workflowData);
      }
    }).observe({
      value: workflowIri => {
        addNotification({
          level: 'success',
          message: `The workflow instantiation has been created.`
        });

        if (useEventSystem) {
          trigger({
            eventType: WorkflowEvents.WorkflowCreated,
            source: this.props.id,
            data: { iri: workflowIri.value }
          });
          trigger({
            eventType: WorkflowEvents.SubjectGetInWorkflow,
            source: this.props.id,
            data: { iri: subject }
          });
        }
        this.setState({exists: !useEventSystem, error: undefined});
      },
      error: error => {
        addNotification({
          level: 'error',
          message: `The workflow instantiation hasn\'t been created.`
        });
        this.setState({error});
      }
    });
  }

  render() {
    const {
      className,
      useEventSystem,
      subject,
    } = this.props;

    if (useEventSystem) { return null; }

    const {error, exists} = this.state;

    return useEventSystem ? null :
      <div className={className}>
        <button
          className={'btn btn-success'}
          disabled={exists}
          title={exists ? `Worflow instantiation for "${subject}" already exists.` : 'Create workflow instantiation'}
          onClick={() => {
            this.createWorkflowInstantiation(subject);
          }}>
          Create workflow
        </button>
        {error ? <Alert bsStyle='warning'>
          <ErrorPresenter error={error}></ErrorPresenter>
        </Alert> : null}
    </div>;
  }
}

export default WorkflowCreateComponent;
