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

import { vocabularies } from 'platform/api/rdf';
const { VocabPlatform } = vocabularies;

import * as styles from './FileManager.scss';

const OBJECT_KINDS = ['assets', 'templates', 'config', 'file'];

interface FilePath {
  objectKind: string;
  folder: string;
  name: string;
}

export interface MultiFileUploaderState {
  alertState?: AlertConfig;
  progress?: number;
  progressText?: string;

  storages?: ConfigStorageStatus[];
  storageId?: string;
  path?: FilePath;
  file?: File;
  paths?: FilePath[];
  files?: File[];
}

export interface MultiFileUploaderProps {
  /**
   * Allow specific types of files. See https://github.com/okonet/attr-accept for more information
   */
  acceptPattern?: string;

  
  /**
   * Context variable that will be propagated to the `resourceQuery` and `generateIdQuery`.
   */
  contextUri: string;

  /**
   * SPARQL select query to generate a unique IRI for the file to be uploaded.
   * The must have exactly one projection variable *?newId* with the IRI.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'xw
   * * __fileName__ - Name of the file
   */
  generateIriQuery?: string;

  /**
   * SPARQL construct query to generate additional meta-data which will be stored toghether with the file meta-data.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __resourceIri__ - IRI generated with `generateIdQuery`
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'
   * * __fileName__ - Name of the file
   */
  resourceQuery?: string;

  /**
   * Placeholder for the dropzone. You can use react children as well.
   */
  placeholder?: string;

  /**
   * Object storage id. Used to detect upload folder based on object sotrages which are
   * defined in '/runtime-data/config/data-storage.prop.
   */
  defaultStorageId?: string;

  /**
   * Path to a destination folder in the storage. (It should start with an Object.Kind prefix).
   */
  defaultFolder?: string;

  /**
   * Path to a destination folder in the storage. (It should start with an Object.Kind prefix).
   */
  defaultObjectKind?: string;
}

/**
 * Component which is used only for uploading files into storages. Can uses file/system/app storages.
 * @example:
 * <mp-direct-file-uploader
 *     placeholder="Test placeholder"
 *     accept-pattern="application/*"
 *     default-storage-id="runtime"
 *     default-object-kind="file"
 *     default-folder="/">
 * </mp-direct-file-uploader>
 *
 * To have ability to upload files into storage you have to have permissions on this action.
 * Permission should be defined this way:
 * storage:{write}:{storage-id}
 * You can define it in shiro.ini
 *
 * You can redefine inner body by passing custom body as a child component
 */
export class MultiFileUploader extends Component<MultiFileUploaderProps, MultiFileUploaderState> {
  private readonly cancellation = new Cancellation();

  constructor(props: MultiFileUploaderProps, context: any) {
    super(props, context);
    const objectKind =
      props.defaultObjectKind && OBJECT_KINDS.indexOf(props.defaultObjectKind) !== -1
        ? props.defaultObjectKind
        : OBJECT_KINDS[0];
    this.state = {
      alertState: undefined,
      progress: undefined,
      progressText: undefined,
      storageId: props.defaultStorageId,
      path: {
        folder: props.defaultFolder || '/',
        objectKind,
        name: undefined,
      },
      files: [],
      paths: []
    };
  }

  componentDidMount() {
    this.loadStoragesList();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  componentWillReceiveProps(newProps: MultiFileUploaderProps) {
    if (this.state.storages) {
      const storage = this.state.storages.find((storage) => storage.appId === newProps.defaultStorageId);
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
    for(let i=0; i < this.state.files.length; i ++){
        const file = this.state.files[i];
        const path = this.state.paths[i];

        const resourceQuery = `
            PREFIX rso: <http://www.researchspace.org/ontology/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX platform: <http://www.researchspace.org/resource/system/>
            PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
            CONSTRUCT {
            ?__resourceIri__ a rso:EX_File .
            ?__resourceIri__  rso:PX_has_file_name "${file.name.trim()}" .
            ?__resourceIri__ rso:PX_has_media_type "${file.type.trim()}" .
            # ?__resourceIri__ <${VocabPlatform.fileContext.value}> ${this.props.contextUri}.
            } WHERE {}
        `;

        const generateIriQuery=`
            SELECT ?resourceIri {
            BIND(IRI(CONCAT("http://www.researchspace.org/resource/", "EX_File/", ?__fileName__)) AS ?resourceIri) .
            }
        `;

        // const generateIriQuery=`
        //     SELECT ?resourceIri WHERE {
        //         BIND(URI(CONCAT(STR("${this.props.contextUri}"), "/", "${file.name.trim()}")) as ?resourceIri)
        //     }
        // `;
        
        console.log("File: "+file.name);
        console.log("resourceQuery" + resourceQuery);
        console.log("generateIriQuery" + generateIriQuery);

        this.cancellation
        .map(
            this.getFileManager().uploadFileAsResource({
                file: file,
                storage: this.state.storageId,
                generateIriQuery: generateIriQuery,
                resourceQuery: resourceQuery,
                contextUri: this.props.contextUri,
                onProgress: (percent) =>
                  this.setState({
                    progress: percent,
                    progressText: 'Uploading ...',
                  }),
              })

            // this.getFileManager().uploadFileDirectlyToStorage({
            // storage: this.state.storageId,
            // folder: this.getFolder(),
            // fileName: path.name,
            // file: file,
            // onProgress: (percent) => {
            //     this.setState({
            //     progress: percent,
            //     progressText: 'Uploading ...'+file.name,
            //     });
            // },
            // })
        )
        .observe({
            value: (resource) => {
            addNotification({
                message: 'File succesfully uploaded.',
                level: 'success',
            });
            this.setState({
              
                alertState: {
                alert: AlertType.SUCCESS,
                message:
                    `File "${resource}" has been successfully ` + `uploaded to the storage "${this.state.storageId}".`,
                },
                progress: null,
                path: {
                ...this.state.path,
                name: '',
                },
                file: undefined,
                files: [],
                paths: [],
            });
            },
            error: (error) => {
            addNotification({
                message: 'Failed to upload file.',
                level: 'error',
            });
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
                files: [],
                paths: [],
            });
            },
        });
    }
  }

