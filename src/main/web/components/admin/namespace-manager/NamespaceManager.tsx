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
import * as React from 'react';
import { KeyboardEvent, MouseEvent } from 'react';
import { Button, ButtonToolbar, FormControl } from 'react-bootstrap';
import * as Kefir from 'kefir';
import { orderBy } from 'lodash';
import * as maybe from 'data.maybe';
import * as Either from 'data.either';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { SparqlClient } from 'platform/api/sparql';
import { refresh } from 'platform/api/navigation';
import * as ConfigService from 'platform/api/services/config';
import * as NamespaceService from 'platform/api/services/namespace';

import { StorageSelector, chooseDefaultTargetApp } from 'platform/components/admin/config-manager';
import { Table, TableColumnConfiguration, CellRendererProps } from 'platform/components/semantic/table';
import { Error, Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';
import { ErrorNotification, ErrorPresenter } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import * as styles from './NamespaceManager.scss';

interface State {
  isLoading?: boolean;
  data?: ReadonlyArray<NamespaceService.NamespaceRecord>;
  appStatus?: ReadonlyArray<ConfigService.ConfigStorageStatus>;
  loadingError?: any;
  isApplyingModifications?: boolean;
  modificationError?: any;
  selectedPrefix?: string;
  selectedNamespace?: string;
  selectedAppId?: string;
}

interface PrefixRecord {
  prefix: string;
  namespace: string;
  appId: string;
}

export class NamespaceManager extends Component<{}, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {
      isLoading: true,
      selectedPrefix: '',
      selectedNamespace: '',
    };
  }

  render() {
    if (this.state.loadingError) {
      return <ErrorNotification errorMessage={this.state.loadingError} />;
    } else if (this.state.isLoading) {
      return <Spinner />;
    }

    return (
      <div className={styles.component}>
        {this.getTable()}
        {this.state.modificationError ? (
          <Alert alert={AlertType.DANGER} message="">
            <ErrorPresenter error={this.state.modificationError} />
          </Alert>
        ) : null}
        {this.getUpdatePanel()}
      </div>
    );
  }

  componentDidMount() {
    this.cancellation
      .map(
        Kefir.combine({
          data: NamespaceService.getNamespaceRecords(),
          appStatus: ConfigService.getStorageStatus(),
        })
      )
      .observe({
        value: ({ data, appStatus }) => {
          const selectedAppId = chooseDefaultTargetApp(appStatus);
          this.setState({ isLoading: false, data, appStatus, selectedAppId });
        },
        error: (loadingError) => this.setState({ isLoading: false, loadingError }),
      });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private getTable() {
    const deleteNamespace = (record: PrefixRecord) => this.deleteNamespace(record);

    const columnConfig: TableColumnConfiguration[] = [
      { variableName: 'prefix', displayName: 'Prefix' },
      { variableName: 'namespace', displayName: 'Namespace' },
      { variableName: 'appId', displayName: 'Source App' },
      {
        displayName: 'Actions',
        cellComponent: createActionsCellRenderer({
          onDelete: (record) => this.deleteNamespace(record),
        }),
      },
    ];

    let tableData = this.state.data
      .filter((record) => record.prefix.length > 0)
      .map(
        (record): PrefixRecord => ({
          prefix: record.prefix,
          namespace: record.iri,
          appId: record.appId,
        })
      );
    tableData = orderBy(tableData, [
      (record) => record.prefix,
      (record) => (NamespaceService.isSystemNamespacePrefix(record.prefix) ? 0 : 1),
    ]);

    const griddleOptions = {
      resultsPerPage: 20,
    };
    return (
      <Table
        numberOfDisplayedRows={maybe.Just(10)}
        columnConfiguration={columnConfig}
        data={Either.Left<any[], SparqlClient.SparqlSelectResult>(tableData)}
        layout={maybe.Just<{}>({ options: griddleOptions, tupleTemplate: maybe.Nothing<string>() })}
      />
    );
  }

  private getUpdatePanel() {
    if (this.state.isApplyingModifications) {
      return <Spinner />;
    }
    return (
      <div className={classnames(styles.updatePanel, 'row')}>
        <div className="col-xs-1 px-0">
          <FormControl
            type="text"
            placeholder="Prefix"
            value={this.state.selectedPrefix}
            onChange={this.onPrefixInput}
          />
        </div>
        <div className="col-xs-5">
          <FormControl
            type="text"
            placeholder="Namespace"
            value={this.state.selectedNamespace}
            onChange={this.onNamespaceInput}
          />
        </div>
        <div className={classnames(styles.updatePanel_submit, 'col-xs-6')}>
          <StorageSelector
            allApps={this.state.appStatus}
            sourceApps={[]}
            targetApp={this.state.selectedAppId}
            onChange={this.onSelectedAppChange}
          />
          <ButtonToolbar>
            <Button
              type="submit"
              bsSize="small"
              bsStyle="primary"
              onClick={this.onSetNamespace}
              disabled={!(this.state.selectedPrefix && this.state.selectedNamespace && this.state.selectedAppId)}
            >
              Set Namespace
            </Button>
          </ButtonToolbar>
        </div>
      </div>
    );
  }

  private onPrefixInput = (e: React.KeyboardEvent<FormControl>) => {
    this.setState({
      isLoading: false,
      selectedPrefix: (e.target as HTMLInputElement).value.trim(),
    });
  };

  private onNamespaceInput = (e: KeyboardEvent<FormControl>): void => {
    this.setState({
      isLoading: false,
      selectedNamespace: (e.target as HTMLInputElement).value.trim(),
    });
  };

  private onSelectedAppChange = (selectedAppId: string) => {
    this.setState({ selectedAppId });
  };

  private deleteNamespace(record: PrefixRecord) {
    this.setState({ isApplyingModifications: true });
    this.cancellation.map(NamespaceService.deletePrefix(record.prefix, record.appId)).observe({
      value: () => refresh(),
      error: (modificationError) =>
        this.setState({
          isApplyingModifications: false,
          modificationError,
        }),
    });
  }

  private onSetNamespace = (e: MouseEvent<Button>) => {
    e.stopPropagation();
    e.preventDefault();

    this.setState({ isApplyingModifications: true });
    this.cancellation
      .map(
        NamespaceService.setPrefix(this.state.selectedPrefix, this.state.selectedNamespace, this.state.selectedAppId)
      )
      .observe({
        value: () => refresh(),
        error: (modificationError) =>
          this.setState({
            isApplyingModifications: false,
            modificationError,
          }),
      });
  };
}

