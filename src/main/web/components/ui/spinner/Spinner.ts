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

import * as classNames from 'classnames';
import { Component, CSSProperties, createFactory } from 'react';
import * as D from 'react-dom-factories';

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

  private showSpinnerTimeout: any;
  private showMessageTimeout: any;

  componentDidMount() {
    if (Number.isFinite(this.props.spinnerDelay)) {
      this.showSpinnerTimeout = setTimeout(() => this.setState({ showSpinner: true }), this.props.spinnerDelay);
    }
    if (Number.isFinite(this.props.messageDelay)) {
      this.showMessageTimeout = setTimeout(() => this.setState({ showMessage: true }), this.props.messageDelay);
    }
  }

  componentWillUnmount() {
    if (typeof this.showSpinnerTimeout !== 'undefined') {
      clearTimeout(this.showSpinnerTimeout);
    }
    if (typeof this.showMessageTimeout !== 'undefined') {
      clearTimeout(this.showMessageTimeout);
    }
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
      this.state.showSpinner ? D.i({ className: 'system-spinner__icon' }) : null,
      this.state.showMessage ? D.span({ className: 'system-spinner__message' }, 'Please wait...') : null
    );
  }
}

export const Spinner = createFactory(SpinnerComponent);
export default Spinner;
