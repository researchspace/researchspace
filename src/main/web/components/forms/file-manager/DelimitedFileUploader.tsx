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
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';
import ReactSelect from 'react-select';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { getStorageStatus, ConfigStorageStatus } from 'platform/api/services/config';
import { FileManager, FileResource } from 'platform/api/services/file-manager';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';
import { addNotification } from 'platform/components/ui/notification';

import { getFileIcon } from './FileVisualizer';

import * as styles from './FileManager.scss';

import axios from 'axios';
import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';
import { Rdf } from 'platform/api/rdf';
import * as moment from 'moment';
import { refresh } from 'platform/api/navigation';

// const OBJECT_KINDS = ['file'];
const OBJECT_KINDS = 'file';
const DELIMITED_FILE_DATA_FOLDER = '/Delimited_Data/';
const STORAGE_ID = 'runtime';
// const ACCEPT_PATTERN = 'text/csv'
const FLASK_BASE_URL = 'http://localhost:5000/';

interface FilePath {
  objectKind: string;
  folder: string;
  name: string;
}

interface MappedColumnAttr {
  value: string;
  label: string;
}

// interface DelimitedFileMappings {
//   uniqueIdentifier: string;
//   uniqueIdentifierLabel: string;
//   columns: [];
// }

export interface State {
  alertState?: AlertConfig;
  progress?: number;
  progressText?: string;

  storages?: ConfigStorageStatus[];
  storageId?: string;
  path?: FilePath;
  file?: File;
  isFileNotUploaded?: boolean;
  //fileMapping?: DelimitedFileMappings;
  uniqueIdentifier: string;
  uniqueIdentifierLabel: string;
  columns: [];
  selectedMappedColumns: MappedColumnAttr[]
}

export interface Props {
  /**
   * Allow specific types of files. See https://github.com/okonet/attr-accept for more information
   */
  acceptPattern?: string;

  /**
   * Placeholder for the dropzone. You can use react children as well.
   */
  placeholder?: string;

  targetGraph?: Data.Maybe<string>;

  keepSourceGraphs?: boolean;
  /**
   * Object storage id. Used to detect upload folder based on object sotrages which are
   * defined in '/runtime-data/config/data-storage.prop.
   */
  // defaultStorageId?: string;

  /**
   * Path to a destination folder in the storage. (It should start with an Object.Kind prefix).
   */
  // defaultFolder?: string;

  /**
   * Path to a destination folder in the storage. (It should start with an Object.Kind prefix).
   */
  // defaultObjectKind?: string;
}

/**
 * Component which is used only for uploading files into storages. Can uses file/system/app storages.
 * @example:
 * <mp-direct-file-uploader
 *     placeholder="Test placeholder"
 *     accept-pattern="application/*">
 * </mp-direct-file-uploader>
 *
 * To have ability to upload files into storage you have to have permissions on this action.
 * Permission should be defined this way:
 * storage:{write}:{storage-id}
 * You can define it in shiro.ini
 *
 * You can redefine inner body by passing custom body as a child component
 */
