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

import * as React from 'react';

import { SemanticSearchContext, ResultContext } from './SemanticSearchApi';

interface SemanticSearchResultHolderProps {
  children: React.ReactNode;
}

class SemanticSearchResultHolder extends React.Component<SemanticSearchResultHolderProps> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <SemanticSearchResultHolderInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticSearchResultHolderProps {
  context: ResultContext;
}

class SemanticSearchResultHolderInner extends React.Component<InnerProps> {
  render() {
    const child = React.Children.only(this.props.children);
    return this.props.context.resultQuery.map(
      query => child
    ).getOrElse(null);
  }
}

export default SemanticSearchResultHolder;
