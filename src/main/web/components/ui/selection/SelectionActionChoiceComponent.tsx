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
import { Component, Children, ReactNode, cloneElement, ReactElement, SyntheticEvent } from 'react';
import { DropdownButton } from 'react-bootstrap';
import * as _ from 'lodash';
import { Event, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { SelectionEvents } from 'platform/components/ui/selection';
import { SelectionGroupContext, SelectionGroupContextTypes } from './SelectionGroupComponent';

interface Props {
  /**
   * id prop is required to make dropdown available to screen reader software
   */
  id: string;

  /**
   * Action group name
   */
  selection: string;

  /**
   * Dropdown caption
   */
  title: string;

  /**
   * CSS style
   */
  style?: any;

  /**
   * CSS class
   */
  className?: string;
}

interface State {
  values?: { [tag: string]: boolean };

  open?: boolean;
}

export class SelectionActionChoiceComponent extends Component<Props, State> {
  private cancellation = new Cancellation();

  static contextTypes = SelectionGroupContextTypes;
  context: SelectionGroupContext;

  constructor(props, context) {
    super(props, context);
    this.state = {
      values: {},
      open: false,
    };
  }

  componentDidMount() {
    this.cancellation
      .map(
        listen({
          eventType: SelectionEvents.Toggle,
          target: this.props.selection,
        })
      )
      .onValue(this.onSelectionChange);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.values !== prevState.values && this.context.onChange) {
      this.context.onChange(this.state.values);
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  onSelectionChange = (event: Event<any>) => {
    const data = event.data;
    this.setState((prevState: State): State => ({ values: { ...prevState.values, [data.tag]: data.value } }));
  };

  render() {
    return this.renderTypeSelector();
  }

  private renderTypeSelector = () => {
    const selection = (_.toPairs(this.state.values) as [string, boolean][])
      .filter((pair) => pair[1])
      .map(([key, value]) => key);
    const { style, title, children } = this.props;
    return (
      <DropdownButton
        id={this.props.id}
        disabled={_.isEmpty(this.state.values) || _.every(this.state.values, (val) => val === false)}
        open={this.state.open}
        onToggle={this.onDropdownToggle}
        style={style}
        title={title}
      >
        {Children.map(children, (child: ReactElement<any>) =>
          cloneElement(child, { selection, closeMenu: this.closeMenu })
        )}
      </DropdownButton>
    );
  };

  private closeMenu = () => {
    this.setState({ open: false });
  };

  private onDropdownToggle = (isOpen: boolean) => {
    this.setState({ open: isOpen });
  };
}
export default SelectionActionChoiceComponent;
