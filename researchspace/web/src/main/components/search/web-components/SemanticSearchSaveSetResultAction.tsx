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
import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { SaveSetDialog, createNewSetFromItems } from 'platform/components/sets';
import { getOverlaySystem } from 'platform/components/ui/overlay';

import {
  SemanticSearchContext, ResultContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';

const DIALOG_REF = 'save-as-set-dialog';

interface SaveSetResultActionProps {
  id: string;
}

class SaveSetResultAction extends React.Component<SaveSetResultActionProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <SaveSetResultActionInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SaveSetResultActionProps {
  context: ResultContext;
}

class SaveSetResultActionInner extends React.Component<InnerProps, {}> {
  private onSave = () => {
    getOverlaySystem().show(
      DIALOG_REF,
      React.createElement(SaveSetDialog, {
        onSave: this.saveInNewSet.bind(this),
        onHide: () => getOverlaySystem().hide(DIALOG_REF),
        maxSetSize: maybe.Nothing<number>(),
      })
    );
  }

  private saveInNewSet = (name: string) => {
    const {resultQuery} = this.props.context;
    return resultQuery.cata({
      Nothing: () => null,
      Just: (query) => SparqlClient.select(query).onValue(resultSet => {
        const projectionVariable = query.variables[0] as string;
        if (resultQuery.isNothing) {
          return;
        }
        createNewSetFromItems(
          this.props.id,
          name,
          resultSet.results.bindings.map(
            // in sparql.js projection variable is prefixed by ?,
            // so we need to remove it to get binding name
            bindingSet => bindingSet[projectionVariable.substring(1)] as Rdf.Iri
          )
        ).onValue(() =>
          getOverlaySystem().hide(DIALOG_REF)
        );
      }),
    });
  }

  public render() {
    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: this.onSave,
    });
  }
}

export default SaveSetResultAction;
