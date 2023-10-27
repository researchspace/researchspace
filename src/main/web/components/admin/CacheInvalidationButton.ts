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

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';

import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';

import { invalidateAllCaches } from 'platform/api/services/cache';

import { Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';

const Button = createFactory(ReactBootstrap.Button);

interface State {
  alert: Data.Maybe<AlertConfig>;
}

class InvalidateCacheButton extends Component<{}, State> {
  constructor(props) {
    super(props);
    this.state = {
      alert: maybe.Nothing<AlertConfig>(),
    };
  }

  public render() {
    return D.div({}, [
      Button(
        {
          type: 'submit',
          className: 'btn-cache',
          onClick: this.onClick,
        },
        D.i({className: 'fa fa-history'}),
        'Invalidate All Caches'
      ),
      createElement(Alert, this.state.alert.map((config) => config).getOrElse({ alert: AlertType.NONE, message: '' })),
    ]);
  }

  private onClick = (): void => {
    invalidateAllCaches()
      .onValue((v) =>
        this.setState({
          alert: maybe.Just({
            message: v,
            alert: AlertType.SUCCESS,
          }),
        })
      )
      .onError((e) =>
        this.setState({
          alert: maybe.Just({
            message: 'Cache invalidation failed: ' + e,
            alert: AlertType.DANGER,
          }),
        })
      );
  };
}

export type component = InvalidateCacheButton;
export const component = InvalidateCacheButton;
export const factory = createFactory(component);
export default component;