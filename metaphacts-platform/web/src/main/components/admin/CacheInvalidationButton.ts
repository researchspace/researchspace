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

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';

import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';

import { invalidateAllCaches } from 'platform/api/services/cache';

import {Alert, AlertType, AlertConfig} from 'platform/components/ui/alert';

const Button = createFactory(ReactBootstrap.Button);

interface State {
  alert: Data.Maybe<AlertConfig>;
}

class InvalidateCacheButton extends Component<{}, State>  {
  constructor(props) {
    super(props);
    this.state = {
      alert: maybe.Nothing<AlertConfig>(),
    };
  }

  public render() {
    return D.div({}, [
      createElement(Alert, this.state.alert.map(config => config).getOrElse(
        { alert: AlertType.NONE, message: '' }
      )),
      Button({
          type: 'submit',
          bsSize: 'small',
          bsStyle: 'primary',
          className: 'btn btn-default',
          onClick: this.onClick,
        }, 'Invalidate All Caches'),
      ]);
  }


  private onClick = (): void => {
    invalidateAllCaches().onValue(
      v => this.setState({
        alert: maybe.Just({
          message: v,
          alert: AlertType.SUCCESS,
        }),
      })
    ).onError(
      e => this.setState({
        alert: maybe.Just({
          message: 'Cache invalidation failed: ' + e,
          alert: AlertType.DANGER,
        }),
      })
    );
  }
}

export type component = InvalidateCacheButton;
export const component = InvalidateCacheButton;
export const factory = createFactory(component);
export default component;
