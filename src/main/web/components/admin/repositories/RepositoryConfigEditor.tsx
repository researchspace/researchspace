/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import { Button, Alert, DropdownButton, MenuItem, FormControl, Form, FormGroup, HelpBlock } from 'react-bootstrap';
import { createElement } from 'react';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { refresh } from 'platform/api/navigation';

import { Spinner } from 'platform/components/ui/spinner';
import {
  getRepositoryConfig,
  getRepositoryConfigTemplate,
  updateOrAddRepositoryConfig,
  deleteRepositoryConfig,
} from 'platform/api/services/repository';
import { ConfirmationDialog } from 'platform/components/ui/confirmation-dialog';
import * as styles from './RepositoryConfigEditor.scss';
import { TurtleEditorComponent } from './TurtleEditor';
import { getOverlaySystem } from 'platform/components/ui/overlay';

interface Props {
  id?: string;
  repositoryTemplates?: string[];
  showRestartPrompt?: boolean;
  preselectedTemplate?: string;
  reloadPageOnSuccess?: boolean;
  initializerMode?: boolean; // true if editor is used from RepositoryConfigInitializer
}

interface State {
  readonly source?: string;
  readonly loadingError?: any;
  readonly responseError?: any;
  readonly submittedSuccessfully?: boolean;
  readonly newRepositoryID?: string;
  readonly validateConfiguration?: boolean;
}

type ValidationState = 'warning' | 'error' | 'success';

const SUCCESS_MESSAGE = 'The repository configuration was updated.';

