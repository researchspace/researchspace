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

import {
  ReactElement, cloneElement, Children, Props as ReactProps, createFactory,
} from 'react';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';
import { refresh, navigateToResource } from 'platform/api/navigation';

interface Props  extends ReactProps<RemoveFromContainerComponent> {
  container: string;
  iri: string;

  /**
   * @default 'reload'
   */
  postAction?: 'reload' | string;
}

class RemoveFromContainerComponent extends Component<Props, {}>  {
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
    new LdpService(this.props.container, this.context.semanticContext).deleteResource(
      Rdf.iri(this.props.iri)
    ).onValue(
      () => {
        if (this.props.postAction === 'reload') {
          refresh();
        } else {
          navigateToResource(Rdf.iri(this.props.postAction)).onValue(v => v);
        }
      }
    );
  }
}


export type component = RemoveFromContainerComponent;
export const component = RemoveFromContainerComponent;
export const factory = createFactory(component);
export default component;
