/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import {
  Component, createElement, DOM as D,
} from 'react';
import {render} from 'react-dom';
import * as Either from 'data.either';
import * as maybe from 'data.maybe';
import * as bindingsToCsv from 'yasgui-yasr/src/bindingsToCsv.js';
import * as classnames from 'classnames';

import { SparqlClient } from 'platform/api/sparql';
import { Table } from 'platform/components/semantic/table';

interface YasrObject {
  results: {
    getVariables: () => any
    getAsJson: () => any
  };
}

/**
 * Returns a table component with a toggle button to toggle between fetch labels on/off
 */
function table(jsonResult) {
  return class extends Component<{}, {showLabels?: boolean }> {
    constructor(props, context) {
      super(props, context);
      this.state = {showLabels: false};
    }

    render () {
      const table = createElement(Table, {
        key: 'sparql-endpoint-result-table',
        data: Either.Right<any[], SparqlClient.SparqlSelectResult>(
           <SparqlClient.SparqlSelectResult> SparqlClient.sparqlJsonToSelectResult(jsonResult)
        ),
        numberOfDisplayedRows: maybe.Nothing<number>(),
        layout: maybe.Just<{}>(
          {
            options: {resultsPerPage: 10},
            tupleTemplate: maybe.Nothing<string>(),
            showLabels: this.state.showLabels,
          }
        ),
      });
      const buttonLabel = this.state.showLabels ? 'Fetch Labels: ON' : 'Fetch Labels: OFF';
      const className = this.state.showLabels ? 'btn-success' : 'btn-danger';
      return D.div({}, [
          D.button({
              key: 'sparql-endpoint-label-toogle-button',
              className: classnames('pull-right btn', className),
              onClick: this.toggleLabel,
            },
            buttonLabel
          ),
          table,
        ]
      );
    }

    toggleLabel = () => {
      this.setState(
        (prevState, props) => ({showLabels: prevState.showLabels ? false : true})
      );
    }
  };
}

/**
 * Plugin for YASR sparql result visualization library.
 * Implementing the contract as descripted here: http://yasr.yasgui.org/doc/#addingPlugin
 */
export function  MetaphactsYASRTable(yasr: YasrObject) {
  return {
    name: 'Table',
    //  Draw the results. Use the yasr object to retrieve the SPARQL response
    draw: function() {
      render(
       createElement(table(yasr.results.getAsJson())),
       yasr['resultsContainer'][0]
      );
    },

    canHandleResults: function(): boolean {
      return yasr.results
        && yasr.results.getVariables
        && yasr.results.getVariables()
        && yasr.results.getVariables().length > 0;
    },

    getPriority: function(): number {
      return 10;
    },

    getDownloadInfo: function() {
      if (!yasr.results) {
        return null;
      }else {
        return {
          getContent: function() {
            return bindingsToCsv(yasr.results.getAsJson());
          },
          filename: 'queryResults.csv',
          contentType: 'text/csv',
          buttonTitle: 'Download as CSV',
        };
      }
    },
  };


}
