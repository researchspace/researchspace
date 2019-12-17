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
  FormControl, FormGroup, ControlLabel, Form, Button, ButtonGroup, Row, Col,
} from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';

import { ArgumentsBelief, BeliefAdoption, BeliefAdoptionType } from '../ArgumentsApi';
import { BeliefSelection } from './BeliefSelection';
import { ExistingBeliefView } from './ExistingBeliefView';

export interface BeliefAdoptionComponentProps {
  acceptRecordQuery?: string;
  onCancel: () => void;
  onSave: (argument: BeliefAdoption) => void;
  initialState?: State;
  assertionBasedBeliefTemplate?: string;
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
    const {initialState, onCancel, assertionBasedBeliefTemplate} = this.props;
    const {title, note, belief} = this.state;
    const canSave = title && belief;
    return <Form>
      <FormGroup>
        <ControlLabel>Title*</ControlLabel>
        <FormControl
          type='text' placeholder='Premise title...'
          value={title} onChange={this.onTitleChange} />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Description</ControlLabel>
        <FormControl componentClass='textarea'
          placeholder='Premise description...'
          value={note} onChange={this.onNoteChange} />
      </FormGroup>
      <FormGroup>
        <Row>
          <Col md={4}>
            {belief ? (
              <ExistingBeliefView belief={belief}
                onCancel={() => this.setState({belief: undefined})}
                assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}/>
            ) : this.newBelief()}
          </Col>
        </Row>
      </FormGroup>

      <FormGroup>
        <ButtonGroup className='pull-right'>
          <Button bsStyle='default'
            onClick={onCancel}>
            Cancel
          </Button>
          <Button bsStyle='primary'
            style={{marginLeft:'12px'}}
            onClick={() => this.onSelectBelief(belief)}
            disabled={!canSave}>
            {initialState ? 'Update Premise' : 'Add Premise'}
          </Button>
        </ButtonGroup>
        <div className='clearfix' />
      </FormGroup>
    </Form>;
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
