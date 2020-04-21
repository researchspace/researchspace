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

import { Component, createElement } from 'react';
import * as D from 'react-dom-factories';

import { Spinner } from 'platform/components/ui/spinner';

interface State {
  showBackdrop: boolean;
}

/**
 * Covers the full screen with an overlay. Useful when one need to prevent user
 * form clicking while something is in progress.
 *
 * Element is adaptable and is shown only in 0.5 seconds to avoid annoying flickering
 * if some action takes less then that.
 */
export class LoadingBackdrop extends Component<{}, State> {
  private showBackdropTimeout;

  constructor(props) {
    super(props);
    this.state = {
      showBackdrop: false,
    };
  }

  componentDidMount() {
    this.showBackdropTimeout = setTimeout(() => this.setState({ showBackdrop: true }), 500);
  }

  componentWillUnmount() {
    clearTimeout(this.showBackdropTimeout);
  }

  render() {
    return this.state.showBackdrop ? D.div({ className: 'modal-backdrop in' }, createElement(Spinner)) : D.div({});
  }
}
