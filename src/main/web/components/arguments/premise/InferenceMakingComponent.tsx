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
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import { FormControl, FormGroup, Button, ButtonGroup, Col, ControlLabel, Form, Row } from 'react-bootstrap';
import ReactSelect, { ReactSelectProps, Option } from 'react-select';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { InferenceType, Inference, ArgumentsBelief, ArgumentsBeliefType } from '../ArgumentsApi';
import { BeliefSelection } from './BeliefSelection';
import { ExistingBeliefView } from './ExistingBeliefView';

import * as styles from './PremiseComponent.scss';

export interface InferenceMakingComponentProps {
  acceptEvidenceQuery?: string;
  onCancel: () => void;
  onSave: (argument: Inference) => void;
  initialState?: State;
  logicTypeQuery: string;
  assertionBasedBeliefTemplate?: string;
  fieldBasedBeliefTemplate?: string;
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
    SparqlClient.select(this.props.logicTypeQuery).onValue((res) => {
      const logics = res.results.bindings.map((binding) => ({
        value: binding['logic'] as Rdf.Iri,
        label: binding['label'].value,
      }));
      this.setState({ logics });
    });
  }

  render() {
    const { initialState, assertionBasedBeliefTemplate, fieldBasedBeliefTemplate } = this.props;
    const { premises } = this.state;
    return (
      <Form>
        <FormGroup>
          <ControlLabel>Title*</ControlLabel>
          <FormControl
            type="text"
            placeholder="Premise title..."
            value={this.state.title}
            onChange={this.onTitleChange}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Description</ControlLabel>
          <FormControl
            componentClass="textarea"
            placeholder="Premise description..."
            value={this.state.note}
            onChange={this.onNoteChange}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Logic Type*</ControlLabel>
          {this.logicTypeSelector()}
        </FormGroup>
        <FormGroup>
          <ControlLabel>Evidences</ControlLabel>
          <Row className={styles.evidenceList}>
            {premises.map((premise, index) => (
              <Col sm={4} className={styles.evidenceItem}>
                <ExistingBeliefView
                  belief={premise}
                  onCancel={() => this.removePremise(premise, index)}
                  assertionBasedBeliefTemplate={assertionBasedBeliefTemplate}
                  fieldBasedBeliefTemplate={fieldBasedBeliefTemplate}
                />
              </Col>
            ))}
            <Col sm={4} className={styles.evidenceSelector}>
              {this.newPremise()}
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ButtonGroup className="pull-right">
            <Button bsStyle="default" onClick={this.props.onCancel}>
              Cancel
            </Button>
            <Button
              bsStyle="primary"
              style={{ marginLeft: '12px' }}
              onClick={this.saveArgument}
              disabled={!this.canSave()}
            >
              {initialState ? 'Update Premise' : 'Add Premise'}
            </Button>
          </ButtonGroup>
          <div className="clearfix" />
        </FormGroup>
      </Form>
    );
  }

  private logicTypeSelector = () => {
    const { logics } = this.state;
    const selected = this.state.logicType
      ? _.find(logics, (option) => option.value.equals(this.state.logicType))
      : null;
    return (
      <LogicSelector
        placeholder="Select logic type..."
        options={logics}
        value={selected}
        onChange={this.onLogicChange}
        clearable={false}
      />
    );
  };

  private newPremise = () => {
    const messages = {
      beliefHeader: 'Assertion based evidence',
      dropRecordPlaceholder: 'You can drag and drop items from Clipboard here, to add a resource for use as evidence',
      fieldSelectionHeader: 'Field based evidence',
      fieldSelectionPlaceholder: 'Select fields for evidence...',
    };
    return (
      <BeliefSelection
        multiSelection={true}
        messages={messages}
        acceptRecordQuery={this.props.acceptEvidenceQuery}
        onSelect={this.savePremise}
      />
    );
  };

  private onTitleChange = (event: React.ChangeEvent<any>) => {
    this.setState({ title: event.target.value });
  };

  private onNoteChange = (event: React.ChangeEvent<any>) => {
    this.setState({ note: event.target.value });
  };

  private onLogicChange = (selected: Option<Rdf.Iri>) => {
    this.setState({ logicType: selected.value });
  };

  private savePremise = (beliefs: Array<ArgumentsBelief>) => {
    this.setState((state) => ({
      premises: state.premises.concat(beliefs),
    }));
  };

  private removePremise = (premise: ArgumentsBelief, index: number) => {
    this.setState((prevState: State) => {
      const newPremises = [...prevState.premises];
      newPremises.splice(index, 1);
      return { premises: newPremises };
    });
  };

  private saveArgument = () => {
    this.props.onSave({
      iri: this.state.iri,
      argumentType: InferenceType,
      logicType: this.state.logicType,
      title: this.state.title,
      note: this.state.note,
      premises: this.state.premises,
    });
  };

  private canSave = () => {
    const { logicType, title, premises } = this.state;
    return logicType && !_.isEmpty(title) && !_.isEmpty(premises);
  };
}
