/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @author Philip Polkovnikov
 */

import * as React from 'react';
import { Component } from 'react';
import { trigger } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { SelectionEvents } from './SelectionEvents';
import { SelectionGroupContext, SelectionGroupContextTypes } from './SelectionGroupComponent';

interface Props {
  /**
   * Name of checkbox listener
   */
  selection: string;
  /**
   * Extra data to pass to listener, so that it's possible to
   * figure out, which of checkboxes was toggled
   */
  tag: string;
  /**
   * Toggles the checkbox by default
   */
  defaultChecked?: boolean;
}

interface State {
  value: boolean;
}

/**
 * Checkbox to mark rows as selected
 */
class SelectionToggleComponent extends Component<Props, State> {
  private cancellation = new Cancellation();

  static contextTypes = SelectionGroupContextTypes;
  context: SelectionGroupContext;

  constructor(props, context) {
    super(props, context);
    this.state = {
      value: context.getSelectionValue ? context.getSelectionValue(props.tag) : false,
    };
  }

  componentDidMount() {
    if (this.props.defaultChecked) {
      this.toggleSelection();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.value !== prevState.value) {
      trigger({
        eventType: SelectionEvents.Toggle,
        source: 'SelectionToggle',
        targets: [this.props.selection],
        data: { value: this.state.value, tag: this.props.tag },
      });
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    return <input type="checkbox" checked={this.state.value} onChange={this.toggleSelection} />;
  }

  private toggleSelection = () => {
    this.setState((prevState: State): State => ({ value: !prevState.value }));
  };
}

export default SelectionToggleComponent;
