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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as React from 'react';

import { Rdf } from 'platform/api/rdf';
import { getLabel } from 'platform/api/services/resource-label';
import {
  SemanticSearchContext,
  ResultContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';

export interface SemanticSearchUseResultItemInExtendedSearchActionProps {
  iri: string;
}

export class SemanticSearchUseResultItemInExtendedSearchAction extends React.Component<
  SemanticSearchUseResultItemInExtendedSearchActionProps,
  {}
> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <SemanticSearchUseResultItemInExtendedSearchActionInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticSearchUseResultItemInExtendedSearchActionProps {
  context: ResultContext;
}

class SemanticSearchUseResultItemInExtendedSearchActionInner extends React.Component<InnerProps, {}> {
  public render() {
    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    const props = {
      onClick: this.onClick,
    };

    return React.cloneElement(child, props);
  }

  private onClick = () => {
    const iri = Rdf.iri(this.props.iri);
    getLabel(iri).onValue((label) =>
      this.props.context.useInExtendedFcFrSearch({
        value: {
          iri: iri,
          label: label,
          description: label,
          tuple: {},
        },
        range: this.props.context.domain.get(),
      })
    );
  };
}

export default SemanticSearchUseResultItemInExtendedSearchAction;
