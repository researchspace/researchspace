/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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
import { Button } from 'react-bootstrap';
import { Map } from 'immutable';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { invalidateAllCaches } from 'platform/api/services/cache';

import { AssertionsComponent } from './AssertionsComponent';
import { saveAssertion } from './AssertionsStore';
import { getArgumentsFieldDefinition } from './FieldUtils';
import { AssertedBelief, ArgumentsFieldDefinition } from './ArgumentsApi';

export interface QuickAssertionComponentProps {
  acceptEvidenceQuery?: string

  fieldIri: string;
  target: string

  valueTemplate: string
  formTemplate: string
}

interface State {
  beliefs: Map<Rdf.Node, AssertedBelief>;
  field: Data.Maybe<ArgumentsFieldDefinition>;
}

export class QuickAssertionComponent extends React.Component<QuickAssertionComponentProps, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      beliefs: Map<Rdf.Node, AssertedBelief>(),
      field: Maybe.Nothing<ArgumentsFieldDefinition>(),
    };
  }

  componentDidMount() {
    getArgumentsFieldDefinition(Rdf.iri(this.props.fieldIri)).onValue(
      field => this.setState({
        field: Maybe.Just(field)
      })
    );
  }

  render() {
    return this.state.field.map(
      field =>
        <div>
          <AssertionsComponent {...this.props} field={field} target={Rdf.iri(this.props.target)}
            title='Assert new value' beliefs={this.state.beliefs}
            onBeliefsChange={this.onBeliefsChange}
            quickAssertion={true}
          />
          <Button bsStyle='success' className='pull-right'
            onClick={this.saveAssertion(field)}>Save</Button>
        </div>
    ).getOrElse(null);
  }

  private onBeliefsChange = (beliefs: Map<Rdf.Node, AssertedBelief>) => this.setState({beliefs});

  private saveAssertion = (field: ArgumentsFieldDefinition) => () => {
    const beliefs = this.state.beliefs.valueSeq().toArray();
    const target = Rdf.iri(this.props.target);
    saveAssertion(
      {iri: Maybe.Nothing<Rdf.Iri>(), field: field, target: target, title: 'New Image', note: '', beliefs}
    ).flatMap(
      () => invalidateAllCaches()
    ).onValue(
      () => window.location.reload()
    );
  }
}
export default QuickAssertionComponent;
