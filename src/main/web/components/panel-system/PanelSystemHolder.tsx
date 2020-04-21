/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { cloneElement, Children } from 'react';

import { Cancellation } from 'platform/api/async/Cancellation';
import { listen } from 'platform/api/events';

import PageLoaderComponent from 'platform/components/ui/page-loader';
import { isValidChild, componentHasType } from 'platform/components/utils';
import { OntodiaPanel } from './OntodiaPanel';
import { IIIFViewerPanel } from './IIIFViewerPanel';
import * as PanelSystemEvents from './PanelSystemEvents';

import * as styles from './PanelSystem.scss';

enum Holder {
  PageLoader = 'page-loader',
  IIIFViewer = 'iiif-viewer',
  GraphAuthoring = 'graph-authoring',
}

export interface Props {
  id?: string;
  defaultHolder?: Holder;
  onChangeHolder?: () => void;
}

export interface State {
  holder?: Holder;
  data?: any;
  /**
   * Force update holders
   */
  holderKey?: number;
}

/**
 * This component can be used only inside <rs-panel-system> component.
 *
 * @example
 * <rs-panel-system-holder id="panel-system-holder">
 *     <mp-page-loader id='resource-template' iri='http://example.com/demo'></mp-page-loader>
 *     <rs-iiif-viewer-panel [[> rsp:IIIFConfig]]
 *        query="SELECT ?image WHERE { ?subject crm:P138i_has_representation ?image }">
 *     </rs-iiif-viewer-panel>
 * </rs-panel-system-holder>
 */
export class PanelSystemHolder extends React.Component<Props, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: Props) {
    super(props);
    this.state = {
      holder: props.defaultHolder,
      holderKey: 0,
    };
  }

  componentDidMount() {
    const { id: target } = this.props;
    this.cancellation
      .map(listen({ eventType: PanelSystemEvents.ShowResource, target }))
      .onValue(({ data }) => this.updateHolder({ holder: Holder.PageLoader, data }));

    this.cancellation
      .map(listen({ eventType: PanelSystemEvents.InitiateIIIFViewer, target }))
      .onValue(({ data }) => this.updateHolder({ holder: Holder.IIIFViewer, data }));

    this.cancellation
      .map(listen({ eventType: PanelSystemEvents.InitiateGraphAuthoring, target }))
      .onValue(({ data }) => this.updateHolder({ holder: Holder.GraphAuthoring, data }));
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.holder !== prevState.holder || this.state.data !== prevState.data) {
      this.props.onChangeHolder();
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private updateHolder({ holder, data }: Partial<State>) {
    this.setState(({ holderKey }) => ({ holder, holderKey: holderKey + 1, data }));
  }

  private mapChildren(children: React.ReactNode) {
    const { holder, data, holderKey } = this.state;
    return Children.map(children, (child) => {
      if (isValidChild(child)) {
        if (
          holder === Holder.PageLoader &&
          componentHasType(child, PageLoaderComponent) &&
          child.props.id === data.pageId
        ) {
          return cloneElement(child, { key: holderKey, ...data.pageProps });
        }
        if (
          (holder === Holder.GraphAuthoring && componentHasType(child, OntodiaPanel)) ||
          (holder === Holder.IIIFViewer && componentHasType(child, IIIFViewerPanel))
        ) {
          return cloneElement(child, { key: holderKey, ...data });
        }
        return null;
      }
      return child;
    });
  }

  render() {
    return <div className={styles.panelHolder}>{this.mapChildren(this.props.children)}</div>;
  }
}

export default PanelSystemHolder;
