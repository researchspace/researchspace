/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { Button, Col, ControlLabel, Form, FormControl, FormGroup, Radio, Row } from 'react-bootstrap';
import * as moment from 'moment';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as Maybe from 'data.maybe';

import { Component, SemanticContextProvider } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { BuiltInEvents, listen, trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async/Cancellation';
import { addNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import { rdfs } from 'platform/api/rdf/vocabularies';
import { crminf } from 'platform/data/vocabularies';

import { loadAssertion } from '../AssertionsStore';
import {
  Argument,
  ArgumentsBelief,
  ArgumentType,
  BeliefAdoption,
  Inference,
  Observation,
  BeliefAdoptionType,
  InferenceType,
  ObservationType,
} from '../ArgumentsApi';
import { loadArgumentsForAssertion, removeArgument, saveArgument } from '../ArgumentsStore';
import { ExistingBeliefView } from './ExistingBeliefView';

import { ObservationComponent, State as ObservationComponentState } from './ObservationComponent';
import { BeliefAdoptionComponent, State as BeliefAdoptionComponentState } from './BeliefAdoptionComponent';
import { InferenceMakingComponent, State as InferenceMakingComponentState } from './InferenceMakingComponent';

import * as PremiseEvents from './PremiseEvents';

import * as styles from './PremiseComponent.scss';

export interface PremiseComponentConfig {
  /**
   * Unique ID of the component.
   */
  id?: string;
  /**
   * Assertion IRI.
   */
  assertion: string;
  /**
   * SPARQL ASK query is used to check that evidences are acceptable.
   */
  acceptEvidenceQuery?: string;
  /**
   * SPARQL SELECT query returns logic types. Expects the '?logic' and '?label' projection variables.
   */
  logicTypeQuery?: string;
  /**
   * Custom templates of assertion based beliefs.
   */
  assertionBasedBeliefTemplate?: string;
  /**
   * Custom templates of field based beliefs.
   */
  fieldBasedBeliefTemplate?: string;
}

interface Props extends PremiseComponentConfig {
  onChangeArguments?: (newArguments: ReadonlyArray<Argument>) => void;
}

enum Status {
  Loading,
  Saving,
}

interface State {
  assertionIri?: Rdf.Iri;
  premises?: ReadonlyArray<Argument>;
  initialPremises?: ReadonlyArray<Argument>;
  addingPremise?: boolean;
  newArgumentType?: ArgumentType;
  editingArgumentIndex?: number;
  status?: Status;
}

export class PremiseComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    acceptEvidenceQuery: `ASK {}`,
    logicTypeQuery: `SELECT ?logic ?label {
      ?logic a ${crminf.I3_Inference_Logic} .
      ?logic ${rdfs.label} ?label .
    }`,
  };

  private readonly cancellation = new Cancellation();

  constructor(props: PremiseComponentConfig, context: any) {
    super(props, context);
    this.state = {
      assertionIri: props.assertion ? Rdf.iri(props.assertion) : undefined,
      premises: [],
      status: Status.Loading,
    };
  }

  componentDidMount() {
    if (this.state.assertionIri) {
      this.loadArguments();
    } else {
      this.setState({ status: undefined });
    }
    this.listenToEvents();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { onChangeArguments } = this.props;
    const { premises } = this.state;
    if (premises !== prevState.premises && onChangeArguments) {
      onChangeArguments(premises);
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private loadArguments() {
    const { id: source } = this.props;
    const { assertionIri } = this.state;
    trigger({ source, eventType: BuiltInEvents.ComponentLoading });
    this.cancellation.map(loadArgumentsForAssertion(assertionIri)).observe({
      value: (premises) => {
        this.setState({
          premises: premises,
          initialPremises: [...premises],
        });
        trigger({ source, eventType: BuiltInEvents.ComponentLoaded });
      },
      error: (error) => {
        console.error(error);
      },
      end: () => this.setState({ status: undefined }),
    });
  }

  private listenToEvents() {
    const { id: target } = this.props;
    listen({ eventType: PremiseEvents.SaveArguments, target }).onValue(() => this.saveArguments());
    listen({ eventType: PremiseEvents.AddArgument, target }).onValue(() =>
      this.setState({ addingPremise: true, newArgumentType: ObservationType })
    );
  }

  private saveArguments() {
    const { id } = this.props;
    const { assertionIri, premises, initialPremises, status } = this.state;
    if (status === Status.Saving || !assertionIri) {
      return;
    }
    this.setState({ status: Status.Saving });
    trigger({ source: id, eventType: PremiseEvents.ArgumentsSaving });
    this.cancellation
      .map(loadAssertion(assertionIri))
      .flatMap((assertion) => {
        const beliefs = assertion.beliefs.map(({ iri }) => iri.getOrElse(undefined));
        return saveArguments(premises, initialPremises, beliefs);
      })
      .observe({
        value: (premises) => {
          trigger({
            source: id,
            eventType: PremiseEvents.ArgumentsSaved,
            data: { assertionIri: assertionIri.value },
          });
          addNotification({
            level: 'success',
            message: 'Arguments have been saved successfully!',
          });
          this.setState({ premises, initialPremises: [...premises] });
        },
        error: (error) => {
          console.error(error);
          addNotification({
            level: 'error',
            message: 'Something went wrong during saving the arguments!',
          });
        },
        end: () => this.setState({ status: undefined }),
      });
  }

  private editArgument = (argument: Argument) => {
    this.setState({
      editingArgumentIndex: _.findIndex(this.state.premises, (arg) => arg === argument),
    });
  };

  private removeArgument = (argument: Argument) => {
    this.setState(
      (prevState: State): State => {
        const filteredPremises = _.filter(prevState.premises, (a) => a !== argument);
        return { premises: filteredPremises };
      }
    );
  };

  private argumentFrame = (props: { argument: Argument; title: string; children?: React.ReactNode }) => (
    <Form>
      <FormGroup>
        <ControlLabel>Premise</ControlLabel>
        <FormControl.Static>{props.title}</FormControl.Static>
      </FormGroup>
      <FormGroup>
        <ControlLabel>Title</ControlLabel>
        <FormControl.Static>{props.argument.title}</FormControl.Static>
      </FormGroup>
      {props.argument.note ? (
        <FormGroup>
          <ControlLabel>Description</ControlLabel>
          <FormControl.Static>{props.argument.note}</FormControl.Static>
        </FormGroup>
      ) : null}
      {props.children}
      <Button
        bsSize="sm"
        bsClass="btn btn-sm btn-default pull-right"
        style={{ marginLeft: 10 }}
        onClick={() => this.removeArgument(props.argument)}
      >
        Remove Premise
      </Button>
      <Button bsSize="sm" bsClass="btn btn-sm btn-default pull-right" onClick={() => this.editArgument(props.argument)}>
        Edit Premise
      </Button>
      <div className="clearfix" />
    </Form>
  );

  private renderObservationArgument = (argument: Observation) => (
    <this.argumentFrame argument={argument} title="Observation">
      <FormGroup>
        <ControlLabel>Place</ControlLabel>
        <FormControl.Static>
          <SemanticContextProvider repository="default">
            <ResourceLinkComponent uri={argument.place.value} />
          </SemanticContextProvider>
        </FormControl.Static>
      </FormGroup>
      <FormGroup>
        <ControlLabel>Date</ControlLabel>
        <FormControl.Static>{moment(argument.date.value).format('LL')}</FormControl.Static>
      </FormGroup>
    </this.argumentFrame>
  );

  private renderBeliefAdoptionArgument = (argument: BeliefAdoption) => {
    const { assertionBasedBeliefTemplate, fieldBasedBeliefTemplate } = this.props;
    return (
      <this.argumentFrame argument={argument} title="Adoption">
        <Row>
          <Col md={4}>
            <ExistingBeliefView
              belief={argument.belief}
              assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}
              fieldBasedBeliefTemplate={fieldBasedBeliefTemplate}
            />
          </Col>
        </Row>
      </this.argumentFrame>
    );
  };

  private renderInferenceArgument = (argument: Inference) => {
    const { assertionBasedBeliefTemplate, fieldBasedBeliefTemplate } = this.props;
    return (
      <this.argumentFrame argument={argument} title="Inference">
        <FormGroup>
          <ControlLabel>Logic Type</ControlLabel>
          <FormControl.Static>
            <SemanticContextProvider repository="assets">
              <ResourceLinkComponent uri={argument.logicType.value} />
            </SemanticContextProvider>
          </FormControl.Static>
        </FormGroup>
        <FormGroup>
          <ControlLabel>Evidence</ControlLabel>
          <Row className={styles.evidenceList}>
            {argument.premises.map((premise) => (
              <Col md={4} className={styles.evidenceList}>
                <ExistingBeliefView
                  belief={premise}
                  assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}
                  fieldBasedBeliefTemplate={fieldBasedBeliefTemplate}
                />
              </Col>
            ))}
          </Row>
        </FormGroup>
      </this.argumentFrame>
    );
  };

  private renderPremiseComponent = (argument: Argument) => {
    switch (argument.argumentType) {
      case ObservationType:
        return this.renderObservationArgument(argument);
      case BeliefAdoptionType:
        return this.renderBeliefAdoptionArgument(argument);
      case InferenceType:
        return this.renderInferenceArgument(argument);
    }
  };

  private cancelNewArgument = () => {
    this.setState({
      addingPremise: false,
      newArgumentType: undefined,
      editingArgumentIndex: undefined,
    });
  };

  private addArgument = (argument: Argument) => {
    this.setState(
      (prevState: State): State => {
        const premises = [...prevState.premises];
        if (prevState.editingArgumentIndex >= 0) {
          premises[prevState.editingArgumentIndex] = argument;
        } else {
          premises.push(argument);
        }
        return { premises: premises };
      }
    );
  };

  private premiseForm = (argumentType: ArgumentType, initialState?: Argument) => {
    const { acceptEvidenceQuery, logicTypeQuery, assertionBasedBeliefTemplate, fieldBasedBeliefTemplate } = this.props;
    const addArgument = (argument) => {
      this.addArgument(argument);
      this.cancelNewArgument();
    };
    if (argumentType === ObservationType) {
      return (
        <ObservationComponent
          onSave={addArgument}
          onCancel={this.cancelNewArgument}
          initialState={initialState as ObservationComponentState}
        />
      );
    } else if (argumentType === BeliefAdoptionType) {
      return (
        <BeliefAdoptionComponent
          acceptRecordQuery={acceptEvidenceQuery}
          onCancel={this.cancelNewArgument}
          onSave={addArgument}
          initialState={initialState as BeliefAdoptionComponentState}
          assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}
        />
      );
    } else if (argumentType === InferenceType) {
      return (
        <InferenceMakingComponent
          logicTypeQuery={logicTypeQuery}
          acceptEvidenceQuery={acceptEvidenceQuery}
          onCancel={this.cancelNewArgument}
          onSave={addArgument}
          initialState={initialState as InferenceMakingComponentState}
          assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}
          fieldBasedBeliefTemplate={fieldBasedBeliefTemplate}
        />
      );
    }
    return <p>Select a type of premise for your conclusion</p>;
  };

  private newPremiseSelection = () => {
    const { premises, addingPremise, newArgumentType } = this.state;
    if (addingPremise) {
      return (
        <div>
          {this.premiseTypeSelection()}
          {this.premiseForm(newArgumentType)}
          {premises.length ? <hr /> : null}
        </div>
      );
    }
    return null;
  };

  private premiseTypeSelection = () => {
    const name = 'premiseType';
    const onArgumentTypeChange = (argumentType: ArgumentType) => () => this.setState({ newArgumentType: argumentType });
    const isArgumentTypeSelected = (argumentType: ArgumentType): boolean => this.state.newArgumentType === argumentType;
    return (
      <FormGroup>
        <Radio
          name={name}
          checked={isArgumentTypeSelected(ObservationType)}
          onClick={onArgumentTypeChange(ObservationType)}
          inline
        >
          Observation
        </Radio>
        <Radio
          name={name}
          checked={isArgumentTypeSelected(BeliefAdoptionType)}
          onClick={onArgumentTypeChange(BeliefAdoptionType)}
          inline
        >
          Adoption
        </Radio>
        <Radio
          name={name}
          checked={isArgumentTypeSelected(InferenceType)}
          onClick={onArgumentTypeChange(InferenceType)}
          inline
        >
          Inference
        </Radio>
      </FormGroup>
    );
  };

  private renderPremise = (premise: Argument, index: number, premises: ReadonlyArray<Argument>) => {
    const { editingArgumentIndex } = this.state;
    const hr = index < premises.length - 1 ? <hr /> : null;
    if (editingArgumentIndex === index) {
      return (
        <div>
          <FormGroup>
            <ControlLabel>Premise</ControlLabel>
            <FormControl.Static>{premise.argumentType}</FormControl.Static>
          </FormGroup>
          {this.premiseForm(premise.argumentType, premise)}
          {hr}
        </div>
      );
    }
    return (
      <div>
        {this.renderPremiseComponent(premise)}
        {hr}
      </div>
    );
  };

  render() {
    const { premises, status } = this.state;
    if (status === Status.Loading) {
      return <Spinner />;
    }
    return (
      <div>
        {this.newPremiseSelection()}
        {premises.map(this.renderPremise)}
      </div>
    );
  }
}

export default PremiseComponent;

export function saveArguments(
  newArguments: ReadonlyArray<Argument>,
  initialArguments: ReadonlyArray<Argument>,
  beliefs: ReadonlyArray<Rdf.Node>
): Kefir.Property<Array<Argument>> {
  const removeInitialArguments = (): Kefir.Property<void> => {
    if (initialArguments.length) {
      const removingInitialArguments = initialArguments.map(removeArgument);
      return Kefir.zip(removingInitialArguments)
        .map(() => undefined)
        .toProperty();
    }
    return Kefir.constant(undefined);
  };
  return removeInitialArguments()
    .flatMap(() => {
      if (newArguments.length) {
        const savingArguments = newArguments.map((argument) => {
          argument.conclusions = [...beliefs];
          return saveArgument(argument).map((iri) => ({ ...argument, iri: Maybe.Just(iri) }));
        });
        return Kefir.zip(savingArguments);
      }
      return Kefir.constant([]);
    })
    .toProperty();
}
