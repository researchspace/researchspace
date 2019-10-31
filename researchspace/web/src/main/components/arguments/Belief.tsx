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
import * as _ from 'lodash';
import { DropdownButton, MenuItem, Button, ButtonGroup } from 'react-bootstrap';

import {
  ArgumentsContext, ArgumentsContextTypes, AssertedBelief, SimpleBeliefValue,
} from './ArgumentsApi';

export interface BeliefProps {
  forValue: string;
  isCanonical: boolean;
  beliefValue: boolean;
}

interface State {
  belief: AssertedBelief
}

export class Belief extends React.Component<BeliefProps, State> {
  static contextTypes = ArgumentsContextTypes;
  context: ArgumentsContext;

  constructor(props: BeliefProps, context: ArgumentsContext) {
    super(props, context);
    this.state = {
      belief: context.getBeliefValue(props.forValue, props.isCanonical),
    };
  }

  componentWillReceiveProps(props: BeliefProps, context: ArgumentsContext) {
    this.setState({
      belief: context.getBeliefValue(props.forValue, props.isCanonical),
    });
  }

  render() {
    const { belief } = this.state;
    const id = `belief-selection-${belief.targetValue}`;

    const menuItems = [
        <MenuItem eventKey='Agree'>Agree</MenuItem>,
        <MenuItem eventKey='Disagree'>Disagree</MenuItem>,
        <MenuItem eventKey='No Opinion'>No Opinion</MenuItem>,
    ].filter(menuItem => menuItem.props.eventKey !== belief.belief);

    return <ButtonGroup className='pullRight'>
      <DropdownButton
             title={belief.belief.value} id={id} onSelect={this.onBeliefChange(belief) as any}
             bsStyle={this.dropdownStyle(belief)} bsSize='small' style={{minWidth: 100}}
           >
        {...menuItems}
      </DropdownButton>
      {this.props.isCanonical ? null : <Button  style={{marginLeft: 10}} onClick={() => this.onRemoveBelief(belief)} bsSize='small'><i className='fa fa-times'></i></Button>}
    </ButtonGroup>;
  }

  private dropdownStyle = (belief: AssertedBelief): string => {
    switch (belief.belief.value) {
      case 'Agree': return 'info';
      case 'Disagree': return 'warning';
      case 'No Opinion': return 'default';
    }
  }

  private onBeliefChange = (belief: AssertedBelief) => (
    eventKey: SimpleBeliefValue, event: React.SyntheticEvent<{}>
  ): void =>
    this.setState(
      (state: State) => {
        const newBelief = _.clone(belief);
        newBelief.belief.value = eventKey;
        this.context.changeBelief(newBelief);
        return {belief: newBelief};
      }
    );

  private onRemoveBelief = (belief: AssertedBelief) => {
    this.context.removeBelief(belief);
  }
}

export default Belief;
