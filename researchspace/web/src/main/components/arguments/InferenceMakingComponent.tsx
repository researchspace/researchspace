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
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import {
  Panel, FormControl, FormGroup, Button, ButtonGroup, Col, ControlLabel, Form,
} from 'react-bootstrap';
import ReactSelect, { ReactSelectProps, Option } from 'react-select';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import {
  InferenceType, Inference, ArgumentsBelief, ArgumentsBeliefType,
} from './ArgumentsApi';
import { BeliefSelection } from './BeliefSelection';
import { ExistingBeliefView } from './ExistingBeliefView';


export interface InferenceMakingComponentProps {
  acceptEvidenceQuery?: string
  onCancel: () => void
  onSave: (argument: Inference) => void
  initialState?: State
  logicTypeQuery: string
}

interface NewPremise {
  type: ArgumentsBeliefType;
  record: Rdf.Iri;
  types: Array<Rdf.Iri>;
  selectedFields: Array<Rdf.Iri>;
}

export interface State {
  iri: Data.Maybe<Rdf.Iri>;
  title: string;
  note: string;
  logicType?: Rdf.Iri;
  premises: Array<ArgumentsBelief>;
  logics?: Array<Option<Rdf.Iri>>;
}

const LogicSelector: React.ComponentClass<ReactSelectProps<Rdf.Iri>> = ReactSelect;

export class InferenceMakingComponent extends React.Component<InferenceMakingComponentProps, State> {
  constructor(props, context) {
    super(props, context);
    if (props.initialState) {
      this.state = props.initialState;
    } else {
      this.state = {
        iri: Maybe.Nothing<Rdf.Iri>(),
        title: '',
        note: '',
        logicType: undefined,
        premises: [],
        logics: [],
      };
    }
  }

  componentDidMount() {
    SparqlClient.select(this.props.logicTypeQuery).onValue(
      res => {
        const logics =
          res.results.bindings.map(
            binding => ({value: binding['logic'] as Rdf.Iri, label: binding['label'].value})
          );
        this.setState({logics});
      }
    );
  }

  render() {
    const { premises } = this.state;
    return <Panel header='Premise based on logical inference'>
      <Form horizontal>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Title*</Col>
          <Col sm={10}>
            <FormControl
              type='text' placeholder='Premise title...'
              value={this.state.title} onChange={this.onTitleChange} />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Description</Col>
          <Col sm={10}>
            <FormControl componentClass='textarea'
              placeholder='Premise description...'
              value={this.state.note} onChange={this.onNoteChange} />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Logic Type*</Col>
          <Col sm={10}>
            {this.logicTypeSelector()}
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Evidences</Col>
          <Col sm={10}>
            {
              ...premises.map(
                premise => <ExistingBeliefView belief={premise}
                             onCancel={() => this.removePremise(premise)} />
              )
            }
            {this.newPremise()}
          </Col>
        </FormGroup>
        <FormGroup>
          <Col smOffset={2} sm={10}>
            <ButtonGroup className='pull-right'>
              <Button bsStyle='danger' onClick={this.props.onCancel}>Cancel</Button>
              <Button bsStyle='success'
                      style={{marginLeft:'12px'}}
                onClick={this.saveArgument}
                disabled={!this.canSave()}
              >Save</Button>
            </ButtonGroup>
          </Col>
        </FormGroup>
      </Form>
    </Panel>;
  }

  private logicTypeSelector = () => {
    const { logics } = this.state;
    const selected = this.state.logicType ?
      _.find(logics, option => option.value.equals(this.state.logicType)) : null;
    return <LogicSelector
             placeholder='Select logic type...'
             options={logics}
             value={selected}
             onChange={this.onLogicChange}
             clearable={false}
    />;
  }

  private newPremise = () => {
    const messages = {
      beliefHeader: 'Assertion based evidence',
      dropRecordPlaceholder: 'You can drag and drop items from Clipboard here, to add a resource for use as evidence',
      fieldSelectionHeader: 'Field based evidence',
      fieldSelectionPlaceholder: 'Select fields for evidence...',
    };
    return <BeliefSelection
      multiSelection={true}
      messages={messages}
      acceptRecordQuery={this.props.acceptEvidenceQuery}
      onSelect={this.savePremise}
    />;
  }

  private onTitleChange = (event: React.ChangeEvent<any>) => {
    this.setState({title: event.target.value});
  }

  private onNoteChange = (event: React.ChangeEvent<any>) => {
    this.setState({note: event.target.value});
  }

  private onLogicChange = (selected: Option<Rdf.Iri>) => {
    this.setState({logicType: selected.value});
  }

  private savePremise = (beliefs: Array<ArgumentsBelief>) => {
    this.setState(
      state => ({
        premises: state.premises.concat(beliefs),
      })
    );
  }

  private removePremise = (premise: ArgumentsBelief) => {
    this.setState(
      state => {
        _.remove(state.premises, p => p === premise);
        return {premises: state.premises};
      }
    );
  }

  private saveArgument = () => {
    this.props.onSave({
      iri: this.state.iri,
      argumentType: InferenceType,
      logicType: this.state.logicType,
      title: this.state.title,
      note: this.state.note,
      premises: this.state.premises,
    });
  }

  private canSave = () => {
    const { logicType, title, premises } = this.state;
    return logicType
      && !_.isEmpty(title)
      && !_.isEmpty(premises);
  }
 }
