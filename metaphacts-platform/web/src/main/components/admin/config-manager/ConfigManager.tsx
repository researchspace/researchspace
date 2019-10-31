/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as Kefir from 'kefir';
import * as React from 'react';
import { Component } from 'react';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import { Button } from 'react-bootstrap';
import * as Either from 'data.either';

import { SparqlClient } from 'platform/api/sparql';
import * as ConfigService from 'platform/api/services/config';
import {
  Table, TableLayout, TableColumnConfiguration, CellRendererProps
} from 'platform/components/semantic/table';
import { ErrorNotification, ErrorPresenter } from 'platform/components/ui/notification';
import { Alert, AlertType } from 'platform/components/ui/alert';
import { RemovableBadge } from 'platform/components/ui/inputs';
import { Spinner } from 'platform/components/ui/spinner';

import { InlineValuesEditor, ConfigRecord } from './InlineValuesEditor';

import * as styles from './ConfigManager.scss';

export interface ConfigManagerProps {
  group?: string;
  editable?: boolean;
}

interface State {
  isLoading: boolean;
  apps?: ReadonlyArray<ConfigService.ConfigStorageStatus>;
  data?: ReadonlyArray<ConfigRecord>;
  loadingError?: any;
  alertError?: { originalError: any, propertyName: string };
  alertType?: AlertType;
  editedProperty?: string;
  savingProperty?: boolean;
}

export class ConfigManager extends Component<ConfigManagerProps, State> {

  constructor(props: ConfigManagerProps, state: State) {
    super(props, state);
    this.state = {
      isLoading: true,
      loadingError: undefined,
      alertError: undefined,
      alertType: AlertType.NONE,
      editedProperty: undefined,
      savingProperty: false,
    };
  }

  public render() {
    if (this.state.loadingError) {
      return <ErrorNotification errorMessage={this.state.loadingError} />;
    } else if (this.state.isLoading) {
      return <Spinner />
    }
    return <div className={styles.component}>
      {this.getTable()}
      {this.props.editable ? null : (
        <i>{capitalizeFirstLetter(this.props.group)}
          &nbsp;configuration group is not editable during runtime.</i>
      )}
    </div>
  }

  public componentDidMount() {
    if (this.props.group) {
      this.loadConfigData();
    } else {
      this.setState({
        isLoading: false,
        loadingError: new Error('Config property group must not be empty.'),
      });
    }
  }

