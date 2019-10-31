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
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import {
  Panel, FormGroup, Col, Button, ControlLabel, ButtonGroup, Form, FormControl,
} from 'react-bootstrap';


import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { SemanticContextProvider } from 'platform/api/components';
import { getOverlaySystem, OverlayDialog } from 'platform/components/ui/overlay';
import { getRepositoryStatus } from 'platform/api/services/repository';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { DropArea } from 'platform/components/dnd/DropArea';

import { rso } from 'researchspace/data/vocabularies/vocabularies';

import { FieldSelection } from './FieldSelection';
import {
  ArgumentsBelief, ArgumentsBeliefTypeAssertionKind,
  ArgumentsBeliefTypeFieldKind, ArgumentsBeliefType, ArgumentsFieldBelief,
  BeliefTypeArgumentsKind, ArgumentsAssertionBelief, ArgumentsFieldDefinition,
} from './ArgumentsApi';


interface SelectedBelief {
  beliefType: typeof BeliefTypeArgumentsKind,
  argumentsBeliefType: ArgumentsBeliefType;
  record: Rdf.Iri;
  types: Array<Rdf.Iri>;
  selectedFields: Array<ArgumentsFieldDefinition>;
}

export interface BeliefSelectionProps {
  acceptRecordQuery: string;
  multiSelection: boolean;
  onSelect: (belief: Array<ArgumentsBelief>) => void;
  messages: {
    beliefHeader: string;
    dropRecordPlaceholder: string;
    fieldSelectionHeader: string;
    fieldSelectionPlaceholder: string;
  }
}

interface State {
  belief: Data.Maybe<SelectedBelief>
}

/**
 * Belief selection component that is used to select Premises for "Inference Making" and Beliefs
 * for "Belief Adoption" arguments.
 *
 * Selected belief can be existing Assertion, Citation, or Field of some Record.
 */
export class BeliefSelection extends React.Component<BeliefSelectionProps, State> {

  constructor(props, context) {
    super(props, context);
    this.state = {
      belief: Maybe.Nothing<SelectedBelief>(),
    };
  }

  render() {
    return this.state.belief.map(this.viewBelief).getOrElse(this.recordDropArea());
  }

  private recordDropArea = () =>
    <DropArea
      alwaysVisible={true}
      query={this.props.acceptRecordQuery}
      repository='assets' // TODO, document the trick with assets repository
      onDrop={this.onRecordDrop}
      dropMessage={this.props.messages.dropRecordPlaceholder}
    />;

  private viewBelief = (belief: SelectedBelief) => {
    if (belief.argumentsBeliefType === ArgumentsBeliefTypeAssertionKind) {
      return null;
    } else {
      return <p>Selecting field...</p>;
    }
  }

  private fieldSelection = (belief: SelectedBelief) => {
    const { messages, multiSelection } = this.props;
    return <Form horizontal>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Fields:</Col>
          <Col sm={10}>
            <FieldSelection
              multiSelection={multiSelection}
              record={belief.record} types={belief.types}
              placeholder={messages.fieldSelectionPlaceholder}
              onCancel={this.onCancelBelief}
              onSave={this.onFieldSelection}
            />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col smOffset={2} sm={10}>
            <ButtonGroup className='pull-right'>
              <Button onClick={this.onCancelBelief} bsStyle='danger'>Cancel</Button>
              <Button bsStyle='success' style={{marginLeft:'12px'}} onClick={() => this.onSelectBelief(this.state.belief.get())}
              >Save</Button>
            </ButtonGroup>
          </Col>
        </FormGroup>
      </Form>;
  }

  private onRecordDrop = (resource: Rdf.Iri) =>
    this.getTypes(resource).onValue(
      types => {
        const isAssertion = _.some(types, t => rso.EX_Assertion.equals(t));
        const belief = {
          beliefType: BeliefTypeArgumentsKind as typeof BeliefTypeArgumentsKind,
          argumentsBeliefType: (isAssertion ? ArgumentsBeliefTypeAssertionKind : ArgumentsBeliefTypeFieldKind) as ArgumentsBeliefType,
          assertion: resource,
          record: resource,
          types: types,
          selectedFields: [],
        };
        this.setState({
          belief: Maybe.Just(belief),
        });

        if (!isAssertion) {
          getOverlaySystem().show(
            'field-selection-overlay',
              <OverlayDialog onHide={this.onCancelBelief} title='Field Selection' type='modal' show={true}>
                <p>Select Field for <ResourceLinkComponent uri={resource.value} guessRepository={true}/>:</p>
                {this.fieldSelection(belief)}
            </OverlayDialog>
          );
        } else {
          this.onSelectBelief(belief);
        }
      }
    );

  private onFieldSelection = (selected: Array<ArgumentsFieldDefinition> | ArgumentsFieldDefinition) => {
    const normalizedSelected = Array.isArray(selected) ? selected : [selected];
    this.setState((state: State) => ({
      belief: state.belief.map(belief => ({...belief, selectedFields: normalizedSelected})),
    }));
  }

  private hideFieldSelectionDialog = () =>
    getOverlaySystem().hide('field-selection-overlay');

  private onSelectBelief = (belief: SelectedBelief) => {
    this.hideFieldSelectionDialog();

    const finalBeliefs: Array<ArgumentsBelief>  = [];
    switch (belief.argumentsBeliefType) {
      case ArgumentsBeliefTypeFieldKind:
        const beliefs: Array<ArgumentsFieldBelief> =
          _.map(belief.selectedFields, field => ({
            iri: Maybe.Nothing<Rdf.Iri>(),
            beliefType: BeliefTypeArgumentsKind as typeof BeliefTypeArgumentsKind,
            argumentBeliefType: ArgumentsBeliefTypeFieldKind as typeof ArgumentsBeliefTypeFieldKind,
            target: belief.record,
            field: field,
            originRepository: 'default',
            belief: {
              type: 'simple' as 'simple',
              value: 'Agree' as 'Agree',
            }
          }));
        finalBeliefs.push(...beliefs);
        break;
      case ArgumentsBeliefTypeAssertionKind:
        const b: ArgumentsAssertionBelief = {
          iri: Maybe.Nothing<Rdf.Iri>(),
          beliefType: BeliefTypeArgumentsKind as typeof BeliefTypeArgumentsKind,
          argumentBeliefType: ArgumentsBeliefTypeAssertionKind,
          assertion: (belief as any).assertion,
          belief: {
            type: 'simple' as 'simple',
            value: 'Agree' as 'Agree',
          }
        };
        finalBeliefs.push(b);
        break;

    }

    // reset belief selection
    this.setState({belief: Maybe.Nothing<SelectedBelief>()});
    this.props.onSelect(finalBeliefs);
  }
  private onCancelBelief = () => {
    this.hideFieldSelectionDialog();
    this.setState({belief: Maybe.Nothing<SelectedBelief>()});
  }

  private repositories = getRepositoryStatus().map(repos => repos.keySeq().toArray());
  private TYPES_QUERY = SparqlUtil.Sparql`SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }`;
  private getTypes =
    (resource: Rdf.Iri) => this.repositories.flatMap(
      repos => Kefir.combine(repos.map(r => this.getTypesFromRepository(r, resource)))
    ).map(_.flatten)
    .map(
      types => _.uniqWith(types, (a, b) => a.equals(b))
    );

  private getTypesFromRepository =
    (repository: string, resource: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> =>
      SparqlClient.select(
        SparqlClient.setBindings(this.TYPES_QUERY, {'__resource__': resource}), {context: {repository: repository}}
      ).map(
        result => result.results.bindings.map(binding => binding['type'] as Rdf.Iri)
    );
}
