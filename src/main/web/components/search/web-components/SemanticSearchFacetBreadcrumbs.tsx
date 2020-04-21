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

import { Component } from 'platform/api/components';
import {
  SemanticSearchContext,
  FacetContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import { FacetBreadcrumbsComponent } from '../facet/breadcrumbs/FacetBreadcrumbs';

class SemanticSearchFacetBreadcrumbs extends Component<{}, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <SemanticSearchFacetBreadcrumbsInner {...this.props} context={context} />}
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
