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

import * as React from 'react';
import {
  Panel, FormControl, FormGroup, Radio, Grid, Row, Col, Form, Button, ControlLabel,
} from 'react-bootstrap';
import * as Maybe from 'data.maybe';
import { Map } from 'immutable';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as moment from 'moment';

import { Rdf } from 'platform/api/rdf';
import {
  Component, ComponentContext, SemanticContextProvider,
} from 'platform/api/components';
import { navigateToResource, refresh } from 'platform/api/navigation';
import { DropArea } from 'platform/components/dnd/DropArea';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { getPreferredLabel } from 'platform/components/forms';
import { addNotification } from 'platform/components/ui/notification';

import {
  ArgumentType, ObservationType, InferenceType, BeliefAdoptionType, AssertedBelief,
  Argument, ArgumentsBelief, Inference, BeliefAdoption, Observation, matchArgument,
  ArgumentsFieldDefinition,
} from './ArgumentsApi';
import { AssertionsComponent } from './AssertionsComponent';
import { saveAssertion } from './AssertionsStore';
import { saveArgument, removeArgument } from './ArgumentsStore';
import { InferenceMakingComponent } from './InferenceMakingComponent';
import { BeliefAdoptionComponent } from './BeliefAdoptionComponent';
import { ObservationComponent } from './ObservationComponent';
import { ExistingBeliefView, ExistingBeliefContentView } from './ExistingBeliefView';

import * as styles from './ArgumentsComponent.scss';

export interface ArgumentsProps {
  initialState: BaseArgumentComponentState

  valueTemplate: string
  formTemplate: string

  acceptEvidenceQuery?: string

  logicTypeQuery?: string
}

export interface BaseArgumentComponentState {
  assertionIri: Data.Maybe<Rdf.Iri>;
  title: string;
  description: string;
  newArgumentType: Data.Maybe<ArgumentType>;
  beliefs: Map<Rdf.Node, AssertedBelief>;
  initialArguments: Array<Argument>;
  arguments: Array<Argument>;
  semanticNarrative: Data.Maybe<Rdf.Iri>;
  addingSemanticNarrative: boolean;
  addingPremise: boolean;
  field: Data.Maybe<ArgumentsFieldDefinition>;
  target: Rdf.Iri;
  editingArgumentIndex: Data.Maybe<number>;
}

export class BaseArgumentsComponent extends Component<ArgumentsProps, BaseArgumentComponentState> {
  constructor(props: ArgumentsProps, context: ComponentContext) {
    super(props, context);
    this.state = props.initialState;
  }

  static defaultProps = {
    acceptEvidenceQuery: `ASK {}`,
    logicTypeQuery: `
      PREFIX crminf: <http://www.ics.forth.gr/isl/CRMinf/>

      SELECT ?logic ?label {
        ?logic a crminf:I3_Inference_Logic .
        ?logic rdfs:label ?label .
      }
    `,
  };


  render() {
    return this.state.field.map(
      field =>
        <Grid fluid>
          {this.assertionHeader(field)}
          {this.arguments(field)}
        </Grid>
    ).getOrElse(null);
  }

  private assertionHeader = (field: ArgumentsFieldDefinition) =>
    <Row className={styles.title}>
      <Col sm={12}>
        <div className={styles.header}>
          <img src='../images/assertion.svg' />
          Assertion about field <SemanticContextProvider repository='default'>
          <ResourceLinkComponent uri='http://www.researchspace.org/resource/Field'
                                 urlqueryparamSubject={this.state.target.value}
                                 urlqueryparamField={field.iri}>
            <span className='field-type-title'>
              {getPreferredLabel(field.label)}
            </span>
          </ResourceLinkComponent>
        </SemanticContextProvider> of <ResourceLinkComponent uri={this.state.target.value}
                                                             guessRepository={true} />
        </div>
          <Col sm={5}>
            <Form horizontal>
              <Col sm={12} style={{marginBottom: 10}}>
                </Col>
              <FormGroup>
                <Col componentClass={ControlLabel} sm={2}>Title*</Col>
                <Col sm={10}>
                  <FormControl type='text' placeholder='Enter Assertion Title...'
                    value={this.state.title} onChange={this.onTitleChange} />
                </Col>
              </FormGroup>
               <FormGroup>
                <Col componentClass={ControlLabel} sm={2}>Description</Col>
                <Col sm={10}>
                  <FormControl componentClass='textarea'
                               placeholder='Enter Assertion Description...'
                               value={this.state.description}
                               onChange={this.onDescriptionChange} />
                </Col>
              </FormGroup>
              {this.renderSemanticNarrative()}
            </Form>
          </Col>
      </Col>
    </Row>

