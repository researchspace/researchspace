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

import { Props as ReactProps, Component, ReactElement, cloneElement, createElement } from 'react';
import * as D from 'react-dom-factories';
import { OrderedMap } from 'immutable';
import * as Maybe from 'data.maybe';

import { SemanticContext, SemanticContextProvider } from 'platform/api/components';

interface Props extends ReactProps<OverlaySystem> {}

interface StateItem {
  element: ReactElement<any>;
  context?: SemanticContext;
}
interface State {
  dialogs: OrderedMap<string, StateItem>;
}

/**
 * This is the holder of temporary top-level component, as dialog or overlay
 * OverlaySystem should be placed high in DOM tree to avoid being detached by react.
 * (now it's done in App.ts)
 *
 * Multiple overlays can be displayed at the same time.
 */
class OverlaySystemComponent extends Component<Props, State> {
  constructor(props: Props, context) {
    super(props, context);

    this.state = {
      dialogs: OrderedMap<string, StateItem>(),
    };
  }

  render() {
    return D.div(
      {},
      this.state.dialogs
        .map((modal, key) => {
          const semanticContext = Maybe.fromNullable(modal.context)
            .map((c) => c.semanticContext)
            .getOrElse({});
          const { repository, bindings } = semanticContext;
          return createElement(SemanticContextProvider, { key, repository, bindings }, modal.element);
        })
        .toArray()
    );
  }

  public show = (key: string, dialog: ReactElement<any>, context?: SemanticContext) => {
    this.setState({
      dialogs: this.state.dialogs.set(key, { element: dialog, context }),
    });
  };

  public hide = (key: string) => {
    this.setState({
      dialogs: this.state.dialogs.remove(key),
    });
  };

  public hideAll = () => {
    this.setState({
      dialogs: this.state.dialogs.clear(),
    });
  };
}

const OVERLAY_SYSTEM_REF = 'overlaySystem';
let _system: OverlaySystemComponent;

export interface OverlaySystem {
  show(key: string, dialog: ReactElement<any>, context?: SemanticContext): void;
  hide(key: string): void;
  hideAll(): void;
}

export function renderOverlaySystem() {
  return createElement(OverlaySystemComponent, { key: OVERLAY_SYSTEM_REF, ref: OVERLAY_SYSTEM_REF });
}

export function registerOverlaySystem(_this: React.Component<any, any>) {
  _system = _this.refs[OVERLAY_SYSTEM_REF] as OverlaySystemComponent;
}

export function getOverlaySystem(): OverlaySystem {
  return _system;
}
