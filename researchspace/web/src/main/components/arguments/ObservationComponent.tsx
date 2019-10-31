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
  Panel, FormControl, FormGroup, Col, Form, Button, ControlLabel,
  ButtonGroup,
} from 'react-bootstrap';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';

import * as moment from 'moment';
import Moment = moment.Moment;

import * as reactDatetime from 'react-datetime';
const DateTimePicker = React.createFactory(reactDatetime);

import { Rdf, vocabularies } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { SemanticTreeInput, TreeSelection, Node } from 'platform/components/semantic/lazy-tree';

import { Observation, ObservationType } from './ArgumentsApi';

export interface ObservationComponentProps {
  onSave: (argument: Observation) => void
  onCancel: () => void
  initialState?: State
}

export interface State {
  iri: Data.Maybe<Rdf.Iri>;
  title: string
  note: string
  place?: Rdf.Iri
  date?: Rdf.Literal
}

const PlaceSelectionConfig = {
  placeholder: 'Search for Location...',
  parentsQuery: `
    SELECT DISTINCT ?item ?parent ?parentLabel WHERE {
      ?parent skos:inScheme <http://collection.britishmuseum.org/id/place> .
      ?item skos:broader ?parent .
      ?parent skos:prefLabel ?parentLabel .
    }
  `,
  childrenQuery: `
    SELECT DISTINCT ?item ?label ?hasChildren WHERE {
      ?item skos:broader ?parent .
      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .
      ?item skos:prefLabel ?label .
      OPTIONAL { ?child skos:broader ?item . }
      BIND(bound(?child) as ?hasChildren)
    } ORDER BY ?label
  `,
  rootsQuery: `
    SELECT DISTINCT ?item ?label WHERE {
      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .
      FILTER NOT EXISTS { ?item skos:broader ?parent . }
      ?item skos:prefLabel ?label .
    }
  `,
  searchQuery: `
    SELECT DISTINCT ?item ?label ?score ?hasChildren WHERE {
      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .
      ?item skos:prefLabel ?label.
      ?label bds:search ?__token__ ;
             bds:minRelevance "0.3" ;
             bds:relevance ?score ;
             bds:matchAllTerms "true"  .
      OPTIONAL { ?child skos:broader ?item. }
      BIND(BOUND(?child) AS ?hasChildren)
    }
    ORDER BY DESC(?score) ?label
    LIMIT 200
`,
};

const OUTPUT_UTC_DATE_FORMAT = 'YYYY-MM-DD';
const OUTPUT_UTC_TIME_FORMAT = 'HH:mm:ss';

export class ObservationComponent extends React.Component<ObservationComponentProps, State> {
  constructor(props: ObservationComponentProps, context) {
    super(props, context);
    if (props.initialState) {
      this.state = props.initialState;
    } else {
      this.state = {
        iri: Maybe.Nothing<Rdf.Iri>(),
        title: '',
        note: '',
        place: null,
        date: null,
      };
    }
  }

  render() {
    return <Panel header='Premise based on direct observation'>
      <Form horizontal>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Title*</Col>
          <Col sm={10}>
            <FormControl
              type='text' placeholder='Observation title...'
              value={this.state.title} onChange={this.onTitleChange} />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Description</Col>
          <Col sm={10}>
            <FormControl
              componentClass='textarea' placeholder='Observation description...'
              value={this.state.note} onChange={this.onNoteChange} />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Date*</Col>
          <Col sm={10}>
            <DateTimePicker
              onChange={this.onDateSelected}
              closeOnSelect={true}
              value={this.state.date ? moment(this.state.date.value) as any : undefined}
              viewMode='time'
              dateFormat={OUTPUT_UTC_DATE_FORMAT}
              timeFormat={OUTPUT_UTC_TIME_FORMAT}
              inputProps={{placeholder: 'Select observation date...'}}
            />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={2}>Place*</Col>
          <Col sm={10}>
            <SemanticTreeInput {...PlaceSelectionConfig}
              initialSelection={this.state.place ? [this.state.place] : []}
              onSelectionChanged={this.onPlaceSelected} />
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

  private onTitleChange = (event: React.ChangeEvent<any>) =>
    this.setState({title: event.target.value});

  private onNoteChange = (event: React.ChangeEvent<any>) =>
    this.setState({note: event.target.value});

  private onDateSelected = (date: any) =>
    this.setState({date: Rdf.literal(date.format(), vocabularies.xsd.dateTime)});

  private onPlaceSelected = (selection: TreeSelection<Node>) =>
    this.setState({
      place: TreeSelection.leafs(selection).map(node => node.iri).first()
    });

  private canSave = () => {
    const { title, note, place, date } = this.state;
    return !_.isEmpty(title) &&  place && date;
  }

  private saveArgument = () => {
    const { title, note, place, date, iri } = this.state;
    this.props.onSave({
      iri: iri,
      argumentType: ObservationType,
      title, note, place,
      date: date,
    });
  }
}
