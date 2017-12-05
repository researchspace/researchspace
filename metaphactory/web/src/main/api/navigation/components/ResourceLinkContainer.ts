/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { Props as ReactProps, createElement,
         cloneElement, Children } from 'react';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource, NavigationUtils } from 'platform/api/navigation';
import { Draggable } from 'platform/components/dnd';
import { Component } from 'platform/api/components';

/**
 * See 'Link'.
 */
export interface ResourceLinkContainerConfig {

  /**
   * resource IRI to navigate
   */
  uri: string;

  /**
   * Specify if link should be draggable, e.g. into sets.
   *
   * @default true
   */
  draggable?: boolean;

  /**
   * 'urlqueryparam-*' attribute specify additional url query parameters
   * that will be attached to the resulting url
   */
  params?: {[name: string]: string};
}
export type ResourceLinkContainerProps =
  ResourceLinkContainerConfig & ReactProps<ResourceLinkContainer>;

export class ResourceLinkContainer extends Component<ResourceLinkContainerProps, {}> {
  onClick = (event) => {
    navigateToResource(
      Rdf.iri(this.props.uri), NavigationUtils.extractParams(this.props),
      this.context.semanticContext ? this.context.semanticContext.repository : undefined
    ).onValue(() => {/**/});
  }

  render() {
    const props = {
      onClick: this.onClick,
    };
    if (this.props.draggable === false) {
      return cloneElement(<any>Children.only(this.props.children), props);
    } else {
      return createElement(Draggable,
        {iri: this.props.uri},
        cloneElement(<any>Children.only(this.props.children), props)
      );
    }
  }
}
export default ResourceLinkContainer;
