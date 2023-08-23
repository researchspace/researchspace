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
  iconName: string;
  iconType: string;
}

const CLASS_NAME = 'material-icons-';

export class Icon extends React.Component<IconProps> {

  render() {
    const {iconName, iconType, className, ...iconProps} = this.props
    const controlClass = classnames(`${CLASS_NAME}${iconType}`, className);
    return (
        <i className={`${controlClass}`} {...iconProps} aria-hidden="true">{iconName}</i>
    );
  }
}

export default Icon