  private getTable() {
    const {editable} = this.props;
    const {apps, editedProperty, savingProperty, alertError, alertType} = this.state;

    const setEditedProperty = (propertyName: string | undefined) => {
      const hideError = alertError && propertyName === alertError.propertyName;
      this.setState({
        editedProperty: propertyName,
        alertError: hideError ? undefined : alertError,
        alertType: hideError ? AlertType.NONE : alertType,
      });
    };
    const submitProperty = (values: ReadonlyArray<string>, targetApp: string) => {
      this.onSetConfig(editedProperty, values, targetApp);
    }
    const deleteProperty = (propertyName: string, targetApp: string) => {
      this.onDeleteConfig(propertyName, targetApp);
    }

    const writableApps = new Set<string>();
    for (const app of apps) {
      if (app.writable) {
        writableApps.add(app.appId);
      }
    }

    const valueRenderer = class extends Component<CellRendererProps, {}> {
      render() {
        const record = this.props.rowData as ConfigRecord;
        if (record.name === editedProperty) {
          if (savingProperty) {
            return <Spinner />;
          }
          return <InlineValuesEditor className={styles.valuesEditor}
            source={record}
            apps={apps}
            onSave={submitProperty}
            onCancel={() => setEditedProperty(undefined)}
          />;
        } else {
          const hasRelatedError = alertError && record.name === alertError.propertyName;
          return <div>
            {record.values.length === 0 ?
              <div className={styles.noValue}>(no value)</div> : (
                <div className={styles.propertyValuesCell}>
                  <div className={styles.propertyValues}>
                    {record.values.map((value, index) =>
                      <div key={index} className={styles.propertyValue}>{value}</div>
                    )}
                  </div>
                  <Button className={styles.editValue}
                    bsSize='xs'
                    disabled={!editable || savingProperty}
                    onClick={() => setEditedProperty(record.name)}>
                    <span className='fa fa-pencil' /> Edit
                  </Button>
                </div>
              )
            }
            {hasRelatedError ? 
              <Alert alert={alertType} message={''}>
                <ErrorPresenter error={alertError.originalError} />
              </Alert> : ''
            }
          </div>;
        }
      }
    };
    const definedByAppsRenderer = class extends Component<CellRendererProps, {}> {
      render() {
        const record = this.props.rowData as ConfigRecord;
        return <div className={styles.propertyApps}>
          {record.definedByApps.map(appId =>
            <RemovableBadge key={appId}
              className={styles.propertyApp}
              disableClick={true}
              disableRemove={!editable || !writableApps.has(appId) || savingProperty}
              onRemove={() => deleteProperty(record.name, appId)}>
              {appId}
            </RemovableBadge>
          )}
        </div>;
      }
    };
    const shadowedRenderer = class extends Component<CellRendererProps, {}> {
      render() {
        const record = this.props.rowData as ConfigRecord;
        return record.shadowed ? <span>yes</span> : null;
      }
    };

    const columnConfig: TableColumnConfiguration[] = [
      {displayName: 'Name', variableName: 'name'},
      {displayName: 'Value', cellComponent: valueRenderer},
      {displayName: 'Defined by apps', cellComponent: definedByAppsRenderer},
      {displayName: 'Shadowed', cellComponent: shadowedRenderer},
    ];

    const layout: TableLayout = {
      tupleTemplate: maybe.Nothing<string>(),
      options: {
        resultsPerPage: 20,
      },
    };

    return (
      <Table
        numberOfDisplayedRows={maybe.Just(10)}
        columnConfiguration={columnConfig}
        data={Either.Left<ReadonlyArray<any>, SparqlClient.SparqlSelectResult>(this.state.data)}
        layout={maybe.Just(layout)}
      />
    );
  }

  private loadConfigData() {
    this.setState({
      isLoading: true,
      loadingError: undefined,
      alertError: undefined,
      alertType: AlertType.NONE,
    });

    Kefir.combine({
      apps: ConfigService.getStorageStatus(),
      data: ConfigService.getConfigsInGroup(this.props.group),
    }).observe({
      value: ({apps, data}) => {
        this.setState({
          isLoading: false,
          apps,
          data: _.map(data, (v, name) => ({
            name,
            type: v.parameterType,
            values: ConfigService.configValueToArray(v.value),
            definedByApps: v.definedByApps,
            shadowed: v.shadowed,
          })),
        });
      },
      error: err => {
        this.setState({
          isLoading: false,
          loadingError: err,
        })
      },
    });
  }

  private onSetConfig(propertyName: string, values: ReadonlyArray<string>, targetApp: string) {
    this.setState({
      editedProperty: propertyName,
      savingProperty: true,
      alertError: undefined,
      alertType: AlertType.NONE,
    });

    ConfigService.setConfig(this.props.group, propertyName, values, targetApp).observe({
      value: () => {
        this.setState({editedProperty: undefined, savingProperty: false});
        this.loadConfigData();
      },
      error: err => {
        this.setState({
          editedProperty: undefined,
          savingProperty: false,
          alertError: { propertyName, originalError: err },
          alertType: AlertType.DANGER,
        });
      },
    });
  }

  private onDeleteConfig(propertyName: string, targetApp: string) {
    this.setState({
      editedProperty: propertyName,
      savingProperty: true,
      alertError: undefined,
      alertType: AlertType.NONE,
    });

    ConfigService.deleteConfig(this.props.group, propertyName, targetApp).observe({
      value: () => {
        this.setState({editedProperty: undefined, savingProperty: false});
        this.loadConfigData();
      },
      error: err => {
        this.setState({
          editedProperty: undefined,
          savingProperty: false,
          alertError: { propertyName, originalError: err },
          alertType: AlertType.DANGER,
        })
      },
    });
  }
}

function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default ConfigManager;
