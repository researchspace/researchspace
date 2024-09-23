/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import * as React from "react";
import {Children, CSSProperties, InputHTMLAttributes} from "react";

import * as classnames from 'classnames';

export interface SelectLabelProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  style?: CSSProperties;
  defaultTitle?: string;
  onClickHandler?: () => void;
}

const CLASS_NAME = 'select-label';

export class SelectLabel extends React.Component<SelectLabelProps> {
  static defaultProps: Partial<SelectLabelProps> = {
    defaultTitle: 'Select input',
  };

  constructor(props: SelectLabelProps, context: any) {
    super(props, context);
  }

  render() {
    const { className, style, onClickHandler, children} = this.props;

    const groupClass = classnames(
      `${CLASS_NAME}`,
      className
    );

    const hasNonEmptyAddon = Children.count(children) > 0;

    return (
      <div className={groupClass} style={style} onClick={onClickHandler}>
        {hasNonEmptyAddon ? children : this.props.defaultTitle}
      </div>
    );
  }

}

