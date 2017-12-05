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

import * as classNames from 'classnames';
import { Component, DOM as D, CSSProperties, createFactory } from 'react';

export interface SpinnerProps {
  className?: string;
  /** Delay before spinning gear shows up. */
  spinnerDelay?: number;
  /** Delay before wait message shows up. */
  messageDelay?: number;
  style?: CSSProperties;
}

export interface SpinnerState {
  showMessage?: boolean;
  showSpinner?: boolean;
}

/**
 * Shows spinner only if something takes more than 0.5 second.
 */
export class SpinnerComponent extends Component<SpinnerProps, SpinnerState> {
  static readonly defaultProps: Partial<SpinnerProps> = {
    spinnerDelay: 500,
    messageDelay: 2000,
  };

  private showSpinnerTimeout;
  private showMessageTimeout;

  componentDidMount() {
    this.showSpinnerTimeout =
      setTimeout(
        () => this.setState({showSpinner: true}),
        this.props.spinnerDelay
      );
    this.showMessageTimeout =
      setTimeout(
        () => this.setState({showMessage: true}),
        this.props.messageDelay
      );
  }

  componentWillUnmount() {
    clearTimeout(this.showSpinnerTimeout);
    clearTimeout(this.showMessageTimeout);
  }

  constructor(props: SpinnerProps) {
    super(props);
    this.state = {
      showMessage: false,
      showSpinner: false,
    };
  }

  render() {
    return D.span(
      {
        className: classNames('system-spinner', this.props.className),
        style: this.props.style,
      },
      this.state.showSpinner ? D.i({className: 'system-spinner__icon'}) : null,
      this.state.showMessage
        ? D.span({className: 'system-spinner__message'}, 'Please wait...')
        : null,
    );
  }
}

export const Spinner = createFactory(SpinnerComponent);
export default Spinner;