export class RepositoryConfigEditor extends Component<Props, State> {
  private readonly cancellation = new Cancellation();
  static defaultProps = {
    id: undefined,
    repositoryTemplates: [],
    showRestartPrompt: false,
    preselectedTemplate: undefined,
    reloadPageOnSuccess: false,
    initializerMode: false,
  };
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      validateConfiguration: true,
    };
  }

  componentDidMount() {
    if (this.props.preselectedTemplate) {
      this.selectTemplate(this.props.preselectedTemplate);
    } else {
      this.fetchConfig(this.props.id);
    }
  }

  fetchConfig = (id: string) => {
    this.setState({
      responseError: undefined,
      loadingError: undefined,
      submittedSuccessfully: false,
      validateConfiguration: true,
    });
    if (!id) {
      this.setState({
        source: undefined,
      });
      return;
    }
    this.cancellation.map(getRepositoryConfig(id)).observe({
      value: (config) =>
        this.setState({
          source: config,
        }),
      error: (loadingError) => this.setState({ loadingError }),
    });
  };

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.id !== nextProps.id) {
      this.fetchConfig(nextProps.id);
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { source, loadingError, responseError, submittedSuccessfully } = this.state;
    const { showRestartPrompt, reloadPageOnSuccess, initializerMode } = this.props;

    if (loadingError) {
      return <Alert bsStyle="info"> {loadingError} </Alert>;
    }

    if (this.isEditMode() && !source) {
      return <Spinner />;
    }

    return (
      <div data-flex-layout="column top-left" className={styles.holder}>
        <div>
          <h2>{this.isEditMode() ? `Edit Repository Config "${this.props.id}"` : `Create new Repository Config`}</h2>
        </div>
        {!this.isEditMode() && (
          <div>
            <Form horizontal>
              <FormGroup className={styles.formGroup} validationState={this.getNewRepositoryIDValidation()}>
                <strong> Repository ID:</strong>
                <br />
                <FormControl
                  className={styles.formGroup}
                  type="text"
                  value={this.state.newRepositoryID}
                  onChange={this.handleNewRepositoryID}
                  placeholder="Please specify a new and unique repository id."
                />
                {this.getNewRepositoryIDValidation() && (
                  <Alert bsStyle='info'>Repository ID must be a unique, alphanumeric string of length &gt; 5 characters.</Alert>
                )}
              </FormGroup>
            </Form>
          </div>
        )}
        <div>{this.renderTemplateSelector()}</div>
        <div>
          <TurtleEditorComponent
            ref="editor"
            turtleString={source ? source : `#Please select a template to create a new repository configuration`}
          />
          <div>
            <div style={{ marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={this.state.validateConfiguration}
                onChange={() =>
                  this.setState(
                    ({ validateConfiguration }): State => ({ validateConfiguration: !validateConfiguration })
                  )
                }
                disabled={this.props.id === 'default'}
              />{' '}
              Validate configuration
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'end' }}>
          
            {this.isEditMode() && !initializerMode && (
              <Button
                bsStyle="default"
                className={styles.ActionButton}
                onClick={() => this.onDeleteRepository(this.props.id)}
              >
                Delete Config
              </Button>
            )}

            <Button
              bsStyle="default"
              className={`${styles.ActionButton} btn-action`}
              disabled={!this.isEditMode() && this.getNewRepositoryIDValidation() !== 'success'}
              onClick={this.onSubmitConfig}
            >
              {this.isEditMode() ? 'Update Config' : 'Create Config'}
            </Button>
          </div>

          {responseError && <Alert bsStyle="danger"> {responseError} </Alert>}
          {reloadPageOnSuccess && submittedSuccessfully && window.location.reload()}
          {showRestartPrompt && submittedSuccessfully && <Alert bsStyle="success"> {SUCCESS_MESSAGE} </Alert>}
        </div>
      </div>
    );
  }

  handleNewRepositoryID = (e: React.SyntheticEvent<any>) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ newRepositoryID: (e.target as any).value });
  };

  getNewRepositoryIDValidation = (): ValidationState => {
    if (this.isEditMode()) {
      return undefined;
    }
    const id = this.state.newRepositoryID;
    const reg = new RegExp('');
    if (!id || id.length < 5 || !reg.test(id)) {
      return 'warning';
    }
    return 'success';
  };

  onSubmitConfig = () => {
    const id = this.props.id ? this.props.id : this.state.newRepositoryID;
    const turtle = (this.refs['editor'] as TurtleEditorComponent).getTurtle();
    updateOrAddRepositoryConfig(id, turtle, this.state.validateConfiguration)
      .onValue((v) => {
        this.setState({
          responseError: undefined,
          submittedSuccessfully: true,
        });
        refresh();
      })
      .onError((error) => {
        console.log(error);
        this.setState({
          responseError: error,
          submittedSuccessfully: false,
        });
      });
  };

  isEditMode = () => {
    return this.props.id ? true : false;
  };

  renderTemplateSelector = () => {
    const { repositoryTemplates } = this.props;
    if (!repositoryTemplates) {
      return <Spinner />;
    }
    const items = repositoryTemplates.map((id) => {
      return (
        <MenuItem eventKey={id} key={id} draggable={false}>
          {id}
        </MenuItem>
      );
    });
    return (
      <DropdownButton
        bsStyle="default"
        title="From template ...."
        onSelect={this.onTemplateSelected}
        id="template-dropdown"
        style={{ marginBottom: '5px'}}
      >
        {items}
      </DropdownButton>
    );
  };

  selectTemplate = (templateId) => {
    this.cancellation.map(getRepositoryConfigTemplate(templateId)).observe({
      value: (value) => {
        this.setState({ source: value, submittedSuccessfully: false });
      },
      error: (error) => this.setState({ loadingError: error, submittedSuccessfully: false }),
    });
  };

  onTemplateSelected = (eventKey: any, e?: React.SyntheticEvent<{}>) => {
    e.preventDefault();
    e.stopPropagation();
    this.selectTemplate(eventKey);
  };

  executeDeleteRepository = (id) => {
    deleteRepositoryConfig(id).observe({
      value: () => {
        this.setState({
          responseError: undefined,
          submittedSuccessfully: true,
        });
        refresh();
      },
      error: (error) => {
        this.setState({
          responseError: error,
          submittedSuccessfully: false,
        });
      },
    });
  };

  onDeleteRepository = (id: string) => {
    const dialogRef = 'delete-repository-confirmation';
    const hideDialog = () => getOverlaySystem().hide(dialogRef);
    const props = {
      title: 'Delete repository',
      message: `Do you want to delete the "${id}" repository?`,
      onHide: () => {
        hideDialog();
      },
      onConfirm: (confirm) => {
        hideDialog();
        if (confirm) {
          this.executeDeleteRepository(id);
        }
      },
    };
    getOverlaySystem().show(dialogRef, createElement(ConfirmationDialog, props));
  };
}

export default RepositoryConfigEditor;
