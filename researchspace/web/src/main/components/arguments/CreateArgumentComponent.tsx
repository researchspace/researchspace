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
import { Map } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';

import {
  ArgumentType, AssertedBelief, ArgumentsFieldDefinition,
} from './ArgumentsApi';
import { AssertionsComponent } from './AssertionsComponent';
import { getArgumentsFieldDefinition } from './FieldUtils';
import { BaseArgumentComponentState, BaseArgumentsComponent } from './BaseArgumentComponent';

export interface ArgumentsProps {
  acceptEvidenceQuery?: string
  agreeWithValue?: string;
  disagreeWithValue?: string;

  fieldIri: string;
  target: string

  valueTemplate: string
  formTemplate: string

  /**
   * Need this to have the ability to start in the adding value mode for the quick assertion workflow,
   * e.g new image assertion
   *
   * @default false
   */
  quickAssertion?: boolean
}

interface State {
  initialState: Data.Maybe<BaseArgumentComponentState>;
}

export class CreateArgumentsComponent extends Component<ArgumentsProps, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      initialState: Maybe.Nothing<BaseArgumentComponentState>(),
    };
  }

  componentDidMount() {
    getArgumentsFieldDefinition(Rdf.iri(this.props.fieldIri)).onValue(
      field => this.setState({
        initialState: Maybe.Just({
          assertionIri: Maybe.Nothing<Rdf.Iri>(),
          title: '',
          description: '',
          semanticNarrative: Maybe.Nothing<Rdf.Iri>(),
          newArgumentType: Maybe.Nothing<ArgumentType>(),
          arguments: [],
          initialArguments: [],
          target: Rdf.iri(this.props.target),
          field: Maybe.Just(field),
          beliefs: this.createInitialBeliefs(field, this.props),
          addingSemanticNarrative: false,
          addingPremise: false,
          editingArgumentIndex: Maybe.Nothing<number>(),
        })
      })
    );
  }

  private createInitialBeliefs(
    field: ArgumentsFieldDefinition, props: ArgumentsProps
  ): Map<Rdf.Node, AssertedBelief> {
    const subject = Rdf.iri(props.target);
    if (props.agreeWithValue) {
      const value =
        AssertionsComponent.deserializeBeliefValue(field, props.agreeWithValue);
      const belief = AssertionsComponent.getDefaultBelief(subject, field, value, true, 'default');
      belief.belief.value = 'Agree';
      return Map([[value, belief]]);
    } else if (props.disagreeWithValue) {
      const value =
        AssertionsComponent.deserializeBeliefValue(field, props.disagreeWithValue);
      const belief = AssertionsComponent.getDefaultBelief(subject, field, value, true, 'default');
      belief.belief.value = 'Disagree';
      return Map([[value, belief]]);
    } else {
      return Map<Rdf.Node, AssertedBelief>();
    }
  }

  render() {
    return this.state.initialState.map(
      initialState =>
        <BaseArgumentsComponent {...this.props} initialState={initialState} />
    ).getOrElse(null);
  }
}

export default CreateArgumentsComponent;