export class DelimitedFileUploader extends Component<Props, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    const objectKind = OBJECT_KINDS;
    this.state = {
      alertState: undefined,
      progress: undefined,
      progressText: undefined,
      storageId: STORAGE_ID,
      path: {
        folder: DELIMITED_FILE_DATA_FOLDER,
        objectKind,
        name: undefined,
      },
      isFileNotUploaded: true,
      uniqueIdentifier: undefined,
      uniqueIdentifierLabel: undefined,
      columns: [],
      selectedMappedColumns: [],
    };
  }

  componentDidMount() {
    this.loadStoragesList();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  componentWillReceiveProps(newProps: Props) {
    if (this.state.storages) {
      const storage = this.state.storages.find((storage) => storage.appId === 'runtime');
      if (storage) {
        this.setState({ storageId: storage.appId });
      }
    }
  }

  private getFileManager() {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  uploadFile() {
    const file = this.state.file;
    this.cancellation
      .map(
        this.getFileManager().uploadFileDirectlyToStorage({
          storage: this.state.storageId,
          folder: this.getFolder(),
          fileName: this.state.path.name,
          file: file,
          onProgress: (percent) => {
            this.setState({
              progress: percent,
              progressText: 'Uploading File...',
            });
          },
        })
      )
      .observe({
        value: (resource) => {
          this.getFileColumnsForMapping();
          // addNotification({
          //   message: 'File succesfully uploaded.',
          //   level: 'success',
          // });
          this.setState({
            // alertState: {
            //   alert: AlertType.SUCCESS,
            //   message:
            //     `File "${resource}" has been successfully ` + `uploaded to the storage "${this.state.storageId}".`,
            // },
            progress: 80,
            path: this.state.path,
            file: file,
            isFileNotUploaded: false,
          });
        },
        error: (error) => {
          // addNotification({
          //   message: 'Failed to upload file.',
          //   level: 'error',
          // });
          console.log(error)
          this.setState({
            alertState: {
              alert: AlertType.WARNING,
              message: `Failed to upload file "${file.name}": ${error} - ${error.response.text}`,
            },
            progress: null,
            path: {
              ...this.state.path,
              name: '',
            },
            file: undefined,
            isFileNotUploaded: true,
          });
        },
      });
  }

  onDropAccepted(files: File[]) {
    const { path } = this.state;
    const file = files[0];
    this.setState({
      alertState: null,
      progress: null,
      file: file,
      path: {
        ...path,
        name: file.name,
      },
    });

    //Calling it here to upload file without button click
    this.uploadFile()
  }

  onDropRejected(files: File[]) {
    const file = files[0];
    this.setState({
      alertState: {
        alert: AlertType.WARNING,
        message: `Incompatible file type: expected ${this.props.acceptPattern}, got ${file.type}`,
      },
      progress: null,
    });
  }

  loadStoragesList() {
    this.cancellation.map(getStorageStatus()).observe({
      value: (storages) => {
        const storage =
          'runtime' && storages.find((storage) => storage.appId === 'runtime');
        this.setState({
          storages,
          storageId: storage ? storage.appId : storages[0].appId,
        });
      },
      error: (error) => {
        this.setState({
          alertState: {
            alert: AlertType.WARNING,
            message: `Failed to fetch storage list: ${error}`,
          },
          progress: null,
        });
      },
    });
  }

  private getFolder() {
    const { objectKind } = this.state.path;
    let folder = this.state.path.folder;
    // filter following situations: some/path/////folder
    folder = folder
      .split('/')
      .filter((token) => Boolean(token))
      .join('/');

    if (folder) {
      return `${objectKind}/${folder}`;
    } else {
      return objectKind;
    }
  }

  getFileColumnsForMapping(){
    const queryParams = {
      dataFileName: this.state.file.name
    };

    axios.get(FLASK_BASE_URL + 'filecolumns', {
      params: queryParams,
    })
    .then((response) => {
      
      // set columns of delimited file
      this.setState({
        columns: response.data,
      });
    })
    .catch((error) => {
      console.log('Unable to fetch the Columns for RDF Mapping ', error)
    });
  }

  generateRDFFromDelimitedFile(){
    
    console.log('mapped columns',this.state.selectedMappedColumns)
    let var_mappedColumnsArray;
    if (this.state.selectedMappedColumns.length === 0)
    {
      var_mappedColumnsArray = this.state.columns
      // console.log('length columns',this.state.selectedMappedColumns.length)
      // console.log('mapped columns',this.state.selectedMappedColumns)

      // const columnsObj = this.state.columns.map((selectedValue) => ({
      //   value: selectedValue,
      //   label: selectedValue,
      // }));

      // this.setState({
      //   selectedMappedColumns:  columnsObj,
      // });

      // this.setState({ selectedMappedColumns: columnsObj }, () => {
      //   // The state has been updated; it's safe to continue here.
      // });
    }
    else{
      var_mappedColumnsArray = this.state.selectedMappedColumns.map(item => item.value)
    }

    const request_payload = {
      Delimited_File_Name: this.state.file.name,
      Unique_Id_Column: this.state.uniqueIdentifier,
      Unique_Id_Label_Column: this.state.uniqueIdentifierLabel,
      Mapped_Columns_Array: var_mappedColumnsArray
    };

    axios.post(FLASK_BASE_URL + 'generaterdf', request_payload)
    .then((response) => {
      this.uploadRDFData(response)

      this.setState({
        // alertState: {
        //   alert: AlertType.SUCCESS,
        //   message:
        //     `File and Mappings has been successfully uploaded to the storage "${this.state.storageId}".`,
        // },
        progress: null,
        path: {
          ...this.state.path,
          name: '',
        },
        file: undefined,
        isFileNotUploaded: true,
        uniqueIdentifier: undefined,
        uniqueIdentifierLabel: undefined,
        columns: [],
        selectedMappedColumns: [],
      });
    })
    .catch((error) => {
      console.error('Error Occurred while generating RDF', error);
    });
  }

  uploadRDFData(rdfResponse: any){

    const delimitedFileName = this.state.file.name
    const rdfFileName = this.state.file.name.split('.')[0] + '.ttl'
    

    let targetGraph;
    if (this.props.targetGraph.isJust) {
      targetGraph = this.props.targetGraph.get();
    } else {
      targetGraph = `file://${rdfFileName}-${createTimestamp()}`;
    }

    const create_rdf_request = RDFGraphStoreService.createGraphFromFile({
      targetGraph: Rdf.iri(encodeURI(targetGraph)),
      keepSourceGraphs: this.props.keepSourceGraphs,
      file: rdfResponse.data,
      contentType: rdfResponse.headers['content-type'],
      repository: 'default',
      onProgress: (percent) => {
        // Handle progress here if needed
        console.log('Progress:', percent);
      },    
    });

    this.cancellation.map(create_rdf_request).observe({
      value: () => {
        addNotification({
        message: 'File succesfully uploaded.',
        level: 'success',
        });

        this.setState({
          alertState: {
            alert: AlertType.SUCCESS,
            message:
              'File ' + delimitedFileName + ' and Mappings has been successfully uploaded.',
          },
        });
        setTimeout(() => refresh(), 2000);
      },
      error: (error) => {
        console.log(error)
        this.setState({
          alertState: {
            alert: AlertType.WARNING,
            message: 'Failed to upload file ' + delimitedFileName + ' : ' + error,
          },
        });
        addNotification({
          message: 'Failed to upload file.',
          level: 'error',
        });
      },
    });
  }

  render() {
    const alert = this.state.alertState ? (
      <div className={styles.alertComponent}>
        <Alert {...this.state.alertState}></Alert>
      </div>
    ) : null;
    const { storages: storages, path, file, storageId } = this.state;
    const fileNotSelected = !file;
    const renderedPath = `${storageId}: ${this.getFolder()}/${path.name || 'undefined'}`;

    const delimitedFileMapping = (
      <React.Fragment>

          <label>Unique Identifier</label>
          <ReactSelect
            disabled={this.state.isFileNotUploaded}
            className={styles.storageInput}
            clearable={true}
            value={this.state.uniqueIdentifier}
            options={ this.state.columns ? 
              this.state.columns.map((column) => ({
                  value: column,
                  label: column,
                }))
                : []
            }
            onChange={(selectedUniqueId) => {
              if (!selectedUniqueId) { //when user clears the selection. Value is NULL
                this.setState({
                  uniqueIdentifier: '', // Clear the selected columns
                  progress: 85,
                  progressText: 'Uploading Mapping...',
                });
              } 
              else {
                // Access the selected values directly from selectedColumns
                this.setState({
                  uniqueIdentifier: selectedUniqueId.value,
                  progress: 85,
                  progressText: 'Uploading Mapping...',});
                }}
              }
              // if (Array.isArray(selectedUniqueId) || typeof selectedUniqueId.value !== 'string') {
              //   return;
              // }
              // this.setState({
              //   uniqueIdentifier: selectedUniqueId.value,
              //   progress: 85,
              //   progressText: 'Uploading Mapping...',});
              // }}
          />

          <label>Unique Identifier Label</label>
          <ReactSelect
            disabled={this.state.isFileNotUploaded}
            className={styles.storageInput}
            clearable={false}
            value={this.state.uniqueIdentifierLabel}
            options={ this.state.columns ? 
              this.state.columns.filter((item) => item !== this.state.uniqueIdentifier).map((column) => ({
                  value: column,
                  label: column,
                }))
                : []
            }
            onChange={(selectedUniqueIdLabel) => {
              if (Array.isArray(selectedUniqueIdLabel) || typeof selectedUniqueIdLabel.value !== 'string') {
                return;
              }
              this.setState({
                uniqueIdentifierLabel: selectedUniqueIdLabel.value,
                progress: 90,
                progressText: 'Uploading Mapping...',});
              }}
          />

          <label>Select Columns to be Mapped</label>
          <ReactSelect
            multi={true}
            disabled={this.state.isFileNotUploaded}
            className={styles.storageInput}
            clearable={true}
            value={this.state.selectedMappedColumns}
            options={ this.state.columns ? 
              this.state.columns
              .filter((item) => item !== this.state.uniqueIdentifier && item !== this.state.uniqueIdentifierLabel)
              .map((column) => ({
                  value: column,
                  label: column,
                }))
                : []
            }
              onChange={(selectedColumns) => {
                // Check if no columns are selected (user cleared the selection)
                // if (!selectedColumns || selectedColumns.length === 0) {
                //   this.setState({
                //     selectedMappedColumns: [], // Clear the selected columns
                //     progress: 95,
                //     progressText: 'Uploading Mapping...',
                //   });
                // } else {
                  // Access the selected values directly from selectedColumns
                  this.setState({
                    selectedMappedColumns:  selectedColumns.map((selectedValue) => ({
                      value: selectedValue['value'],
                      label: selectedValue['label'],
                    })),
                    progress: 95,
                    progressText: 'Uploading Mapping...',
                  });
                }
              }
          />
          <button
                title={
                  fileNotSelected ? 'Please select first a file to upload...':
                  (!this.state.uniqueIdentifierLabel
                    ? 'Please select Unique Identifier Label for mapping'
                    : 'Click on the button to upload')
                }
                className="btn btn-primary"
                disabled={!this.state.uniqueIdentifierLabel}
                onClick={() => this.generateRDFFromDelimitedFile()}
                style={{ marginTop: '15px'}}
              >
                Upload File and Mapping
          </button>
      </React.Fragment>
    );

    return (
      <div className={styles.DirectFileUploader}>
        <div className={styles.row} style={{ alignItems: 'center' }}>
          <div className={styles.FileUploader}>
            {this.state.progress ? (
              <ReactBootstrap.ProgressBar
                active={true}
                min={0}
                max={100}
                now={this.state.progress}
                label={this.state.progressText}
              ></ReactBootstrap.ProgressBar>
            ) : null}
            <Dropzone
              accept={this.props.acceptPattern}
              onDropAccepted={this.onDropAccepted.bind(this)}
              onDropRejected={this.onDropRejected.bind(this)}
              noClick={Boolean(this.state.progress || !storages)}
            >
              {fileNotSelected ? (
                <div className={styles.mpDropZonePlaceHolder}>
                  {this.props.children || (
                    <div className={styles.mpDropZonePlaceHolder}>
                      {this.props.placeholder || 'Select the CSV file to upload.'}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.fileIcon}>
                  <i className={getFileIcon(file.type)} aria-hidden="true"></i>
                </div>
              )}
            </Dropzone>
          </div>
          <div className={styles.rightInputBar}>
            {/* <label>Target Storage</label>
            <ReactSelect
              className={styles.storageInput}
              clearable={false}
              value={this.state.storageId}
              options={
                storages
                  ? storages.map((storageStatus) => ({
                      value: storageStatus.appId,
                      label: storageStatus.writable ? storageStatus.appId : `${storageStatus.appId} (readonly)`,
                      disabled: !storageStatus.writable,
                    }))
                  : []
              }
              onChange={(storageId) => {
                if (Array.isArray(storageId) || typeof storageId.value !== 'string') {
                  return;
                }
                this.setState({ storageId: storageId.value });
              }}
            /> */}
            {/* <label>Target Folder</label> */}
            {/* <div className={styles.storageInput} style={{ display: 'flex' }}> */}
              {/* <ReactSelect
                clearable={false}
                style={{ width: 85 }}
                value={path.objectKind}
                options={OBJECT_KINDS.map((objectKind) => ({
                  value: objectKind,
                  label: objectKind,
                }))}
                onChange={(objectKind) => {
                  if (Array.isArray(objectKind) || typeof objectKind.value !== 'string') {
                    return;
                  }
                  const newPath: FilePath = { ...this.state.path, objectKind: objectKind.value };
                  this.setState({ path: newPath });
                }}
              /> */}
              {/* <input
                disabled={true}
                value={path.objectKind}
                style={{ width: 35, padding: 5 }}
              />
              <input
                disabled={true}
                value={path.folder}
                style={{ borderLeft: 'none' }}
                placeholder="Sub folder"
                title="Sub folder"
                // onChange={(event) => {
                //   const newPath: FilePath = { ...this.state.path, folder: event.target.value };
                //   this.setState({ path: newPath });
                // }}
                className={`plain-text-field__text form-control ${styles.storageInput}`}
              /> */}
            {/* </div> */}
            <label>Filename</label>
            <input
              disabled={true}
              value={path.name}
              placeholder={fileNotSelected ? 'Please select first a file to upload...' : 'Input filename...'}
              title={fileNotSelected ? 'Please select first a file to upload' : 'Filename'}
              onChange={(event) => this.setState({ path: { ...path, name: event.target.value } })}
              className={`plain-text-field__text form-control ${styles.storageInput}`}
            />

          {/* <label>Target Path Preview</label>
            <input
              disabled={true}
              value={fileNotSelected ? '' : renderedPath}
              style={{ marginRight: 15 }}
              placeholder="Please use the file selector to select a file to upload..."
              title={
                fileNotSelected
                  ? 'Please use the file selector to select a file to upload'
                  : 'Target path: ' + renderedPath
              }
              className={`plain-text-field__text form-control ${styles.storageInput}`}
            /> */}
            {/* <button
              title={
                fileNotSelected
                  ? 'Please use the file selector to select a file to upload'
                  : `Upload file to storage "${this.state.storageId}" and location "${this.getFolder()}${path.name}"`
              }
              className="btn btn-primary"
              disabled={fileNotSelected || !path.name}
              onClick={() => this.uploadFile()}
            >
              Upload
            </button> */}
          {delimitedFileMapping}
          </div>
        </div>
        {/* <div className={styles.row} style={{ flexDirection: 'column', marginTop: '30px' }}>
          <label>Target Path Preview</label>
          <div className={styles.storageInput} style={{ display: 'flex' }}>
            <input
              disabled={true}
              value={fileNotSelected ? '' : renderedPath}
              style={{ marginRight: 15 }}
              placeholder="Please use the file selector to select a file to upload..."
              title={
                fileNotSelected
                  ? 'Please use the file selector to select a file to upload'
                  : 'Target path: ' + renderedPath
              }
              className={`plain-text-field__text form-control ${styles.storageInput}`}
            />
            <button
              title={
                fileNotSelected
                  ? 'Please use the file selector to select a file to upload'
                  : `Upload file to storage "${this.state.storageId}" and location "${this.getFolder()}${path.name}"`
              }
              className="btn btn-primary"
              disabled={fileNotSelected || !path.name}
              onClick={() => this.uploadFile()}
            >
              Upload
            </button>
          </div>
        </div> */}
        <div className={styles.row}>{alert}</div>
      </div>
    );
  }
}

function createTimestamp(): string {
  return moment().format('DD-MM-YYYY-hh-mm-ss');
}

export default DelimitedFileUploader;