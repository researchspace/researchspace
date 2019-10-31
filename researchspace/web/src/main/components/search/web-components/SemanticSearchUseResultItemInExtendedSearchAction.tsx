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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as React from 'react';

import { Rdf } from 'platform/api/rdf';
import { getLabel } from 'platform/api/services/resource-label';
import {
  SemanticSearchContext, ResultContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';

export interface SemanticSearchUseResultItemInExtendedSearchActionProps {
  iri: string;
}

export class SemanticSearchUseResultItemInExtendedSearchAction
  extends React.Component<SemanticSearchUseResultItemInExtendedSearchActionProps, {}> {

  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => (
          <SemanticSearchUseResultItemInExtendedSearchActionInner {...this.props}
            context={context}
          />
        )}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticSearchUseResultItemInExtendedSearchActionProps {
  context: ResultContext;
}

class SemanticSearchUseResultItemInExtendedSearchActionInner
  extends React.Component<InnerProps, {}> {

  public render() {
    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    const props = {
      onClick: this.onClick,
    };

    return React.cloneElement(child, props);
  }

  private onClick = () => {
    const iri = Rdf.iri(this.props.iri);
    getLabel(iri).onValue(
      label =>
        this.props.context.useInExtendedFcFrSearch({
          value: {
            iri: iri,
            label: label,
            description: label,
            tuple: {},
          }, range: this.props.context.domain.get(),
        })
    );
  }
}

export default SemanticSearchUseResultItemInExtendedSearchAction;