  private renderSemanticNarrative = () =>
    <FormGroup>
      <Col componentClass={ControlLabel} sm={2}>Narrative</Col>
      <Col sm={10}>
        {
          this.state.semanticNarrative.map(
            semanticNarrative =>
            <FormControl.Static>
              <SemanticContextProvider repository='assets'>
                <ResourceLinkComponent uri={semanticNarrative.value} />
              </SemanticContextProvider>
            </FormControl.Static>
          ).getOrElse(this.semanticNarrativeSelection())
        }
      </Col>
    </FormGroup>

  private semanticNarrativeSelection = () => {
    const { addingSemanticNarrative } = this.state;
    return <div>
      <Button bsStyle='link'
              onClick={() => this.setState({ addingSemanticNarrative: !addingSemanticNarrative })}>
        Add semantic narrative ...
      </Button>
      {
        addingSemanticNarrative ?
          <Panel collapsible expanded={addingSemanticNarrative}>
            <DropArea
              alwaysVisible={true}
              query='ASK { ?value a <http://www.researchspace.org/ontology/UserDefinedPage> .}'
              repository='assets'
              onDrop={this.onSemanticNarrativeDrop}
              dropMessage={
                <p>You can drag and drop Semantic Narrative from
                  Clipboard here, to use it as a description</p>
              }
            />
          </Panel>
          : null
      }
    </div>;
  }

  private newPremiseSelection = () => {
    const { addingPremise } = this.state;
    return addingPremise ? this.newArgumentSelection()
      : <div className={styles.newPremise}>
          <Button bsStyle='link'
              onClick={() => this.setState({ addingPremise: !addingPremise })}>
            <strong>Add another premise...</strong>
          </Button>
        </div>;
  }

  private arguments = (field: ArgumentsFieldDefinition) =>
    <div>
      <div className={styles.holder}>
        <div className={styles.arguments}>
          {...this.existingArguments()}
          {this.state.newArgumentType.map(this.newArgument).getOrElse(
            this.state.arguments.length ? this.newPremiseSelection() : this.newArgumentSelection()
          )}
        </div>
        <div className={styles.assertions}>
          <AssertionsComponent {...this.props} field={field} title='Conclusion'
            onBeliefsChange={this.onBeliefsChange} beliefs={this.state.beliefs}
            target={this.state.target}
          />
        </div>
      </div>
      <div>
      <Button bsStyle='success' className={styles.save}
              disabled={!this.saveEnabled()}
              onClick={this.save(field)}>Save Assertion
      </Button>
      </div>
    </div>

  private existingArguments = () =>
    this.state.arguments.map(
      (argument, i) => {
        if (this.state.editingArgumentIndex.map(index => index === i).getOrElse(false)) {
          return this.newArgument(argument.argumentType, argument);
        } else {
          return <div className={styles.existingArgument}>
            {this.renderArgument(argument)}
            {this.arrowConnector()}
          </div>;
        }
      })

  private arrowConnector = () => {
    return <i className='fa fa-long-arrow-right'></i>;
  }

  private renderArgument = (argument: Argument) => {
    switch (argument.argumentType) {
      case ObservationType:
        return this.renderObservationArgument(argument);
      case BeliefAdoptionType:
        return this.renderBeliefAdoptionArgument(argument);
      case InferenceType:
        return this.renderInferenceArgument(argument);
    }
  }

  private closePanelButton = (action: (arg: Argument) => void, arg?: Argument) =>
    <Button bsSize='xs' bsClass='btn btn-xs btn-default pull-right'
                        style={{marginLeft: 10}}
                        onClick={() => action(arg)}>
      <i className='fa fa-times'/>
    </Button>

  private editPanelButton = (action: (arg: Argument) => void, arg: Argument) =>
    <Button bsSize='xs' bsClass='btn btn-xs btn-default pull-right'
                         onClick={() => action(arg)}>
      <i className='fa fa-pencil'/>
    </Button>

