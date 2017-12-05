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

import {
  DOM as D, createFactory, Component, ReactElement, createElement,
} from 'react';
import {isEqual} from 'lodash';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';


import { Rdf } from 'platform/api/rdf';
import * as PageService from 'platform/api/services/page';
import { listen, getCurrentRepository } from 'platform/api/navigation';
import { SemanticContextProvider } from 'platform/api/components';
import { ModuleRegistry } from 'platform/api/module-loader';
import { ErrorNotification } from 'platform/components/ui/notification';
import { LoadingBackdrop } from 'platform/components/utils';

interface Props {
  iri: Rdf.Iri;
  context?: Rdf.Iri;
  params?: { [index: string]: string };
}

interface State {
  pageContent?: Array<ReactElement<any>> | ReactElement<any>;
  loading: boolean;
  errorMessage?: Data.Maybe<string>;
}

export class PageViewerComponent extends Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
      errorMessage: maybe.Nothing<string>(),
    };
  }

  public componentDidMount() {
    this.loadPage(this.props);

    /* when someone refreshes the page with API we need to reload the page*/
    listen({
      eventType: 'NAVIGATED',
      callback: event => {
        if (event.action === 'REFRESH') {
          this.loadPage(this.props);
        }
      },
    });
  }

  public componentDidUpdate() {
    window.scroll(0, 0); // scroll to top when we navigated to the page
  }

  public componentWillReceiveProps(nextProps) {
    if (isEqual(this.props, nextProps) === false) {
      this.loadPage(nextProps);
    }
  }


  public render() {
    if (this.state.errorMessage.isJust) {
      return createElement(ErrorNotification, {errorMessage: this.state.errorMessage.get()});
    }

    /* This special construction here is for a good reason!
     * In templates we support special attribute 'fixed-key' which
     * guaranties that if one navigates from page to page and there is
     * component with the same 'fixed-key', then it will not be remounted.
     *
     * To support this use case we should always preserve components tree root.
     * E.g when page content is loading we can't just replace
     * 'template-content' div with Spinner, because
     * then the whole tree will be destroyed.
     */

    return createElement(
      SemanticContextProvider,
      {repository: getCurrentRepository()},
      D.div(
        {
        id: 'template-content',
      },
        this.state.loading ? createElement(LoadingBackdrop) : null,
        this.state.pageContent
      )
    );
  }

  private loadPage = (props: Props) => {
    this.setState({loading: true});
    this.loadAndParseTemplate(props.iri, props.context, props.params).onValue(content =>
      this.setState({
        pageContent: content,
          loading: false,
      })
    ).onError( err => {
      this.setState({
        loading: false,
        errorMessage: maybe.Just(err),
      });
    }
  );
  }
  /**
   * [loadResourceContent description]
   * @param  {PageViewerProps} pageIri       [description]
   * @param  {Rdf.Iri}         pageContextIri Optional parameter to request for a page rendering
   *                                          with page context different to the resource being
   *                                          requested.
   * @return {Kefir.Property}              [description]
   */
  private loadAndParseTemplate(
    pageIri: Rdf.Iri,
    pageContextIri?: Rdf.Iri,
    params?: { [index: string]: string }
  ): Kefir.Property<ReactElement<any>[] | ReactElement<any>> {
      return PageService.PageService.loadRenderedTemplate(
        pageIri, pageContextIri, params
      ).flatMap(
        page =>
          Kefir.fromPromise(
            ModuleRegistry.parseHtmlToReact(
            `
              <div>
                ${page.templateHtml}
              </div>
            `
            ).then(
              res => (res as ReactElement<any>).props.children // get rid of artificial div
            )
          )
      ).toProperty();
  }
}

export const PageViewer = createFactory(PageViewerComponent);
export default PageViewer;
