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

import { Component, createElement } from 'react';
import * as D from 'react-dom-factories';

import { getCurrentResource, getCurrentUrl, getCurrentRepository } from 'platform/api/navigation';
import { BaseSemanticContextProvider } from 'platform/api/components';
import { ComponentsLoader } from 'platform/api/module-loader';
import { RepositoryConfigInitializer } from
             'platform/components/admin/repositories/RepositoryConfigInitializer';
import { DefaultRepositoryInfo } from 'platform/api/services/repository';

import PageToolbar from './PageToolbar';
import PageViewer from './PageViewer';

export class PageComponent extends Component<{}, {}> {
  public render() {
    const props = {iri: getCurrentResource(), params: getCurrentUrl().search(true)};
    const pageComponent =
      getCurrentUrl().hasQuery('action', 'edit') ?
      ComponentsLoader.factory({
        componentTagName: 'mp-internal-page-editor', componentProps: props,
      }) : PageViewer(props);

    return createElement(BaseSemanticContextProvider,
      {repository: getCurrentRepository()},  D.div(
        {className: 'page-holder'},
        PageToolbar(props),
        DefaultRepositoryInfo.isValidDefault()
            ? pageComponent
            : createElement(RepositoryConfigInitializer)
      )
    );
  }
}

export default PageComponent;
