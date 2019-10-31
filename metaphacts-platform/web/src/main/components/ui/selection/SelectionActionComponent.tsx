/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import { Component } from 'react';
import { MenuItem } from 'react-bootstrap';
import { MenuProps, ActionProps, TitleProps } from './SelectionActionProps';

type Props = MenuProps & ActionProps & TitleProps;

/**
 * Menu items for actions on selection
 */
export class SelectionActionComponent extends Component<Props, {}> {
  render() {
    return <MenuItem
      eventKey={1}
      onSelect={this.onSelect}
      disabled={this.props.disabled}
    >
      {this.props.title}
    </MenuItem>;
  }

  private onSelect = () => {
    this.props.onAction(this.props.selection);
    this.props.closeMenu();
  }
}

export default SelectionActionComponent;
