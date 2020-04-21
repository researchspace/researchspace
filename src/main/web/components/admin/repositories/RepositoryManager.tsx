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
import * as Kefir from 'kefir';
import * as React from 'react';
import { Alert, Button } from 'react-bootstrap';
import * as classNames from 'classnames';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { refresh } from 'platform/api/navigation';

import { Spinner } from 'platform/components/ui/spinner';
import { getRepositoryStatus, getRepositoryConfigTemplates } from 'platform/api/services/repository';

import * as styles from './RepositoryManager.scss';

import { RepositoryConfigEditor } from './RepositoryConfigEditor';
import { ErrorNotification, addNotification } from 'platform/components/ui/notification';

interface State {
  readonly repositories?: Immutable.Map<string, boolean>;
  readonly loadingError?: any;
  readonly repositoryToEdit?: string;
  readonly repositoryTemplates?: string[];
}

export class RepositoryManager extends Component<{}, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.cancellation
      .map(
        Kefir.combine({
          repositories: getRepositoryStatus(),
          repositoryTemplates: getRepositoryConfigTemplates(),
        })
      )
      .observe({
        value: ({ repositories, repositoryTemplates }) =>
          this.setState({
            repositories,
            repositoryTemplates,
          }),
        error: (loadingError) => this.setState({ loadingError }),
      });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { loadingError, repositoryToEdit, repositoryTemplates } = this.state;

    if (loadingError) {
      return <Alert bsStyle="info"> {loadingError} </Alert>;
    }
    return (
      <div className={styles.holder} data-flex-layout="row top-center">
        <div className={styles.RepositorySelectionArea}>
          {this.renderRepositories()}
          {repositoryToEdit && (
            <Button
              bsStyle="primary"
              className={styles.RepositoryButton}
              onClick={() => this.setState({ repositoryToEdit: undefined })}
            >
              Create New{' '}
            </Button>
          )}
        </div>
        <div className={styles.EditorArea}>
          {<RepositoryConfigEditor id={repositoryToEdit} repositoryTemplates={repositoryTemplates} />}
        </div>
      </div>
    );
  }

  renderRepositories = () => {
    const { repositories, repositoryToEdit } = this.state;
    if (!repositories) {
      return <Spinner />;
    }
    const rows = repositories
      .map((status, id) => {
        const rowCls = {
          [styles.RepositoryRow]: true,
          [styles.RepositoryRowActive]: id === repositoryToEdit,
        };
        const statusCls = status ? styles.online : styles.offline;

        return (
          <tr className={classNames(rowCls)} onClick={() => this.onEditRepository(id)}>
            <td>{id}</td>
            <td>
              <span className={classNames(statusCls)}></span>
            </td>
          </tr>
        );
      })
      .toArray();

    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Repository ID</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  };

  onEditRepository = (id: string) => {
    this.setState({
      repositoryToEdit: id,
    });
  };
}

export default RepositoryManager;