function createActionsCellRenderer(params: { onDelete: (record: PrefixRecord) => void }) {
  return class extends Component<CellRendererProps, { confirm?: boolean }> {
    constructor(props: CellRendererProps, context: any) {
      super(props, context);
      this.state = { confirm: false };
    }

    render() {
      const record = this.props.rowData as PrefixRecord;
      if (NamespaceService.isSystemNamespacePrefix(record.prefix)) {
        return null;
      } else if (this.state.confirm) {
        return (
          <div>
            Delete prefix "{record.prefix}"?
            <div>
              <Button className="btn-grey" onClick={this.onConfirm}>
                Delete
              </Button>
              <Button className="btn-grey" onClick={this.onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        );
      } else {
        return (
          <Button className="btn-grey" onClick={this.onDeleteClick}>
            <span className="fa fa-trash-o btn-icon-left" />
            &nbsp;Delete
          </Button>
        );
      }
    }

    private onDeleteClick = () => {
      this.setState({ confirm: true });
    };

    private onConfirm = () => {
      this.setState({ confirm: false });
      const record = this.props.rowData as PrefixRecord;
      const { onDelete } = params;
      onDelete(record);
    };

    private onCancel = () => {
      this.setState({ confirm: false });
    };
  };
}

export default NamespaceManager;
