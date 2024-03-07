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
}

export class Icon extends React.Component<IconProps> {
  render() {
    const {symbol, iconName, iconType, className, ...iconProps} = this.props
    const CLASS_NAME = symbol ? 'material-symbols-' : 'material-icons-';
    const controlClass = classnames(`${CLASS_NAME}${iconType}`, className);
    return (
        <i className={`${controlClass}`} {...iconProps} aria-hidden="true">{iconName}</i>
    );
  }
}

export default Icon