  private argumentFrame = (
    props: {argument: Argument, title: string, children?: React.ReactNode}
  ) => <div className={styles.panelHolder}>
      <Panel header={<div>
                      <span>{props.title}</span>
                      {this.closePanelButton(this.removeArgument, props.argument)}
                      {this.editPanelButton(this.editArgument, props.argument)}
                    </div>}>
        <Form horizontal>
          <FormGroup>
            <Col componentClass={ControlLabel} sm={2}>Title</Col>
            <Col sm={10}>
            <FormControl.Static>
              {props.argument.title}
           </FormControl.Static>
           </Col>
          </FormGroup>
          <FormGroup>
           <Col componentClass={ControlLabel} sm={2}>Description</Col>
           <Col sm={10}>
             <FormControl.Static>
                {props.argument.note}
             </FormControl.Static>
           </Col>
          </FormGroup>
          {props.children}
        </Form>
      </Panel>
    </div>

  private renderInferenceArgument = (argument: Inference) =>
    <this.argumentFrame argument={argument} title='Premise based on logic and evidences'>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Logic Type</Col>
          <Col sm={10}>
            <FormControl.Static>
              <SemanticContextProvider repository='assets'>
                <ResourceLinkComponent uri={argument.logicType.value} />
              </SemanticContextProvider>
            </FormControl.Static>
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Evidence</Col>
          <Col sm={10}>
            {
              argument.premises.map(
                premise => <ExistingBeliefView belief={premise}
                             onCancel={() => this.removePremiseForArgument(argument, premise)}/>
              )
            }
          </Col>
        </FormGroup>
    </this.argumentFrame>

  private renderBeliefAdoptionArgument = (argument: BeliefAdoption) =>
    <this.argumentFrame argument={argument} title='Premise based on belief adoption'>
        {...ExistingBeliefContentView(argument.belief)}
    </this.argumentFrame>

  private renderObservationArgument = (argument: Observation) =>
    <this.argumentFrame argument={argument} title='Premise based on direct observation'>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Place</Col>
          <Col sm={10}>
            <FormControl.Static>
              <SemanticContextProvider repository='default'>
                <ResourceLinkComponent uri={argument.place.value} />
              </SemanticContextProvider>
            </FormControl.Static>
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Date</Col>
          <Col sm={10}>
            <FormControl.Static>
              {moment(argument.date.value).format('LL')}
            </FormControl.Static>
          </Col>
        </FormGroup>
    </this.argumentFrame>

  private newArgument = (argumentType: ArgumentType, initialState?: any) =>
    <div className={styles.newArgument}>
      <div className={styles.panelHolder}>
        {this.newArgumentComponent(argumentType, initialState)}
      </div>
      {this.arrowConnector()}
    </div>

  private newArgumentComponent = (argumentType: ArgumentType, initialState?: any) => {
    switch (argumentType) {
      case ObservationType:
        return <ObservationComponent
          onSave={this.addArgument}
          onCancel={this.cancelNewArgument}
          initialState={initialState}
        />;
      case InferenceType:
        return <InferenceMakingComponent
          logicTypeQuery={this.props.logicTypeQuery}
          acceptEvidenceQuery={this.props.acceptEvidenceQuery}
          onCancel={this.cancelNewArgument}
          onSave={this.addArgument}
          initialState={initialState}
        />;
      case BeliefAdoptionType:
        return <BeliefAdoptionComponent
          acceptRecordQuery={this.props.acceptEvidenceQuery}
          onCancel={this.cancelNewArgument}
          onSave={this.addArgument}
          initialState={initialState}
        />;
    }
  }

  private newArgumentSelection = () =>
    <div className={ this.state.arguments.length ?
      styles.newArgument : styles.firstNewArgument}>
      <div className={styles.panelHolder}>
        <Panel header={<div>
            <span>Premise</span>
            {this.state.arguments.length ? this.closePanelButton(this.cancelNewArgument) : null}
            </div>}>
          <p>Select a type of premise for your conclusion</p>
          <hr />
        <FormGroup>
          <Radio name='premiseType' checked={this.isArgumentTypeSelected(ObservationType)}
            onClick={this.onArgumentTypeChange(ObservationType)}>
            I have a premise based on what I've personally observed
          </Radio>
          <Radio name='premiseType' checked={this.isArgumentTypeSelected(BeliefAdoptionType)}
            onClick={this.onArgumentTypeChange(BeliefAdoptionType)}>
            I want to adopt someone else's belief and use it as my premise
          </Radio>
          <Radio name='premiseType' checked={this.isArgumentTypeSelected(InferenceType)}
            onClick={this.onArgumentTypeChange(InferenceType)}>
            I want to use logic and connected evidence as the basis of my premise</Radio>
          </FormGroup>
        </Panel>
      </div>
      {this.arrowConnector()}
    </div>

