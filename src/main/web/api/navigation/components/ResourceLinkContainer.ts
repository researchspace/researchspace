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

import { Props as ReactProps, createElement, cloneElement, Children, MouseEvent } from 'react';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource, NavigationUtils, openResourceInNewWindow } from 'platform/api/navigation';
import { Draggable } from 'platform/components/dnd';
import { Component } from 'platform/api/components';
import { isSimpleClick } from './ResourceLink';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { ConfigHolder } from 'platform/api/services/config-holder';


export interface ResourceLinkContainerConfig {
  /**
   * resource IRI to navigate
   */
  uri: string;

  /**
   * Specify if link should be draggable, e.g. into sets.
   *
   * @default false
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
export type ResourceLinkContainerProps = ResourceLinkContainerConfig & ReactProps<ResourceLinkContainer>;

export class ResourceLinkContainer extends Component<ResourceLinkContainerProps, {}> {
  static defaultProps = {
    target: '_self',
    draggable: false,
  };

  onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const iri = Rdf.iri(this.props.uri);
    const repository = this.context.semanticContext ? this.context.semanticContext.repository : undefined;
    const params = NavigationUtils.extractParams(this.props);
    const dashboard = ConfigHolder.getDashboard();
    
    if (isSimpleClick(event) && this.props.target === '_self') {
      if ((params?.viewId) && (dashboard.value.indexOf(iri.toString(),0) != -1))
          trigger({ eventType: "Dashboard.AddFrame", source: "link" , data: params});
      else 
        navigateToResource(iri, params, repository).onValue(() => {
        /**/
      });
    } else {
      openResourceInNewWindow(iri, params, repository);
    }   
  };

  render() {
    const props = {
      onClick: this.onClick,
    };
    if (this.props.draggable === false) {
      return cloneElement(<any>Children.only(this.props.children), props);
    } else {
      return createElement(
        Draggable,
        { iri: this.props.uri },
        cloneElement(<any>Children.only(this.props.children), props)
      );
    }
  }
}
export default ResourceLinkContainer;
