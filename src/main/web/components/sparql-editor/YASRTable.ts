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

import { Component, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as ReactDOM from 'react-dom';
import * as Either from 'data.either';
import * as maybe from 'data.maybe';
import * as bindingsToCsv from 'yasgui-yasr/src/bindingsToCsv.js';
import * as classnames from 'classnames';
import ReactSelect, { Option } from 'react-select';

import { SparqlClient } from 'platform/api/sparql';
import { Table, TableLayout } from 'platform/components/semantic/table';

interface YasrObject {
  results: {
    getVariables: () => any;
    getAsJson: () => any;
  };
}

interface Props {
  showLabels: boolean;
  resultsPerPage: number;
  onChangeShowLabels: (showLabels: boolean) => void;
  onChangeResultsPerPage: (resultsPerPage: number) => void;
}

interface State {
  showLabels?: boolean;
  resultsPerPage?: number;
}

/**
 * Returns a table component with a toggle button to toggle between fetch labels on/off
 */
function table(jsonResult) {
  return class extends Component<Props, State> {
    constructor(props, context) {
      super(props, context);
      this.state = { showLabels: props.showLabels, resultsPerPage: props.resultsPerPage };
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
      const { showLabels, resultsPerPage } = this.state;
      if (showLabels !== prevState.showLabels) {
        this.props.onChangeShowLabels(showLabels);
      }
      if (resultsPerPage !== prevState.resultsPerPage) {
        this.props.onChangeResultsPerPage(resultsPerPage);
      }
    }

    render() {
      const { resultsPerPage } = this.state;
      const prefetchAndShowLabels = Boolean(this.state.showLabels);
      const table = createElement(Table, {
        key: 'sparql-endpoint-result-table',
        data: Either.Right<any[], SparqlClient.SparqlSelectResult>(
          <SparqlClient.SparqlSelectResult>SparqlClient.sparqlJsonToSelectResult(jsonResult)
        ),
        numberOfDisplayedRows: maybe.Nothing<number>(),
        layout: maybe.Just<TableLayout>({
          options: { resultsPerPage },
          tupleTemplate: maybe.Nothing<string>(),
          showLabels: prefetchAndShowLabels,
          prefetchLabels: prefetchAndShowLabels,
        }),
        showLiteralDatatype: true,
        showCopyToClipboardButton: true,
      });
      const buttonLabel = prefetchAndShowLabels ? 'Fetch Labels: ON' : 'Fetch Labels: OFF';
      const className = prefetchAndShowLabels ? 'btn-primary' : 'btn-default';
      return D.div(
        {className: 'sparql-endpoint-result-table'},
        D.button(
          {
            key: 'sparql-endpoint-label-toogle-button',
            className: classnames('pull-right btn', className),
            onClick: this.toggleLabel,
          },
          buttonLabel
        ),
        createElement(ReactSelect, {
          value: resultsPerPage,
          options: [
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 25, label: '25' },
            { value: 100, label: '100' },
          ],
          onChange: (selected) =>
            this.setState({
              resultsPerPage: (selected as Option<number>).value,
            }),
          clearable: false,
          className: 'pull-right',
          style: { width: 70, marginRight: 10 },
        }),
        table
      );
    }

    toggleLabel = () => {
      this.setState((prevState, props) => ({ showLabels: prevState.showLabels ? false : true }));
    };
  };
}

/**
 * Plugin for YASR sparql result visualization library.
 * Implementing the contract as descripted here: http://yasr.yasgui.org/doc/#addingPlugin
 */
export function YASRTable(yasr: YasrObject) {
  let showLabels = false;
  let resultsPerPage = 10;
  let drawnContainer: HTMLElement | undefined;

  return {
    name: 'Table',
    //  Draw the results. Use the yasr object to retrieve the SPARQL response
    draw: function () {
      const props = {
        showLabels,
        resultsPerPage,
        onChangeShowLabels: (value) => (showLabels = value),
        onChangeResultsPerPage: (value) => (resultsPerPage = value),
      };
      const parentContainer: HTMLElement = yasr['resultsContainer'][0];
      if (drawnContainer) {
        ReactDOM.unmountComponentAtNode(drawnContainer);
        if (drawnContainer.parentElement === parentContainer) {
          parentContainer.removeChild(drawnContainer);
        }
      }
      drawnContainer = document.createElement('div');
      parentContainer.appendChild(drawnContainer);
      ReactDOM.render(createElement(table(yasr.results.getAsJson()), props), drawnContainer);
    },

    canHandleResults: function (): boolean {
      return (
        yasr.results &&
        yasr.results.getVariables &&
        yasr.results.getVariables() &&
        yasr.results.getVariables().length > 0
      );
    },

    getPriority: function (): number {
      return 10;
    },

    getDownloadInfo: function () {
      if (!yasr.results) {
        return null;
      } else {
        const json = yasr.results.getAsJson();

        if (!json) {
          return null;
        }

        return {
          getContent: function () {
            return bindingsToCsv(json);
          },
          filename: 'queryResults.csv',
          contentType: 'text/csv',
          buttonTitle: 'Download as CSV',
        };
      }
    },
  };
}
