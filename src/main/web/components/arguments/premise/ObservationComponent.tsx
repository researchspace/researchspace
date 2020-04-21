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
import { FormControl, FormGroup, Form, Button, ControlLabel, ButtonGroup } from 'react-bootstrap';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';

import * as moment from 'moment';

import * as reactDatetime from 'react-datetime';
const DateTimePicker = React.createFactory(reactDatetime);

import { Rdf, vocabularies } from 'platform/api/rdf';
import { SemanticTreeInput, TreeSelection, Node } from 'platform/components/semantic/lazy-tree';

import { Observation, ObservationType } from '../ArgumentsApi';

export interface ObservationComponentProps {
  onSave: (argument: Observation) => void;
  onCancel: () => void;
  initialState?: State;
}

export interface State {
  iri: Data.Maybe<Rdf.Iri>;
  title: string;
  note: string;
  place?: Rdf.Iri;
  date?: Rdf.Literal;
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
    const { initialState } = this.props;
    return (
      <Form>
        <FormGroup>
          <ControlLabel>Title*</ControlLabel>
          <FormControl
            type="text"
            placeholder="Observation title..."
            value={this.state.title}
            onChange={this.onTitleChange}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Description</ControlLabel>
          <FormControl
            componentClass="textarea"
            placeholder="Observation description..."
            value={this.state.note}
            onChange={this.onNoteChange}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Date*</ControlLabel>
          <DateTimePicker
            onChange={this.onDateSelected}
            closeOnSelect={true}
            value={this.state.date ? (moment(this.state.date.value) as any) : undefined}
            viewMode="time"
            dateFormat={OUTPUT_UTC_DATE_FORMAT}
            timeFormat={OUTPUT_UTC_TIME_FORMAT}
            inputProps={{ placeholder: 'Select observation date...' }}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Place*</ControlLabel>
          <SemanticTreeInput
            {...PlaceSelectionConfig}
            initialSelection={this.state.place ? [this.state.place] : []}
            onSelectionChanged={this.onPlaceSelected}
          />
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

  private onTitleChange = (event: React.ChangeEvent<any>) => this.setState({ title: event.target.value });

  private onNoteChange = (event: React.ChangeEvent<any>) => this.setState({ note: event.target.value });

  private onDateSelected = (date: any) =>
    this.setState({ date: Rdf.literal(date.format(), vocabularies.xsd.dateTime) });

  private onPlaceSelected = (selection: TreeSelection<Node>) =>
    this.setState({
      place: TreeSelection.leafs(selection)
        .map((node) => node.iri)
        .first(),
    });

  private canSave = () => {
    const { title, note, place, date } = this.state;
    return !_.isEmpty(title) && place && date;
  };

  private saveArgument = () => {
    const { title, note, place, date, iri } = this.state;
    this.props.onSave({
      iri: iri,
      argumentType: ObservationType,
      title,
      note,
      place,
      date: date,
    });
  };
}
