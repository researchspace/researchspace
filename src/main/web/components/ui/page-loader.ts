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
import { isEqual } from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { NavigationUtils, getCurrentResource, getCurrentUrl } from 'platform/api/navigation';

import PageViewer from '../../app/page/PageViewer';
import { Alert, AlertType } from 'platform/components/ui/alert';

/**
 * Simple wrapper around {@PageViewer} component to be invoked from HTML code.
 * Takes a simple iri string as input parameter and passes it on as {@Rdf.Iri} to the {@PageViewer}
 * in order to load and render the requested page.
 *
 * The context of the requested page will be set to the current {@ResourceContext.resource}.
 * By design the context is not supposed to be re-written to a different resource
 * (i.e. by providing an additional input parameter to this component).
 *
 * Component inherits all query parameters from the current page.
 *
 * @example
 * 	<mp-page-loader iri="http://www.researchspace.org/resource/Start"></mp-page-loader>
 *
 * @example
 * 	With additional URL parameter(s).
 * 	<mp-page-loader
 * 		iri="http://www.researchspace.org/resource/Start"
 * 	 	urlqueryparam-param1="hello world"
 * 	></mp-page-loader>
 */
class PageLoaderComponent extends Component<{ iri: string, context?: string }, {}> {
  public shouldComponentUpdate(nextProps) {
    return !isEqual(this.props, nextProps);
  }

  constructor(props) {
    super(props);
  }

  public render() {
    if (!this.props.iri || this.props.iri.length < 1) {
      return createElement(Alert, {
        alert: AlertType.DANGER,
        message: 'Page loader component requires an non empty iri parameter as input.',
      });
    } else {
      return PageViewer({
        iri: Rdf.iri(this.props.iri),
        context: this.props.context ? Rdf.iri(this.props.context) : getCurrentResource(),
        noScroll: true,
        params: { ...getCurrentUrl().search(true), ...NavigationUtils.extractParams(this.props) },
      });
    }
  }
}

export type component = PageLoaderComponent;
export const component = PageLoaderComponent;
export const factory = createFactory(component);
export default component;
