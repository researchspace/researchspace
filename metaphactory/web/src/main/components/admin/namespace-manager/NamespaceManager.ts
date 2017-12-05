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

import {DOM as D, createFactory, createElement, KeyboardEvent, Component, MouseEvent} from 'react';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';
import * as Either from 'data.either';

import { SparqlClient } from 'platform/api/sparql';
import { refresh } from 'platform/api/navigation';
import * as NamespaceService from 'platform/api/services/namespace';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Table, TableColumnConfiguration } from 'platform/components/semantic/table';
import {Spinner} from 'platform/components/ui/spinner';
import { Error, Alert, AlertType, AlertConfig} from 'platform/components/ui/alert';

const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);
const Input = createFactory(ReactBootstrap.FormControl);

interface NamespaceManagerState {
  isLoading: boolean;
  data?: {[key: string]: string};
  alert?: Data.Maybe<AlertConfig>;
  err?: Data.Maybe<string>;
  selectedPrefix?: string;
  selectedNamespace?: string;
}

export class NamespaceManager extends Component<{}, NamespaceManagerState> {

  constructor(props: {}, state: NamespaceManagerState) {
    super(props, state);
    this.state = {
      isLoading: true,
      alert: maybe.Nothing<AlertConfig>(),
      err: maybe.Nothing<string>(),
      selectedPrefix: '',
      selectedNamespace: '',
    };
  }

  public render() {
    if (this.state.err.isJust) {
      return createElement(ErrorNotification, {errorMessage: this.state.err.get()});
    }
    if (this.state.isLoading) {
      return createElement(Spinner);
    }

    return D.div(
      {className: 'mph-namespace-admin-component'},
      this.getTable(),
      D.hr(),
      createElement(Alert, this.state.alert.map(config => config).getOrElse(
        { alert: AlertType.NONE, message: '' }
      )),
      this.getUpdatePanel()
    );
  }

  public componentWillMount() {
    NamespaceService.getRegisteredPrefixes().onValue(
      (res) => {
        this.setState({
          isLoading: false,
          data: res,
        });
    }).onError(err =>
      this.setState({
           isLoading: false,
           err: maybe.Just(err),
         })
    );
  }


  private getTable = () => {
    const griddleOptions = {
      resultsPerPage: 20,
    };

    const columnConfig: TableColumnConfiguration [] = [
      {  variableName: 'Prefix',
        displayName: 'Prefix',
      }, {
        variableName: 'Namespace',
        displayName: 'Namespace',
      }, {
        displayName: 'Delete',
        cellTemplate: `<mp-admin-namespace-delete-action title="Delete" prefix="{{Prefix}}">
                        <i class="fa fa-trash-o"></i>
                      </mp-admin-namespace-delete-action>`,
      },
    ];

    const tableData = _.map(this.state.data, (value, key) => {
            return {Prefix: key, Namespace: value};
          }).filter( (o) => o.Prefix.length !== 0);
    return createElement(Table, {
        numberOfDisplayedRows: maybe.Just(10) ,
        columnConfiguration: columnConfig,
        data: Either.Left<any[], SparqlClient.SparqlSelectResult>(tableData),
        layout: maybe.Just<{}>(
          { options: griddleOptions, tupleTemplate: maybe.Nothing<string>() }
        ),
      });
  }

  private getUpdatePanel = () => {
    /*
      right now we can not use react-select
      https://github.com/JedWatson/react-select/issues/658
      const selectOptions = {
           multi: false,
           options: _.map(this.state.data, (value, key) => {
                   return {value: key, label: key};
                 }),
           clearable: true,
           allowCreate: true,
           autoload: true,
           ignoreCase: true,
           matchPos: 'any',
           matchProp: 'any',
           noResultsText: '',
           searchable: true,
           placeholder: 'Filter',
           newOptionCreator: (v: string) => { return {value: v, label: v} },
           onChange: (selected: {value: string, label: string})  => {
            const selectedNamespace = selected && this.state.data[selected.value]
              ? this.state.data[selected.value]
              : '';
            this.setState({
              isLoading: false,
              selectedPrefix: selected ? selected.value : '',
              selectedNamespace: selectedNamespace,
            });
           },
           value: this.state.selectedPrefix,

         };
    */
    return D.div({className: 'row'},
        D.div({className: 'col-xs-2'},
          // there is a bug in react select preventing allowCreate
          // https://github.com/JedWatson/react-select/issues/658
          // ReactSelect(selectOptions)
          // as simple solution for now we just use a plain input
          Input({
            type: 'text',
            placeholder: 'Prefix',
            value: this.state.selectedPrefix,
            onChange: this.onPrefixInput,
          })
        ),
        D.div({className: 'col-xs-6'},
          Input({
            type: 'text',
            placeholder: 'Namespace',
            value: this.state.selectedNamespace,
            onChange: this.onNamespaceInput,
          })
        ),
        D.div({className: 'col-xs-4'},
          ButtonToolbar({},
            Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: this.onSetNamespace,
                disabled: ( this.state.selectedPrefix.length === 0
                            && this.state.selectedNamespace.length === 0 ),
              }, 'Set Namespace')
          )
        )
      );
  }

  private onPrefixInput = (e) => {
    this.setState({
      isLoading: false,
      selectedPrefix: (<HTMLInputElement>e.target).value.trim(),
    });
  }

  private onNamespaceInput = (e: KeyboardEvent<ReactBootstrap.FormControl>): void => {
    this.setState({
      isLoading: false,
      selectedNamespace: (e.target as any).value.trim(),
    });
  }

  private onSetNamespace = (e: MouseEvent<ReactBootstrap.Button>) => {
    e.stopPropagation();
    e.preventDefault();
    NamespaceService.setPrefix(
      this.state.selectedPrefix, this.state.selectedNamespace
    ).onValue(
      v => refresh()
    ).onError((err: string) =>
          this.setState({
            isLoading: false,
            alert: maybe.Just(Error(err)),
          })
    );
  }

}

export default NamespaceManager;
