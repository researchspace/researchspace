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
import { MenuItem } from 'react-bootstrap';
import { MenuProps, ActionProps, TitleProps } from './SelectionActionProps';

type Props = MenuProps & ActionProps & TitleProps;

/**
 * Menu items for actions on selection
 */
export class SelectionActionComponent extends Component<Props, {}> {
  render() {
    return (
      <MenuItem eventKey={1} onSelect={this.onSelect} disabled={this.props.disabled}>
        {this.props.title}
      </MenuItem>
    );
  }

  private onSelect = () => {
    this.props.onAction(this.props.selection);
    this.props.closeMenu();
  };
}

export default SelectionActionComponent;
