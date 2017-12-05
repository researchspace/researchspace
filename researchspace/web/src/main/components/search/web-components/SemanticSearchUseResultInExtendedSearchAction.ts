/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

import {
  ResultContext, ResultContextTypes,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import { SearchSummary } from '../query-builder/SearchSummary';

export class SemanticSearchUseResultInExtendedSearchAction extends React.Component<{}, {}> {
  static contextTypes = ResultContextTypes;
  context: ResultContext;

  public render() {
    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    const props = {
      onClick: this.onClick,
    };

    return React.cloneElement(child, props);
  }

  private onClick = () =>
    this.context.resultQuery.map(
      query =>
        this.context.baseQueryStructure.map(
          queryStructure =>
            this.context.useInExtendedFcFrSearch({
              value: {
                query: query,
                label: SearchSummary.summaryToString(queryStructure),
              }, range: this.context.domain.get(),
            })
        )
    );
}
export default SemanticSearchUseResultInExtendedSearchAction;
