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
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import {
  Component,
} from 'platform/api/components';

import {
  ArgumentType, AssertedBelief,
} from './ArgumentsApi';
import { loadAssertion } from './AssertionsStore';
import { loadArgumentsForAssertion } from './ArgumentsStore';

import { BaseArgumentComponentState, BaseArgumentsComponent } from './BaseArgumentComponent';

export interface LoadArgumentComponentProps {
  assertionIri: string
  valueTemplate: string
  formTemplate: string
  acceptEvidenceQuery?: string
}

interface State {
  initialState: Data.Maybe<BaseArgumentComponentState>;
}

export class LoadArgumentComponent extends Component<LoadArgumentComponentProps, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      initialState: Maybe.Nothing<BaseArgumentComponentState>(),
    };
  }

  componentDidMount() {
    const iri = Rdf.iri(this.props.assertionIri);
    loadAssertion(iri).onValue(
      ({title, note, beliefs, narrative, field, target}) => {
        loadArgumentsForAssertion(iri).onValue(
          args => {
            const assertedBeliefs =
              Map(beliefs.map<[Rdf.Node, AssertedBelief]>(belief => [belief.targetValue, belief]));
            this.setState({
                initialState: Maybe.Just({
                  assertionIri: Maybe.Just(iri),
                  title: title,
                  description: note,
                  semanticNarrative: Maybe.fromNullable(narrative),
                  newArgumentType: Maybe.Nothing<ArgumentType>(),
                  field: Maybe.Just(field),
                  initialArguments: _.cloneDeep(args),
                  arguments: args,
                  beliefs: assertedBeliefs,
                  target: target,
                  addingSemanticNarrative: false,
                  addingPremise: false,
                  editingArgumentIndex: Maybe.Nothing<number>(),
                })
            });
          }
        );
      }
    );
  }

  render() {
    return this.state.initialState.map(
      initialState =>
        <BaseArgumentsComponent {...this.props} initialState={initialState} />
    ).getOrElse(null);
  }
}
export default LoadArgumentComponent;
