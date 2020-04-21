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
import * as React from 'react';
import ReactSelect from 'react-select';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { WorkflowService, WorkflowState, WorkflowStep, WorkflowAssignee } from 'platform/api/services/WorkflowService';
import { ErrorNotification, addNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import * as styles from './WorkflowManagerComponent.scss';

enum Status {
  Loading,
  Updating,
  Ready,
}

export interface Props {
  /**
   * Workflow instantiation IRIs
   */
  iris: Array<string>;
  /**
   * Workflow definition IRI
   */
  definition: string;
  /**
   * Prevent changing workflow parameters.
   */
  readonly?: boolean;
}

interface State {
  workflowState?: WorkflowState;
  steps?: ReadonlyArray<WorkflowStep>;
  assignees?: ReadonlyArray<WorkflowAssignee>;
  error?: any;
  status?: Status;
}

/**
 * Component manages workflow instantiations
 *
 * @example
 * <mp-workflow-manager
 *  iris='["http://example.com/workflow/instance"]'
 *  definition='http://example.com/workflow/definition'>
 * </mp-workflow-manager>
 */
export class WorkflowManagerComponent extends Component<Props, State> {
  private readonly cancellation = new Cancellation();
  private loadingCancellation = this.cancellation.derive();
  private assigneeQueryingCancellation = this.cancellation.derive();

  private originalWorkflowGraphs = new Map<string, Rdf.Graph>();
  private initialWorkflowState = WorkflowState.empty;
  private workflowService = new WorkflowService();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      workflowState: WorkflowState.empty,
      steps: [],
      assignees: [],
      status: Status.Ready,
    };
  }

  componentDidMount() {
    this.fetchWorkflowInstantiations(this.props);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props !== nextProps) {
      this.loadingCancellation.cancelAll();
      this.initialWorkflowState = WorkflowState.empty;
      this.originalWorkflowGraphs.clear();
      this.setState({
        workflowState: WorkflowState.empty,
        steps: [],
        assignees: [],
        status: Status.Ready,
      });
      this.fetchWorkflowInstantiations(nextProps);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { workflowState: curWorkflowState, assignees: curAssigness } = this.state;
    if (curWorkflowState.step && !curWorkflowState.step.equals(prevState.workflowState.step)) {
      this.updateAssignees();
    }
    if (curAssigness !== prevState.assignees) {
      this.setState(({ workflowState, assignees }) => {
        const assignee = assignees.find(({ iri }) => iri.equals(workflowState.assignee));
        return { workflowState: { ...workflowState, assignee: assignee ? assignee.iri : undefined } };
      });
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private fetchWorkflowInstantiations(props: Props) {
    const { iris, definition } = props;
    if (!iris.length) {
      return;
    }

    this.setState({ status: Status.Loading });
    const workflowStatesQuerying = iris.map((iri) =>
      this.workflowService.queryWorkflowInstantiation(iri).map((graph) => {
        this.originalWorkflowGraphs.set(iri, graph);
        return this.workflowService.deserializeWorkflowState(Rdf.iri(iri), graph);
      })
    );
    const workflowStatesAndStepsQuerying = Kefir.zip(workflowStatesQuerying).flatMap((stats) => {
      const workflowState = stats.length === 1 ? stats[0] : WorkflowState.empty;
      this.initialWorkflowState = workflowState;
      return this.workflowService
        .queryWorkflowSteps({
          definition,
          currentStep: workflowState.step,
        })
        .map((steps) => ({ steps, workflowState }));
    });
    this.loadingCancellation = this.cancellation.deriveAndCancel(this.loadingCancellation);
    this.loadingCancellation.map(workflowStatesAndStepsQuerying).observe({
      value: ({ steps, workflowState }) =>
        this.setState({ workflowState, steps, error: undefined, status: Status.Ready }),
      error: (error) => this.setState({ error, status: Status.Ready }),
    });
  }

  private updateAssignees() {
    this.setState({ status: Status.Loading });
    const { workflowState, steps } = this.state;
    const newStep = steps.find(({ iri }) => iri.equals(workflowState.step));
    const assigneeQuery = newStep ? newStep.assigneeQuery : undefined;
    if (!assigneeQuery) {
      this.setState({ assignees: [], status: Status.Ready });
      return;
    }
    this.assigneeQueryingCancellation = this.cancellation.deriveAndCancel(this.assigneeQueryingCancellation);
    this.assigneeQueryingCancellation
      .map(
        this.workflowService.queryWorkflowAssignees({
          query: assigneeQuery,
          newStep: workflowState.step,
          workflowInstantiations: this.props.iris.map(Rdf.iri),
        })
      )
      .observe({
        value: (assignees) => this.setState({ assignees, status: Status.Ready }),
        error: (error) => this.setState({ error, status: Status.Ready }),
      });
  }

  private renderStepSelect() {
    const {
      workflowState: { step },
      steps,
      status,
    } = this.state;
    const options = steps.map(({ iri, label }) => ({ value: iri.value, label }));
    return (
      <div className={styles.state}>
        <label>Step</label>
        <ReactSelect
          value={step ? step.value : ''}
          options={options}
          onChange={(option: { value: string } | undefined) =>
            this.setState(
              (prevState): State => {
                const newState = option ? Rdf.iri(option.value) : undefined;
                return { workflowState: { ...prevState.workflowState, step: newState } };
              }
            )
          }
          disabled={this.props.readonly || status !== Status.Ready}
        />
      </div>
    );
  }

  private renderAssigneeSelect() {
    const {
      workflowState: { assignee },
      assignees,
      status,
    } = this.state;
    const options = assignees.map(({ iri, label }) => ({ value: iri.value, label }));
    return (
      <div className={styles.assignee}>
        <label>Assignee</label>
        <ReactSelect
          value={assignee ? assignee.value : ''}
          options={options}
          onChange={(option: { value: string } | undefined) =>
            this.setState(
              (prevState): State => {
                const newAssignee = option ? Rdf.iri(option.value) : undefined;
                return { workflowState: { ...prevState.workflowState, assignee: newAssignee } };
              }
            )
          }
          disabled={this.props.readonly || status !== Status.Ready}
        />
      </div>
    );
  }

  private onSubmit = () => {
    this.setState({ status: Status.Updating });
    const workflowsUpdating = this.props.iris.map((iri) => {
      const { workflowState } = this.state;
      const originalGraph = this.originalWorkflowGraphs.get(iri);
      return this.workflowService.updateWorkflowInstantiation({
        workflowIri: Rdf.iri(iri),
        originalGraph,
        workflowState,
      });
    });
    this.cancellation.map(Kefir.zip(workflowsUpdating)).observe({
      value: () => {
        this.setState({ status: Status.Ready });
        addNotification({
          level: 'success',
          message: 'The workflow instantiations has been updated.',
        });
        this.fetchWorkflowInstantiations(this.props);
      },
      error: (error) => {
        console.error(error);
        this.setState({ status: Status.Ready });
        addNotification({
          level: 'error',
          message: 'Error occurred while updating the workflow instantiations.',
        });
      },
    });
  };

  render() {
    const { workflowState, error, status } = this.state;
    if (error) {
      return <ErrorNotification errorMessage={error} />;
    }
    const workflowStateHasChanged = !WorkflowState.isEqual(this.initialWorkflowState, workflowState);
    return (
      <div className={styles.workflow}>
        {this.renderStepSelect()}
        {this.renderAssigneeSelect()}
        {!this.props.readonly ? (
          <button
            type="button"
            className={`btn btn-success ${styles.submitButton}`}
            disabled={!workflowState.step || !workflowStateHasChanged || status !== Status.Ready}
            onClick={this.onSubmit}
          >
            Assign
          </button>
        ) : null}
        {!this.props.readonly && workflowStateHasChanged ? (
          <button
            type="button"
            className={`btn text-danger ${styles.resetButton}`}
            onClick={() => this.setState({ workflowState: this.initialWorkflowState })}
            disabled={status !== Status.Ready}
          >
            <small>
              <i className="fa fa-times" /> reset
            </small>
          </button>
        ) : null}

        {status === Status.Loading ? <Spinner className={styles.spinner} /> : null}
      </div>
    );
  }
}

export default WorkflowManagerComponent;
