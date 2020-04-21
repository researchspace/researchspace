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
import { Button } from 'react-bootstrap';
import { Map } from 'immutable';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource, refresh } from 'platform/api/navigation';
import { invalidateAllCaches } from 'platform/api/services/cache';

import { AssertionsComponent } from './AssertionsComponent';
import { saveAssertion } from './AssertionsStore';
import { getArgumentsFieldDefinition } from './FieldUtils';
import { AssertedBelief, ArgumentsFieldDefinition } from './ArgumentsApi';

export interface QuickAssertionComponentProps {
  fieldIri: string;
  target: string;

  valueTemplate: string;
  formTemplate: string;

  postAction?: 'none' | 'reload' | 'redirect' | string;
  editMode?: boolean;
  initialBeliefs?: Map<Rdf.Node, AssertedBelief>;
}

interface State {
  beliefs: Map<Rdf.Node, AssertedBelief>;
  field: Data.Maybe<ArgumentsFieldDefinition>;
}

export class QuickAssertionComponent extends React.Component<QuickAssertionComponentProps, State> {
  constructor(props: QuickAssertionComponentProps, context) {
    super(props, context);
    this.state = {
      beliefs: props.initialBeliefs,
      field: Maybe.Nothing<ArgumentsFieldDefinition>(),
    };
  }

  static defaultProps = {
    editMode: true,
    initialBeliefs: Map<Rdf.Node, AssertedBelief>(),
  };

  componentDidMount() {
    getArgumentsFieldDefinition(Rdf.iri(this.props.fieldIri)).onValue((field) =>
      this.setState({
        field: Maybe.Just(field),
      })
    );
  }

  render() {
    return this.state.field
      .map((field) => (
        <div>
          <AssertionsComponent
            {...this.props}
            field={field}
            target={Rdf.iri(this.props.target)}
            title="Assert new value"
            beliefs={this.state.beliefs}
            onBeliefsChange={this.onBeliefsChange}
            quickAssertion={this.props.editMode}
          />
          <Button bsStyle="success" className="pull-right" onClick={this.saveAssertion(field)}>
            Save
          </Button>
        </div>
      ))
      .getOrElse(null);
  }

  private onBeliefsChange = (beliefs: Map<Rdf.Node, AssertedBelief>) => this.setState({ beliefs });

  private saveAssertion = (field: ArgumentsFieldDefinition) => () => {
    const beliefs = this.state.beliefs.valueSeq().toArray();
    const target = Rdf.iri(this.props.target);
    saveAssertion({
      iri: Maybe.Nothing<Rdf.Iri>(),
      field: field,
      target: target,
      title: 'Quick Assertion',
      note: '',
      beliefs,
    })
      .flatMap((assertion) => invalidateAllCaches().map(() => assertion))
      .onValue((assertion) => this.performPostAction(assertion.assertion));
  };

  private performPostAction = (assertion: Rdf.Iri) => {
    if (this.props.postAction === 'none') {
      return;
    }

    if (!this.props.postAction || this.props.postAction === 'reload') {
      refresh();
    } else if (this.props.postAction === 'redirect') {
      navigateToResource(assertion, {}, 'assets').onValue((v) => v);
    } else {
      navigateToResource(Rdf.iri(this.props.postAction), {}, 'assets').onValue((v) => v);
    }
  };
}
export default QuickAssertionComponent;
