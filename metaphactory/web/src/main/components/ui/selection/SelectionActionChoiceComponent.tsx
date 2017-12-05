/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

/**
 * @author Philip Polkovnikov
 */

import * as React from 'react';
import { Component, Children, ReactNode, cloneElement, ReactElement, SyntheticEvent } from 'react';
import { DropdownButton } from 'react-bootstrap';
import * as _ from 'lodash';
import { Event } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { GlobalEventsContext, GlobalEventsContextTypes } from 'platform/api/events';
import { SelectionEvents, ToggleDescription } from 'platform/components/ui/selection';

interface Props {
  /**
   * id prop is required to make dropdown available to screen reader software
   */
  id: string,

  /**
   * Action group name
   */
  selection: string

  /**
   * Dropdown caption
   */
  title: string

  /**
   * CSS style
   */
  style?: any

  /**
   * CSS class
   */
  className?: string
}

interface State {
  values: { [tag: string]: boolean; };

  open: boolean;
}

export class SelectionActionChoiceComponent extends Component<Props, State> {
  public static readonly contextTypes = GlobalEventsContextTypes;
  context: GlobalEventsContext;

  private cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);
    this.state = {
      values: {},
      open: false,
    };
  }

  componentDidMount() {
    this.cancellation.map(
      this.context.GLOBAL_EVENTS.listen({
        eventType: SelectionEvents.Toggle,
        target: this.props.selection,
      })
    ).onValue(this.onSelectionChange);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  onSelectionChange = (event: Event<any>) => {
    const data = event.data;
    const newValues = _.assign(
      {},
      this.state.values,
      {[data.tag]: data.value}
    );
    this.setState({values: newValues});
  }

  render() {
    return this.renderTypeSelector();
  }

  private renderTypeSelector = () => {
    const selection = (_.toPairs(this.state.values) as [string, boolean][])
      .filter((pair) => pair[1])
      .map(([key, value]) => key);
    const {style, title, children} = this.props;
    return <DropdownButton
      id={this.props.id}
      disabled={_.isEmpty(this.state.values) ||
                _.every(this.state.values, val => val === false)}
      open={this.state.open}
      onToggle={this.onDropdownToggle}
      style={style}
      title={title}
    >
      {Children.map(children, (child: ReactElement<any>) =>
        cloneElement(child, {selection, closeMenu: this.closeMenu})
      )}
    </DropdownButton>;
  }

  private closeMenu = () => {
    this.setState({open: false});
  }

  private onDropdownToggle = (isOpen: boolean) => {
    this.setState({open: isOpen});
  }
}
export default SelectionActionChoiceComponent;
