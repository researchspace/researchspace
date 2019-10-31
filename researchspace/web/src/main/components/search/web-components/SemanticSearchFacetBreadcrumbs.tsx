/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import * as React from 'react';

import { Component } from 'platform/api/components';
import {
  SemanticSearchContext, FacetContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import { FacetBreadcrumbsComponent } from '../facet/breadcrumbs/FacetBreadcrumbs';

class SemanticSearchFacetBreadcrumbs extends Component<{}, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <SemanticSearchFacetBreadcrumbsInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps {
  context: FacetContext;
}

class SemanticSearchFacetBreadcrumbsInner extends React.Component<InnerProps> {
  render() {
    const ast = this.props.context.facetStructure.getOrElse(undefined);
    const actions = this.props.context.facetActions.getOrElse(undefined);

    if (ast && actions) {
      return <FacetBreadcrumbsComponent ast={ast} actions={actions} />;
    }

    return null;
  }
}

export default SemanticSearchFacetBreadcrumbs;
