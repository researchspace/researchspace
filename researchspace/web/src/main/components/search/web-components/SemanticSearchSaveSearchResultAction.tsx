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
import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';

import { SparqlUtil } from 'platform/api/sparql';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import {  getOverlaySystem } from 'platform/components/ui/overlay';

import { SaveSetDialog } from 'platform/components/sets';
import { QueryService } from 'platform/api/services/ldp-query';
import { SemanticSearchContext, ResultContext } from 'platform/components/semantic/search';
import { serializeSearch } from 'platform/components/semantic/search/data/search/Serialization';

export interface SaveSearchResultActionProps {
  id: string

  /**
   * `true` if saved search should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean
}

class SaveSearchResultAction extends React.Component<SaveSearchResultActionProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => (
          <SaveSearchResultActionInner {...this.props}
            context={context}
          />
        )}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SaveSearchResultActionProps {
  context: ResultContext;
}

class SaveSearchResultActionInner extends React.Component<InnerProps, {}> {
  dialogRef = 'save-search-dialog';

  static defaultProps = {
    addToDefaultSet: false,
  };

  private onSave = () => {
    getOverlaySystem().show(
      this.dialogRef,
      React.createElement(SaveSetDialog, {
        onSave: this.saveAsNewSearch.bind(this),
        onHide: () => getOverlaySystem().hide(this.dialogRef),
        maxSetSize: maybe.Nothing<number>(),
        title: 'Save search',
        placeholder: 'Search name',
      })
    );
  }

  private saveAsNewSearch = (name: string) => {
    return !this.props.context.resultQuery.isNothing ?
      QueryService().addItem({
        value: SparqlUtil.serializeQuery(this.props.context.resultQuery.get()),
        queryType: 'SELECT',
        type: 'query',
        label: name,
        structure: serializeSearch(
          this.props.context.baseQueryStructure.getOrElse(undefined),
          this.props.context.facetStructure.getOrElse(undefined)
        )
      }).flatMap(
        res => this.props.addToDefaultSet ?
          addToDefaultSet(res, this.props.id) : Kefir.constant(res)
      ).onValue(value => {
        getOverlaySystem().hide(this.dialogRef);
      }) : null;
  }

  public render() {
    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    const props = {
      onClick: this.onSave,
    };

    return React.cloneElement(child, props);
  }
}

export default SaveSearchResultAction;
