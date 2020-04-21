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

import { ReactElement, cloneElement, Children, Props as ReactProps, createFactory } from 'react';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';
import { refresh, navigateToResource } from 'platform/api/navigation';

interface Props extends ReactProps<RemoveFromContainerComponent> {
  container: string;
  iri: string;

  /**
   * @default 'reload'
   */
  postAction?: 'reload' | string;
}

class RemoveFromContainerComponent extends Component<Props, {}> {
  public static defaultProps = {
    postAction: 'reload',
  };

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {
      onClick: this.deleteItem,
    };
    return cloneElement(child, props);
  }

  private deleteItem = () => {
    new LdpService(this.props.container, this.context.semanticContext)
      .deleteResource(Rdf.iri(this.props.iri))
      .onValue(() => {
        if (this.props.postAction === 'reload') {
          refresh();
        } else {
          navigateToResource(Rdf.iri(this.props.postAction)).onValue((v) => v);
        }
      });
  };
}

export type component = RemoveFromContainerComponent;
export const component = RemoveFromContainerComponent;
export const factory = createFactory(component);
export default component;
