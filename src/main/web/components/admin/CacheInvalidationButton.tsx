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

import { Component, createFactory, createElement } from 'react';
import * as React from 'react';
import * as D from 'react-dom-factories';

import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';

import { invalidateAllCaches } from 'platform/api/services/cache';

import { Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';

const Button = createFactory(ReactBootstrap.Button);
const OverlayTrigger = createFactory(ReactBootstrap.OverlayTrigger);
const Popover = createFactory(ReactBootstrap.Popover);

interface State {
  alert: Data.Maybe<AlertConfig>;
}


const PopupContent = (
  <div>
    <h5>Cache Invalidation</h5>
    <p>Certain system functionality relies heavily on caches such as for fetching resource labels or computing
      templates.</p>
    <p>Cache entries are usually automatically invalidated after a certain period of time.</p>
    <p>However, during development or system configuration i.e. when data is updated or system configuration such as
      the template include query changes, it might be required to manually invalidate the caches.</p>
  </div>
)


class InvalidateCacheButton extends Component<{}, State> {
  private triggerRef: ReactBootstrap.OverlayTrigger | null = null;

  constructor(props) {
    super(props);
    this.state = {
      alert: maybe.Nothing<AlertConfig>(),
    };
  }

  public render() {
    return D.div({}, 
      D.div({className:'invalidate-cache-container'},
        Button(
          {
            type: 'submit',
            className: 'btn-default btn-textAndIcon',
            onClick: this.onClick,
          },
          D.i({className: 'material-icons-round'}, 'cached'),
          'Invalidate all caches'
        ),
        OverlayTrigger(
          {
            ref: (node) => { this.triggerRef = node; },
            trigger: ['click', 'hover', 'focus'],
            placement: 'top',
            rootClose: true,
            overlay: Popover({ id: 'help' }, PopupContent),
          },
          D.div({className:'btn btn-default', style: { width: 'min-content' }},   D.i({className: 'material-icons-round'}, 'question_mark'))
        ),
      ),
      D.div({ style: { paddingTop: '10px' } },
        createElement(Alert, this.state.alert.map((config) => config).getOrElse({ alert: AlertType.NONE, message: '' })),
      )
    );
  }

/*   OverlayTrigger(
    {
      trigger: [],
      ref: 'trigger',
      placement: 'top',
      overlay: Popover({ id: 'help' }, cloneElement(this.props.dropComponents.disabledHover)),
      defaultOverlayShown: false,
    },
    result
  ) */

/*   <mp-popover title="Cache Invalidation">
              <mp-popover-trigger placement="right"  trigger='["hover"]'> 
                <rs-icon icon-type="rounded" icon-name="help" symbol="true" style="margin-left: 5px; font-size: 15px;"></rs-icon>
              </mp-popover-trigger>
              <mp-popover-content>
                <div>
                  <p>Certain system functionality relies heavily on caches such as for fetching resource labels or computing
                    templates.</p>
                  <p>Cache entries are usually automatically invalidated after a certain period of time.</p>
                  <p>However, during development or system configuration i.e. when data is updated or system configuration such as
                    the template include query changes, it might be required to manually invalidate the caches.</p>
                </div>
              </mp-popover-content>
            </mp-popover> */

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