  private onTitleChange = (event: React.ChangeEvent<FormControl>) =>
    this.setState({title: (event.target as any).value})

  private onDescriptionChange = (event: React.ChangeEvent<FormControl>) =>
    this.setState({description: (event.target as any).value})

  private onSemanticNarrativeDrop = (narrative: Rdf.Iri) =>
    this.setState({semanticNarrative: Maybe.Just(narrative)})

  private onArgumentTypeChange = (argumentType: ArgumentType) => () =>
    this.setState({newArgumentType: Maybe.Just<ArgumentType>(argumentType)})

  private cancelNewArgument = () =>
    this.setState({
      addingPremise: false,
      newArgumentType: Maybe.Nothing<ArgumentType>(),
      editingArgumentIndex: Maybe.Nothing<number>(),
    })

  private isArgumentTypeSelected = (argumentType: ArgumentType): boolean =>
    this.state.newArgumentType.map(t => t === argumentType).getOrElse(false)

  private onBeliefsChange = (beliefs: Map<Rdf.Node, AssertedBelief>) => this.setState({beliefs});

  private saveEnabled = (): boolean => {
    const noBelief =
      this.state.beliefs.isEmpty() || this.state.beliefs.some(b => b.belief.value === 'No Opinion');
    return !_.isEmpty(this.state.title) && !noBelief;
  }

  private addArgument = (argument: Argument) => {
    if (this.state.editingArgumentIndex.isJust) {
      this.state.arguments[this.state.editingArgumentIndex.get()] = argument;
      this.setState(
        ({arguments: this.state.arguments})
      );
    } else {
      this.setState(
        ({arguments: this.state.arguments.concat([argument])})
      );
    }
    this.cancelNewArgument();
  }

  private removeArgument = (argument: Argument) =>
    this.setState(
      (state: BaseArgumentComponentState) => {
        const filteredArgs = _.filter(state.arguments, a => a !== argument);
        return { arguments: filteredArgs };
      }
    )

  private editArgument = (argument: Argument) =>
    this.setState({
      editingArgumentIndex: Maybe.Just(_.findIndex(this.state.arguments, arg => arg === argument)),
    })

  private removePremiseForArgument = (argument: Inference, premise: ArgumentsBelief) =>
    this.setState(
      (state: BaseArgumentComponentState) => {
        _.remove(argument.premises, p => p === premise);
        return { arguments: state.arguments };
      }
    )

    private save = (field: ArgumentsFieldDefinition) => () => {
      const assertedBeliefs = this.state.beliefs.valueSeq().toArray();
    let savingAssertion =
      saveAssertion(
        {iri: this.state.assertionIri, title: this.state.title, note: this.state.description,
         narrative: this.state.semanticNarrative.getOrElse(undefined),
         field: field, target: this.state.target, beliefs: assertedBeliefs}
      );

    let saving: Kefir.Observable<Rdf.Iri>;
    if (_.isEmpty(this.state.arguments)) {
      saving = savingAssertion.map(({assertion}) => assertion).flatMap(
        assertion => {
            if (!_.isEmpty(this.state.initialArguments)) {
              return Kefir.combine(this.state.initialArguments.map(removeArgument))
                .map(_ => assertion);
            } else {
              return Kefir.constant(assertion);
            }
        }
      );
    } else {
      saving =
        savingAssertion.flatMap(
          ({assertion, beliefs}) => {
            let removeProp;
            if (!_.isEmpty(this.state.initialArguments)) {
              removeProp = Kefir.combine(this.state.initialArguments.map(removeArgument));
            } else {
              removeProp = Kefir.constant({});
            }
            return removeProp.flatMap(
              _ =>
                Kefir.combine(
                  this.state.arguments.map(argument => {
                    argument.conclusions = beliefs;
                    return saveArgument(argument);
                  })
                ).map(
                  _ => assertion
                )
            );
          }
        );
    }

    saving.flatMap(
      assertion => {
        if (this.state.assertionIri.isJust) {
          refresh();
          return Kefir.constant<void>(null);
        } else {
          return navigateToResource(assertion, {}, 'assets');
        }
      }
    ).onValue(
      () => {
        addNotification({
          level: 'success',
          message: `Assertion has been saved successfully!`,
        });
      }
    );
  }

}

export default BaseArgumentsComponent;
