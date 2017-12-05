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

import {
  Component, Children, createFactory, cloneElement, createElement,
} from 'react';
import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { GlobalEventsContextTypes, GlobalEventsContext } from 'platform/api/events';
import { SaveSetDialog, createNewSetFromItems } from 'platform/components/sets';
import { getOverlaySystem } from 'platform/components/ui/overlay';

import {
  ResultContext, ResultContextTypes,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';

const DIALOG_REF = 'save-as-set-dialog';

interface Props {
  id: string
}

class SaveSetResultAction extends Component<Props, {}> {
  static contextTypes = {...ResultContextTypes, ...GlobalEventsContextTypes};
  context: ResultContext & GlobalEventsContext;

  private onSave = () => {
    getOverlaySystem().show(
      DIALOG_REF,
      createElement(SaveSetDialog, {
        onSave: this.saveInNewSet.bind(this),
        onHide: () => getOverlaySystem().hide(DIALOG_REF),
        maxSetSize: maybe.Nothing<number>(),
      })
    );
  }

  private saveInNewSet = (name: string) => {
    const {resultQuery} = this.context;
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
    return cloneElement(Children.only(this.props.children), {
      onClick: this.onSave,
    });
  }
}

export type component = SaveSetResultAction;
export const component = SaveSetResultAction;
export const factory = createFactory(component);
export default component;
