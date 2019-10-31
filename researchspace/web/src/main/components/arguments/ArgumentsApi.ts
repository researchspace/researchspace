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

import * as PropTypes from 'prop-types';

import { Rdf } from 'platform/api/rdf';
import { FieldDefinitionProp } from 'platform/components/forms/FieldDefinition';

export interface ArgumentsFieldDefinition extends FieldDefinitionProp {
  iri: string;
}

export type BeliefValue = SimpleBelief;
export interface SimpleBelief {
  type: 'simple';
  value: SimpleBeliefValue;
}
export type SimpleBeliefValue = 'Agree' | 'Disagree' | 'No Opinion';

export interface BaseBelief {
  iri: Data.Maybe<Rdf.Iri>;
  belief: BeliefValue;
}

// Assertions
export interface FieldBasedBelief extends BaseBelief {
  target: Rdf.Iri;
  originRepository: string;
  field: ArgumentsFieldDefinition;
}

export const AssertedBeliefTypeKind = 'AssertedBelief';
export interface AssertedBelief extends FieldBasedBelief {
  beliefType: typeof AssertedBeliefTypeKind;
  targetValue: Rdf.Node
  isCanonical: boolean
}

export type Belief = AssertedBelief | ArgumentsBelief;

export interface Assertion {
  iri: Data.Maybe<Rdf.Iri>;
  title: string,
  note?: string;
  narrative?: Rdf.Iri;
  target: Rdf.Iri;
  field: ArgumentsFieldDefinition;
  beliefs: Array<AssertedBelief>
}

export type PropositionSet = Array<Proposition>;
export type Proposition = Rdf.Triple;

// -- Assertions

// Arguments
export type Argument = Observation | BeliefAdoption | Inference;
export const ObservationType = 'Observation';
export const BeliefAdoptionType = 'BeliefAdoption';
export const InferenceType = 'Inference';
export type ArgumentType =
  typeof ObservationType | typeof BeliefAdoptionType | typeof InferenceType;

export interface BaseArgument {
  iri: Data.Maybe<Rdf.Iri>;
  argumentType: ArgumentType;
  title: string;
  note?: string;
  // array of conclusion beliefs IRIs
  conclusions?: Array<Rdf.Node>;
}

export interface Observation extends BaseArgument {
  argumentType: typeof ObservationType
  place: Rdf.Iri
  date: Rdf.Literal
}

export interface BeliefAdoption extends BaseArgument {
  argumentType: typeof BeliefAdoptionType
  belief: ArgumentsBelief
}

export const BeliefTypeArgumentsKind = 'ArgumentsBelief';
export const ArgumentsBeliefTypeAssertionKind = 'AssertionBelief';
export const ArgumentsBeliefTypeFieldKind = 'FieldBelief';
export type ArgumentsBeliefType =
  typeof ArgumentsBeliefTypeAssertionKind | typeof ArgumentsBeliefTypeFieldKind;
export type ArgumentsBelief = ArgumentsAssertionBelief | ArgumentsFieldBelief;
export interface ArgumentsAssertionBelief extends BaseBelief {
  beliefType: typeof BeliefTypeArgumentsKind;
  argumentBeliefType: typeof ArgumentsBeliefTypeAssertionKind;
  assertion: Rdf.Iri;
}

export interface ArgumentsFieldBelief extends FieldBasedBelief {
  beliefType: typeof BeliefTypeArgumentsKind;
  argumentBeliefType: typeof ArgumentsBeliefTypeFieldKind;
}

export interface Inference extends BaseArgument {
  argumentType: typeof InferenceType
  logicType: Rdf.Iri
  premises: Array<ArgumentsAssertionBelief | ArgumentsFieldBelief>
}
// -- Arguments

export interface ArgumentsContext {
  changeBelief(belief: AssertedBelief)
  removeBelief(belief: AssertedBelief)
  getBeliefValue(forValue: string, isCanonical: boolean): AssertedBelief
}

export const ArgumentsContextTypes = {
  changeBelief: PropTypes.any.isRequired,
  getBeliefValue: PropTypes.any.isRequired,
  removeBelief: PropTypes.any.isRequired,
};


// helpers
export function matchBelief<T>(matcher: BeliefMatcher<T>) {
  return function(belief: Belief): T {
    switch (belief.beliefType) {
      case AssertedBeliefTypeKind: return matcher[belief.beliefType](belief);
      case BeliefTypeArgumentsKind: return matcher[belief.beliefType](belief);
    }
  };
}
export interface BeliefMatcher<T> {
  AssertedBelief: (belief: AssertedBelief) => T;
  ArgumentsBelief: (belief: ArgumentsBelief) => T;
}

export function matchArgument<T>(matcher: ArgumentMatcher<T>) {
  return function(argument: Argument): T {
    switch (argument.argumentType) {
      case InferenceType: return matcher[argument.argumentType](argument);
      case ObservationType: return matcher[argument.argumentType](argument);
      case BeliefAdoptionType:  return matcher[argument.argumentType](argument);
    }
  };
}
export interface ArgumentMatcher<T> {
  Inference: (argument: Inference) => T;
  Observation: (observation: Observation) => T;
  BeliefAdoption: (beliefAdoption: BeliefAdoption) => T;
}

export function matchArgumentsBelief<T>(matcher: ArgumentsBeliefMatcher<T>) {
  return function(belief: ArgumentsBelief) {
    switch (belief.argumentBeliefType) {
      case ArgumentsBeliefTypeAssertionKind: return matcher[belief.argumentBeliefType](belief);
      case ArgumentsBeliefTypeFieldKind: return matcher[belief.argumentBeliefType](belief);
    }
  };
}
export interface ArgumentsBeliefMatcher<T> {
  AssertionBelief: (belief: ArgumentsAssertionBelief) => T;
  FieldBelief: (belief: ArgumentsFieldBelief) => T;
}
