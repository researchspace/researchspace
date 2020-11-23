/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

import { trigger, listen } from 'platform/api/events';
import { Component } from 'platform/api/components';

import * as SelectionEvents from './SelectionEvents';

export interface SelectionToggleConfig {
  selectionId: string;
  value: string;
}
type SelectionToggleProps = SelectionToggleConfig & React.Props<SelectionToggle>;

interface SelectionState {
  isActive: boolean;
  isSelected: boolean;
}

export class SelectionToggle extends Component<SelectionToggleProps, SelectionState> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      isActive: false,
      isSelected: false,
    };
  }

  componentDidMount() {
    this.cancel.map(
      listen({
        source: this.props.selectionId,
        eventType: SelectionEvents.SelectionSetActive,
      })
    ).onValue(
      event => {
        const { isActive, selections } = event.data;
        this.setState({
          isActive, isSelected: selections[this.props.value] == true
        });
      }
    );


    this.cancel.map(
      listen({
        source: this.props.selectionId,
        eventType: SelectionEvents.SelectionCurrentState,
        target: this.selectionId(),
      })
    ).onValue(
      event => {
        const { isActive, selections } = event.data;
        this.setState({
          isActive, isSelected: selections[this.props.value] == true
        });
      }
    );

    trigger({
      source: this.selectionId(),
      targets: [this.props.selectionId],
      eventType: SelectionEvents.SelectionGetState,
    });
  }

  render() {
    return (
      <input
        style={{display: this.state.isActive ? null : 'none'}}
        type='checkbox'
        checked={this.state.isSelected}
        onChange={this.onChange}
      />
    );
  }

  private onChange = () => {
    const isSelected = !this.state.isSelected;
    this.setState({isSelected});
    trigger({
      eventType: SelectionEvents.SelectionToggle,
      source: this.selectionId(),
      targets: [this.props.selectionId],
      data: {isSelected, value: this.props.value}
    });
  }

  private selectionId() {
    return 'selection__' + this.props.value;
  }
}

export default SelectionToggle;
