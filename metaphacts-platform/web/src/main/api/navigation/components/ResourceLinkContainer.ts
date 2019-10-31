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

import { Props as ReactProps, createElement,
         cloneElement, Children, MouseEvent } from 'react';

import { Rdf } from 'platform/api/rdf';
import {
  navigateToResource, NavigationUtils, openResourceInNewWindow,
} from 'platform/api/navigation';
import { Draggable } from 'platform/components/dnd';
import { Component } from 'platform/api/components';
import { isSimpleClick } from './ResourceLink';

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
   * Equivalent to the `target` attribute of the `<a>` DOM element.
   * Can be set to `_blank` to open the link in a new tab/window.
   *
   * @default '_self'
   */
  target?: '_self' | '_blank';

  // catcher for query params
  [index: string]: any;
}
export type ResourceLinkContainerProps =
  ResourceLinkContainerConfig & ReactProps<ResourceLinkContainer>;

export class ResourceLinkContainer extends Component<ResourceLinkContainerProps, {}> {
  static defaultProps = {
    target: '_self',
  };

  onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const iri = Rdf.iri(this.props.uri);
    const repository =
      this.context.semanticContext ? this.context.semanticContext.repository : undefined;
    const params = NavigationUtils.extractParams(this.props);

    if (isSimpleClick(event) && this.props.target === '_self') {
      navigateToResource(iri, params, repository).onValue(() => {/**/});
    } else {
      openResourceInNewWindow(iri, params, repository);
    }
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
