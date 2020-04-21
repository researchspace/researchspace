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
import * as React from 'react';
import { InputHTMLAttributes, CSSProperties, Children } from 'react';
import * as classnames from 'classnames';

import './clearable-input.scss';

export interface ClearableInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  style?: CSSProperties;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  clearTitle?: string;
  onClear: () => void;
}

interface State {
  readonly focused?: boolean;
}

const CLASS_NAME = 'clearable-input';

export class ClearableInput extends React.Component<ClearableInputProps, State> {
  static defaultProps: Partial<ClearableInputProps> = {
    clearTitle: 'Clear input',
  };

  private input: HTMLInputElement;

  constructor(props: ClearableInputProps, context: any) {
    super(props, context);
    this.state = { focused: false };
  }

  render() {
    const { className, style, inputClassName, inputStyle, onClear, clearTitle, children, ...inputProps } = this.props;

    const hasNonEmptyAddon = Children.count(children) > 0;

    const groupClass = classnames(
      `${CLASS_NAME} input-group has-feedback`,
      this.state.focused ? `${CLASS_NAME}--focused` : undefined,
      className
    );
    const controlClass = classnames(`${CLASS_NAME}__input form-control`, inputClassName);

    return (
      <div className={groupClass} style={style} onClick={this.onClickSelf}>
        {hasNonEmptyAddon ? children : null}
        <div className={`${CLASS_NAME}__input-with-clear`}>
          <input
            type="text"
            {...inputProps}
            ref={this.onInputMount}
            className={controlClass}
            style={inputStyle}
            placeholder={hasNonEmptyAddon ? undefined : inputProps.placeholder}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
          />
          <div className={`${CLASS_NAME}__clear`} title={clearTitle} onClick={onClear}>
            <span className="fa fa-times" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    );
  }

  private onInputMount = (input: HTMLInputElement) => {
    this.input = input;
  };

  private onClickSelf = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target && this.input) {
      this.input.focus();
    }
  };

  private onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    this.setState({ focused: true });
    const { onFocus } = this.props;
    if (onFocus) {
      onFocus(e);
    }
  };

  private onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    this.setState({ focused: false });
    const { onBlur } = this.props;
    if (onBlur) {
      onBlur(e);
    }
  };
}