  onDrop(acceptedFiles, rejectedFiles) {
    acceptedFiles.forEach((file) => {
      if (this.isFileAccepted(file)) {
        this.onDropAccepted(file);
      } else {
        console.log("acc-rej");
        this.onDropRejected(file);
      }
    });

  rejectedFiles.forEach((file) => {
    console.log("rej-rej");
    this.onDropRejected(file);
  });
  }

  isFileAccepted(file) {
    console.log("Accept pattern: "+this.props.acceptPattern);
    const acceptedFileTypes = this.props.acceptPattern.split(',').map((type) => type.trim());
    return acceptedFileTypes.includes(file.type);
  }

  onDropAccepted(file) {
    console.log(file)
    console.log("file type accept: expected" + this.props.acceptPattern)
    const { path } = this.state;
    this.setState((prevState) => ({
      alertState: null,
      progress: null,
      file: file,
      path: {
        ...path,
        name: file.name,
      },
      files:  [...prevState.files, file],
      paths: [...prevState.paths, {
            ...path,
            name: file.name,
      }]
    }));
    // console.log("Paths for "+file.name+" -> "+ JSON.stringify(this.state.path, null, 2));
    // console.log("Fnames for "+file.name+" -> "+ JSON.stringify(this.state.files, null, 2));
    // console.log("Paths for "+file.name+" -> "+ JSON.stringify(this.state.paths, null, 2));
  }

  onDropRejected(file) {
    console.log("rejected");
    console.log(JSON.stringify(file, null, 2));
    this.setState({
      alertState: {
        alert: AlertType.WARNING,
        message: this.state.alertState? this.state.alertState.message + 
        `\nFile: ${file.name} -> Incompatible file type: expected ${this.props.acceptPattern}, got ${file.type}`
        : `File: ${file.name} -> Incompatible file type: expected ${this.props.acceptPattern}, got ${file.type}`,
      },
      progress: null,
    });
  }

  loadStoragesList() {
    this.cancellation.map(getStorageStatus()).observe({
      value: (storages) => {
        const storage =
          this.props.defaultStorageId && storages.find((storage) => storage.appId === this.props.defaultStorageId);
        
        console.log("Storage____: "+JSON.stringify(storage, null, 2));
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
    console.log("Storages: "+JSON.stringify(this.state.storages, null, 2));
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

  render() {
    const alert = this.state.alertState ? (
      <div className={styles.alertComponent}>
        <Alert {...this.state.alertState}></Alert>
      </div>
    ) : null;
    const { storages: storages, path, file, storageId } = this.state;
    const fileNotSelected = !file;
    const renderedPath = `${storageId}: ${this.getFolder()}/${path.name || 'undefined'}`;

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
              onDrop={this.onDrop.bind(this)}
            //   onDropAccepted={this.onDropAccepted.bind(this)}
            //   onDropRejected={this.onDropRejected.bind(this)}
              noClick={Boolean(this.state.progress || !storages)}
            >
              {fileNotSelected ? (
                <div className={styles.mpDropZonePlaceHolder}>
                  {this.props.children || (
                    <div className={styles.mpDropZonePlaceHolder}>
                      {this.props.placeholder || 'Select file to upload.'}
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
            <label>Target Storage</label>
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
            />
            {/* <label>Target Folder</label>
            <div className={styles.storageInput} style={{ display: 'flex' }}>
              <ReactSelect
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
                  console.log("Pathy: "+JSON.stringify(this.state.path,null,2));
                }}
              />
              <input
                value={path.folder}
                style={{ borderLeft: 'none' }}
                placeholder="Sub folder"
                title="Sub folder"
                onChange={(event) => {
                  const newPath: FilePath = { ...this.state.path, folder: event.target.value };
                  this.setState({ path: newPath });
                }}
                className={`plain-text-field__text form-control ${styles.storageInput}`}
              />
            </div> 
            <label>Target Filename</label>
            <input
              disabled={fileNotSelected}
              value={path.name}
              placeholder={fileNotSelected ? 'Please select first a file to upload...' : 'Input filename...'}
              title={fileNotSelected ? 'Please select first a file to upload' : 'Filename'}
              onChange={(event) => this.setState({ path: { ...path, name: event.target.value } })}
              className={`plain-text-field__text form-control ${styles.storageInput}`}
            />*/}
          </div>
        </div>
        <div className={styles.row} style={{ flexDirection: 'column', marginTop: '30px' }}>
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

        </div>
        <div className={styles.row}>{alert}</div>
      </div>
    );
  }
}

export default MultiFileUploader;
