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

import {DOM as D, createFactory, createElement, KeyboardEvent, MouseEvent, Component} from 'react';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';
import * as Either from 'data.either';
import * as ReactSelectComponent from 'react-select';

import { SparqlClient } from 'platform/api/sparql';
import * as ConfigService from 'platform/api/services/config';
import { Table, TableColumnConfiguration } from 'platform/components/semantic/table';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Error, Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';
import { Spinner } from 'platform/components/ui/spinner';
import { refresh } from 'platform/api/navigation';

const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);
const Input = createFactory(ReactBootstrap.FormControl);
const ReactSelect = createFactory(ReactSelectComponent);

interface State {
  isLoading: boolean;
  data?: { key: string, value: string, shadowed: string; }[];
  alert?: Data.Maybe<AlertConfig>;
  err?: Data.Maybe<string>;
  selectedProperty?: string;
  selectedPropertyValue?: string;
}

interface Props {
  group?: string;
  editable?: boolean;
}

export class ConfigManager extends Component<Props, State> {

  constructor(props: {}, state: State) {
    super(props, state);
    this.state = {
      isLoading: true,
      alert: maybe.Nothing<AlertConfig>(),
      err: maybe.Nothing<string>(),
      selectedProperty: '',
      selectedPropertyValue: '',
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
      [
        this.getTable(),
        D.hr(),
        createElement(Alert, this.state.alert.map(config => config).getOrElse(
          { alert: AlertType.NONE, message: '' }
        )),
        this.props.editable !== true
          ? D.i({}, this.capitalizeFirstLetter(this.props.group)
            + ' configuration group is not editable during runtime.'
          )
          : this.getUpdatePanel(),
      ]
    );
  }

  public componentWillMount() {
    if (!this.props.group) {
      this.setState({
        isLoading: false,
        err: maybe.Just<string>('Config property group must not be empty.'),
      });
    } else {
      ConfigService.getConfigsInGroup(this.props.group).onValue(
        (res) => {
          this.setState({
            isLoading: false,
            data: _.map<any, { key: string, value: string, shadowed: string; }>(res, (v, k) => {
              return {
                'key': k,
                'value': Array.isArray(v.value)  ? v.value.join(',') :  v.value,
                'shadowed': v.shadowed ? 'yes' : '',
              };
            }) ,
          });
      }).onError(err =>
        this.setState({
             isLoading: false,
             err: maybe.Just(err),
           })
      );
    }
  }

  private capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private getTable = () => {
    const griddleOptions = {
      resultsPerPage: 20,
    };

    const columnConfig: TableColumnConfiguration [] = [
      {
        variableName: 'key',
        displayName: 'Name',
      },
      {
        variableName: 'value',
        displayName: 'Value',
      },
      {
        variableName: 'shadowed',
        displayName: 'Shadowed',
      },
    ];

    const tableData = this.state.data;
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

      const selectOptions = {
           multi: false,
           // filter out shadowed elements, map yo { value: string, label:string } signature
           options: _.map(
                      _.filter(this.state.data, function(o) { return o.shadowed !== 'yes'; }),
                      (value, key) => { return { value: value.key, label: value.key }; }
                    ),
           clearable: true,
           allowCreate: false,
           autoload: true,
           ignoreCase: true,
           matchPos: 'any',
           matchProp: 'any',
           noResultsText: '',
           searchable: true,
           placeholder: 'Select Property',
           onChange: (selected: { value: string, label: string })  => {
              let idx = -1;
              if (selected) {
                // try to locate index of matching elements in this.state.data
                idx = _.findIndex(
                        this.state.data, function(o) { return o.key === selected.value; });
              }
              this.setState({
                isLoading: false,
                selectedProperty: idx >= 0 ? this.state.data[idx].key : '',
                selectedPropertyValue: idx >= 0 ? this.state.data[idx].value : '',
              });
           },
           value: this.state.selectedProperty,

         };

    return D.div({className: 'row'}, [
        D.div({className: 'col-xs-4'},
          ReactSelect(selectOptions)
        ),
        D.div({className: 'col-xs-6'},
          Input({
            type: 'text',
            placeholder: 'Value',
            value: this.state.selectedPropertyValue,
            onChange: this.onPropertyValueInput,
          })
        ),
        D.div({className: 'col-xs-2'},
          ButtonToolbar({},
            Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: this.onSetConfig,
                disabled: ( this.state.selectedProperty.length === 0
                            && this.state.selectedPropertyValue.length === 0
                            || this.state.data[this.state.selectedProperty]
                                === this.state.selectedPropertyValue
                           ),
              }, 'Set Property')
          )
        ),
      ]);
  }



  private onPropertyValueInput = (e: KeyboardEvent<ReactBootstrap.FormControl>): void => {
    this.setState({
      isLoading: false,
      selectedPropertyValue: (e.target as any).value,
    });
  }

  private onSetConfig = (e: MouseEvent<ReactBootstrap.Button>) => {
    e.stopPropagation();
    e.preventDefault();
    ConfigService.setConfig(
      this.props.group, this.state.selectedProperty, this.state.selectedPropertyValue.trim()
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

export default ConfigManager;
