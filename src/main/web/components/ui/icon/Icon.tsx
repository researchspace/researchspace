/**
 * ResearchSpace
 * Copyright (C) 2023, Kartography
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
import * as React from 'react';
import { HTMLAttributes, CSSProperties, Children } from 'react';
import * as classnames from 'classnames';


export interface IconProps extends HTMLAttributes<HTMLElement> {
  className?: string;
  symbol?: boolean; // set to true if you want to use Material symbol instead of Material icon
  iconName: string;
  iconType: string;
  toggledIconName?: string;
}

interface IconState {
  toggled: boolean;
}

export class Icon extends React.Component<IconProps, IconState> {
  constructor(props: IconProps) {
    super(props);
    this.state = { toggled: false };
  }

  handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (this.props.toggledIconName) {
      this.setState(prevState => ({ toggled: !prevState.toggled }));
    }
    if (this.props.onClick) {
      this.props.onClick(e);
    }
  }

  render() {
    const {symbol, iconName, iconType, className, toggledIconName, onClick, ...iconProps} = this.props
    const currentIconName = (this.state.toggled && toggledIconName) ? toggledIconName : iconName;
    const CLASS_NAME = symbol ? 'material-symbols-' : 'material-icons-';
    const controlClass = classnames(`${CLASS_NAME}${iconType}`, className);
    return (
        <i className={`${controlClass}`} onClick={this.handleClick} {...iconProps} aria-hidden="true">{currentIconName}</i>
    );
  }
}

export default Icon
