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
  Panel, FormControl, FormGroup, Col, ControlLabel,
} from 'react-bootstrap';

import { SemanticContextProvider } from 'platform/api/components';
import { ResourceLinkComponent } from 'platform/api/navigation/components';

import {
  ArgumentsBelief, ArgumentsBeliefTypeAssertionKind, ArgumentsBeliefTypeFieldKind,
} from './ArgumentsApi';

export interface ExistingBeliefViewProps {
  belief: ArgumentsBelief;
  onCancel: () => void;
}

/**
 * Renders view for selected Belief(premise in case of "Inference Making"
 * or addopted Belief in case of "Belief Adoption".
 */
export class ExistingBeliefView extends React.Component<ExistingBeliefViewProps, {}> {
  render() {
    const { belief, onCancel } = this.props;
    const close = <i className='fa fa-times pull-right' onClick={onCancel} />;
    switch (belief.argumentBeliefType) {
      case ArgumentsBeliefTypeAssertionKind:
      return <Panel header={<div><span>Assertion based belief</span>{close}</div>}>
          {...ExistingBeliefContentView(belief)}
        </Panel>;
      case ArgumentsBeliefTypeFieldKind:
        return <Panel header={<div><span>Field based belief</span>{close}</div>}>
          {...ExistingBeliefContentView(belief)}
        </Panel>;
    }
  }
}

export function ExistingBeliefContentView(belief: ArgumentsBelief) {
  switch (belief.argumentBeliefType) {
    case ArgumentsBeliefTypeAssertionKind:
      return [
        <FormGroup>
            <Col componentClass={ControlLabel} sm={2}>Assertion</Col>
            <Col sm={10}>
              <FormControl.Static>
                <SemanticContextProvider repository='assets'>
                  <ResourceLinkComponent uri={belief.assertion.value} />
                </SemanticContextProvider>
              </FormControl.Static>
            </Col>
        </FormGroup>
      ];
      case ArgumentsBeliefTypeFieldKind:
        return [
          <FormGroup>
            <Col componentClass={ControlLabel} sm={2}>Record</Col>
            <Col sm={10}>
              <FormControl.Static>
                <ResourceLinkComponent uri={belief.target.value} guessRepository={true} />
              </FormControl.Static>
            </Col>
          </FormGroup>,
          <FormGroup>
            <Col componentClass={ControlLabel} sm={2}>Field</Col>
            <Col sm={10}>
              <FormControl.Static>
                {/* fields are always stored in assets repository */}
                <SemanticContextProvider repository='assets'>
                  <ResourceLinkComponent uri={belief.field.iri} />
                </SemanticContextProvider>
              </FormControl.Static>
            </Col>
          </FormGroup>,
        ];
  }
}
