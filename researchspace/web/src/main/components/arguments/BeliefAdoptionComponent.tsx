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
  Panel, FormControl, FormGroup, Col, ControlLabel, Form, Button, ButtonGroup,
} from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';

import {
  ArgumentsBelief, BeliefAdoption, BeliefAdoptionType,  ArgumentsBeliefTypeAssertionKind
} from './ArgumentsApi';
import { BeliefSelection } from './BeliefSelection';
import { ExistingBeliefContentView } from './ExistingBeliefView';

export interface BeliefAdoptionComponentProps {
  acceptRecordQuery?: string
  onCancel: () => void
  onSave: (argument: BeliefAdoption) => void
  initialState?: State
}

export interface State {
  iri: Data.Maybe<Rdf.Iri>;
  title: string;
  note: string;
  belief: ArgumentsBelief;
}

export class BeliefAdoptionComponent extends React.Component<BeliefAdoptionComponentProps, State> {
  constructor(props: BeliefAdoptionComponentProps, context) {
    super(props, context);
    if (props.initialState) {
      this.state = props.initialState;
    } else {
      this.state = {
        iri: Maybe.Nothing<Rdf.Iri>(),
        title: '',
        note: '',
        belief: undefined,
      };
    }
  }

  render() {
    return <Panel header='Premise based on belief adoption'>
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
        {...this.renderBelief()}
      </Form>
    </Panel>;
  }

  private renderBelief = () => {
    const belief = this.state.belief;
    if (belief) {
      return ExistingBeliefContentView(this.state.belief).concat([
        <FormGroup>
          <Col smOffset={2} sm={10}>
            <ButtonGroup className='pull-right'>
              <Button onClick={this.props.onCancel} bsStyle='danger'>Cancel</Button>
              <Button bsStyle='success' onClick={() => this.onSelectBelief(this.state.belief)}
              >Select</Button>
            </ButtonGroup>
          </Col>
        </FormGroup>
      ]);
    } else {
      return [
        <FormGroup>
          <Col smOffset={2} sm={10}>
            {this.newBelief()}
          </Col>
          </FormGroup>,
          <FormGroup>
          <Col smOffset={2} sm={10}>
            <ButtonGroup className='pull-right'>
              <Button onClick={this.props.onCancel} bsStyle='danger'>Cancel</Button>
            </ButtonGroup>
          </Col>
        </FormGroup>
      ];
    }
  }

  private newBelief = () => {
    const messages = {
      beliefHeader: 'Belief adoption',
      dropRecordPlaceholder: 'You can drag and drop items from Clipboard here, to adopt the belief for the record...',
      fieldSelectionHeader: 'Field based belief adoption',
      fieldSelectionPlaceholder: 'Select fields to adopt...',
    };
    return <BeliefSelection
      multiSelection={false}
      messages={messages}
      acceptRecordQuery={this.props.acceptRecordQuery}
      onSelect={this.onFieldsSelection}
    />;
  }

  private onFieldsSelection = (beliefs: Array<ArgumentsBelief>) => {
    this.setState({belief: _.head(beliefs)});
  }

  private onSelectBelief = (belief: ArgumentsBelief) => {
    this.props.onSave({
      iri: this.state.iri,
      argumentType: BeliefAdoptionType,
      title: this.state.title,
      note: this.state.note,
      belief: belief,
    });
  }


  private onTitleChange = (event: React.ChangeEvent<any>) =>
    this.setState({title: event.target.value});

  private onNoteChange = (event: React.ChangeEvent<any>) =>
    this.setState({note: event.target.value});

}
