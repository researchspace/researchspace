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
import * as React from 'react';

import { SemanticSearchContext, ResultContext } from './SemanticSearchApi';

interface SemanticSearchResultHolderProps {
  children: React.ReactNode;
}

class SemanticSearchResultHolder extends React.Component<SemanticSearchResultHolderProps> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <SemanticSearchResultHolderInner {...this.props} context={context} />}
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
    return this.props.context.resultQuery.map((query) => child).getOrElse(null);
  }
}

export default SemanticSearchResultHolder;
