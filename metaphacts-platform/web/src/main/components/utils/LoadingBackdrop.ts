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

import { Component, createElement } from 'react';
import * as D from 'react-dom-factories';

import { Spinner } from 'platform/components/ui/spinner';

interface State {
  showBackdrop: boolean
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
    this.showBackdropTimeout =
      setTimeout(
        () => this.setState({showBackdrop: true}), 500
      );
  }

  componentWillUnmount() {
    clearTimeout(this.showBackdropTimeout);
  }

  render() {
    return this.state.showBackdrop ?
      D.div(
        {className: 'modal-backdrop in'},
        createElement(Spinner)
      ) : D.div({}) ;
  }
}
