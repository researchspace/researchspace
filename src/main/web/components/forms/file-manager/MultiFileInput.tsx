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
import * as _ from 'lodash';
import { FormControl, Button, FormGroup, Radio, ProgressBar } from 'react-bootstrap';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { FileManager } from 'platform/api/services/file-manager';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';

import {
  AtomicMultiValueInputProps,
  AtomicValueInput,
  AtomicValueHandler,
  SingleValueInput,
  SingleValueHandlerProps,
} from '../inputs/SingleValueInput';
import { EmptyValue, CompositeValue, AtomicValue, FieldValue, ErrorKind } from '../FieldValues';
import FileVisualizer from './FileVisualizer';

import * as styles from './FileManager.scss';

interface MultiFileInputConfig {
  /** Target storage ID. */
  storage: string;

  /** Temporary storage ID. */
  tempStorage: string;

  /**
   * Media type pattern to allow only specific types of files.
   * See https://github.com/okonet/attr-accept for more information.
   */
  acceptPattern?: string;

  /**
   * SPARQL select query which is used to generate unique IRI for the uploaded file.
   * The query should have only one projection variable `?resourceIri` with the IRI.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * `?__mediaType__`: media type: `image/png`, etc
   * * `?__fileName__`: file name, including extension
   */
  generateIriQuery?: string;

  /**
   * SPARQL construct query which is used to generate extra data that should be associated with
   * uploaded file.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * `?__resourceIri__`: IRI generated with `generate-id-query`
   * * `?__mediaType__`: media type: `image/png`, etc
   * * `?__fileName__`: file name, including extension
   */
  resourceQuery?: string;

  /**
   * Required to be specified if file name predicate in the `resource-query`
   * is different from the default.
   */
  namePredicateIri?: string;

  /**
   * Required to be specified if media type predicate in the `resource-query`
   * is different from the default.
   */
  mediaTypePredicateIri?: string;

  /**
   * Placeholder for the drop zone. It's also possible to provide
   * custom placeholder by passing a child component.
   */
  placeholder?: string;


  /**
   * Upload file from the url or drop.
   * @default false
   */
  fromUrlOrDrop?: boolean;
}

export interface MultiFileInputProps extends AtomicMultiValueInputProps, MultiFileInputConfig {}

interface State {
  alertState?: AlertConfig;
  progress?: number;
  progressText?: string;
  selectUrl?: boolean;
  resourceIRIs?: Rdf.Iri[];
  handler?: FileHandler;
}

/**
 * File uploader which works in a couple with field and is used as
 * an input components on forms page.
 * (See documentation page for semantic forms.)
 */
export class MultiFileInput extends AtomicValueInput<MultiFileInputProps, State> {
  private readonly cancellation = new Cancellation();
  private urlInputRef: HTMLInputElement;

  constructor(props: MultiFileInputProps, context: any) {
    super(props, context);
    this.state = {
      alertState: undefined,
      progress: undefined,
      progressText: undefined,
      handler: this.getHandler(),
    };
    // this.props = {
    //   ...{} as MultiFileInputProps,
    // };
    this.state.handler._setFileManager(this.getFileManager());
  }

  private getHandler(): FileHandler {
    const { handler } = this.props;
    if (!(handler instanceof FileHandler)) {
      throw new Error('Invalid value handler for CompositeInput');
    }
    return handler;
  }  

  private getFileManager() {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  onDropAccepted(files: File[]) {
    console.log("Files"+files)
    this.setState({ alertState: null, progress: null });
    // const file = files[0];
    // this.props.value = [];
    this.setState({resourceIRIs: []});
    this.state.handler._setResourceIRIs([]);

    for(let i=0; i<files.length; i++){

      const file=files[i];
      console.log("Uploading to temporary: "+JSON.stringify(file, null, 2));

    // upload file to the temporal storage
      this.cancellation
        .map(
          this.getFileManager().uploadFileTemporary({
            storage: this.props.tempStorage,
            file: file,
            onProgress: (percent) =>
              this.setState({
                progress: percent,
                progressText: 'Uploading ...',
              }),
          })
        )
        .observe({
          value: (temporaryResourceIri) => {

            console.log("Temporary Resource: "+temporaryResourceIri);

            this.setState({
              alertState: null,
              progress: null,
            });
            this.setState(prevState => ({ resourceIRIs: [...prevState.resourceIRIs, temporaryResourceIri] }));
            const newValue = AtomicValue.set(this.props.value, { value: temporaryResourceIri });
            this.props.updateValue(() => newValue);
            // this.props.values.push(newValue);
            this.state.handler._appendResourceIRIs(temporaryResourceIri);
            console.log("Fm: "+JSON.stringify(this.getHandler().fileManager.getFileResource(temporaryResourceIri), null, 2));
            console.log("State ResourceIRIs: "+JSON.stringify(this.state.handler.resourceIRIs));
            // console.log("State ResourceIRIs: "+JSON.stringify(this.props));
            // this.fileManager.getFileResource(resourceIri).flatMap((resource) => {});
          },
          error: (error) => {
            this.setState({
              alertState: {
                alert: AlertType.WARNING,
                message: `Failed to upload file "${file.name}": ${error} - ${error.response.text}`,
              },
              progress: null,
            });
          },
        });
      }
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

  render() {

    console.log("Hi its me");
    const resourceIri = FieldValue.asRdfNode(this.props.value) as Rdf.Iri | undefined;
    const temporaryIri = resourceIri && FileManager.isTemporaryResource(resourceIri);

    return (
      <div className={styles.FileManager}>
        <div className={styles.header}>
          {this.state.progress ? (
            <ProgressBar
              active={true}
              min={0}
              max={100}
              now={this.state.progress}
              label={this.state.progressText}
            ></ProgressBar>
          ) : resourceIri && !temporaryIri ? (
            <a className={styles.uploadedImageIri} title={resourceIri.value} href={resourceIri.value}>
              {resourceIri.value}
            </a>
          ) : resourceIri ? (
            <div className={styles.uploadedImageIri} title="File is loaded">
              File is loaded
            </div>
          ) : null}
        </div>
        {resourceIri ? (
          <div className={styles.fileContainer}>          
            <h1>Manik from first block</h1>
            <FileVisualizer
              iri={resourceIri.value}
              storage={temporaryIri ? this.props.tempStorage : this.props.storage}
              namePredicateIri={this.props.namePredicateIri}
              mediaTypePredicateIri={this.props.mediaTypePredicateIri}
            ></FileVisualizer>
            <span className={`${styles.caRemoveFile} fa fa-times`} onClick={this.removeFile}></span>
          </div>
        ) : (
            this.renderBody()
        )}
      </div>
    );
  }

  renderBody = () => {
    if (FieldValue.isEmpty(this.props.value)) {
      if (this.props.fromUrlOrDrop) {
        return (
          <div className={styles.selectorHolder}>
            <h1>Manik Here</h1>
            {this.renderInputSelector()}
            {this.state.selectUrl ? this.renderUrlInput() : this.renderDropZone()}
          </div>
        );
      } else {
        return this.renderDropZone();
      }
    } else if (this.state.alertState) {
      return this.renderError();
    } else {
      return this.renderProgress();
    }
  };

  renderProgress() {
    return <div className={styles.emptyBody}>Loading..</div>;
  }

  renderError() {
    return <div className={styles.emptyBody}>Error</div>;
  }

  renderDropZone() {
    const alert = this.state.alertState ? <Alert {...this.state.alertState}></Alert> : null;
    const placeholder = this.props.placeholder || 'Please drag&drop your file here';
    return (
      <div className={styles.FileUploader}>
        <Dropzone
          accept={this.props.acceptPattern}
          onDropAccepted={this.onDropAccepted.bind(this)}
          onDropRejected={this.onDropRejected.bind(this)}
          noClick={Boolean(this.state.progress)}
        >
          {(this.props.children as JSX.Element | JSX.Element[]) || (
            <div className={styles.mpDropZonePlaceHolder}>{placeholder}</div>
          )}
        </Dropzone>
        {alert ? <div className={styles.alertComponent}>{alert}</div> : null}
      </div>
    );
  }


  renderUrlInput = () => {
    const alert = this.state.alertState ? <Alert {...this.state.alertState}></Alert> : null;
    return (
      <React.Fragment>
        {alert ? <div className={styles.alertComponent}>{alert}</div> : null}

        <div className={styles.urlInputHolder}>
          <FormControl inputRef={ref => { this.urlInputRef = ref; }}
            type='text' placeholder='Please type file URL here' />
          <Button bsStyle='primary' type='submit'
            onClick={this.fetchFileFromUrl}
          >Fetch</Button>
        </div>
      </React.Fragment>
    );
  }

  renderInputSelector = () => {
    return (
      <FormGroup>
        <Radio name='inputSelector' inline
          checked={!this.state.selectUrl}
          onClick={ () => this.setState({selectUrl: false}) }
        >
          File Upload
        </Radio>{' '}
        <Radio name='inputSelector' inline
          checked={this.state.selectUrl}
          onClick={ () => this.setState({selectUrl: true}) }
        >
          URL
        </Radio>{' '}
      </FormGroup>
    );
  }

  fetchFileFromUrl = () => {
    if (!_.isEmpty(this.urlInputRef?.value)) {
      fetch(this.urlInputRef.value)
        .then((response) => {
          if (!response.ok) {
            this.setState({
              alertState: {
                alert: AlertType.WARNING,
                message: 'Faild to fetch file from URL!',
              }
            });
          }
          return response.blob();
        })
        .then(
          blob => {
            this.onDropAccepted([new File([blob], this.urlInputRef.value, {type: blob.type})]);
          }
        ).catch((e: Error) => {
          this.setState({
            alertState: {
              alert: AlertType.WARNING,
              message: e.message + ' Please, try to upload the file manually.',
            }
          });
        });

    }
  }

  removeFile = () => {
    const iri = FieldValue.asRdfNode(this.props.value) as Rdf.Iri;
    if (FileManager.isTemporaryResource(iri)) {
      this.getFileManager()
        .deleteFileResource(iri, this.props.storage)
        .observe({
          value: () => this.props.updateValue(() => FieldValue.empty),
          error: (error) => {
            this.setState({
              alertState: {
                alert: AlertType.WARNING,
                message: `Failed to delete file: ${error}`,
              },
              progress: null,
            });
          },
        });
    } else {
      this.props.updateValue(() => FieldValue.empty);
    }
  };

  componentWillUnmount() {
    this.cancellation.cancelAll();
    if (this.props && this.props.value.type !== 'empty') {
      const iri = FieldValue.asRdfNode(this.props.value) as Rdf.Iri;
      if (FileManager.isTemporaryResource(iri)) {
        this.getFileManager().removeTemporaryResource(iri, this.props.storage);
      }
    }
  }

  static makeHandler(props: SingleValueHandlerProps<MultiFileInputProps>) {
    return new FileHandler(props);
  }
}

class FileHandler extends AtomicValueHandler {
  private readonly baseInputProps: MultiFileInputProps;
  public resourceIRIs: Rdf.Iri[];
  public fileManager: FileManager | undefined;

  constructor(props: SingleValueHandlerProps<MultiFileInputProps>) {
    super(props);
    this.baseInputProps = props.baseInputProps;
  }

  // HACK: we need to access FileManager but it depends on outer semantic context
  // which is unfortune. In the future is would be better to provide repository
  // explicitly in props to avoid this.
  _setFileManager(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  // Using same hack as above for resourceIRIs
  _setResourceIRIs(resourceIRIs: Rdf.Iri[]){
    this.resourceIRIs = resourceIRIs;
  }

  _appendResourceIRIs(resourceIRI: Rdf.Iri){
    this.resourceIRIs.push(resourceIRI);
  }


  finalize(value: EmptyValue | AtomicValue, owner: EmptyValue | CompositeValue): Kefir.Property<FieldValue>{
    if (value.type === EmptyValue.type) {
      return Kefir.constant(value);
    }
    for(let i = 0; i<this.resourceIRIs.length; i++){
      const newValue = AtomicValue.set(value, { value: this.resourceIRIs[i] });
      
      // const value:AtomicValue = {...value, {value: this.resourceIRIs[i]}};
    }
  }

  finalize_one(value: EmptyValue | AtomicValue, owner: EmptyValue | CompositeValue): Kefir.Property<FieldValue> {
    if (value.type === EmptyValue.type) {
      return Kefir.constant(value);
    }
    const resourceIri = value.value as Rdf.Iri;
    if (!FileManager.isTemporaryResource(resourceIri)) {
      return Kefir.constant(value);
    } else if (this.fileManager) {
      return this.fileManager
        .getFileResource(resourceIri)
        .flatMap((resource) => {
          return this.fileManager
            .createResourceFromTemporaryFile({
              fileName: resource.fileName,
              storage: this.baseInputProps.storage,
              temporaryStorage: this.baseInputProps.tempStorage,
              generateIriQuery: this.baseInputProps.generateIriQuery,
              resourceQuery: this.baseInputProps.resourceQuery,
              mediaType: resource.mediaType,
            })
            .map((createdResourceIri) => {
              return AtomicValue.set(value, { value: createdResourceIri });
            });
        })
        .toProperty();
    } else {
      return Kefir.constant(
        FieldValue.replaceError(value, {
          kind: ErrorKind.Validation,
          message: 'Cannot finalize FileInput value without a FileManager instance',
        })
      );
    }
  }

  // finalize(value: EmptyValue | AtomicValue, owner: EmptyValue | CompositeValue): Kefir.Property<FieldValue> {
  //   if (value.type === EmptyValue.type) {
  //     return Kefir.constant(value);
  //   }
    
  //   const resourceIri = value.value as Rdf.Iri;
  //   if (!FileManager.isTemporaryResource(resourceIri)) {
  //       console.log("kefir");
  //       return Kefir.constant(value);
  //     } else if (this.fileManager) {
  //         for(let i=0; i<this.resourceIRIs.length; i++){
  //           const resourceIri = this.resourceIRIs[i];
  //           console.log("resource iriiii: "+resourceIri);
  //         console.log("Manikooo "+ resourceIri);
  //         console.log(" i: "+i+" len: "+this.resourceIRIs.length);
  //         console.log(i<this.resourceIRIs.length-1);
  //           console.log("h9iiihi"+JSON.stringify(this.fileManager.getFileResource(resourceIri), null, 2));
  //            this.fileManager
  //             .getFileResource(resourceIri)
  //             .flatMap((resource) => {

  //               console.log("Resourcey: "+JSON.stringify(resource, null, 2));

  //               // return undefined;
  //               return this.fileManager
  //                 .createResourceFromTemporaryFile({
  //                   fileName: resource.fileName,
  //                   storage: this.baseInputProps.storage,
  //                   temporaryStorage: this.baseInputProps.tempStorage,
  //                   generateIriQuery: this.baseInputProps.generateIriQuery,
  //                   resourceQuery: this.baseInputProps.resourceQuery,
  //                   mediaType: resource.mediaType,
  //                 })
  //                 .map((createdResourceIri) => {
  //                    AtomicValue.set(value, { value: createdResourceIri });
  //                 });
  //             })
  //             .toProperty();
  //           }


  //           return this.fileManager
  //             .getFileResource(resourceIri)
  //             .flatMap((resource) => {

  //               console.log("Resourcey: "+JSON.stringify(resource, null, 2));

  //               // return undefined;
  //               return this.fileManager
  //                 .createResourceFromTemporaryFile({
  //                   fileName: resource.fileName,
  //                   storage: this.baseInputProps.storage,
  //                   temporaryStorage: this.baseInputProps.tempStorage,
  //                   generateIriQuery: this.baseInputProps.generateIriQuery,
  //                   resourceQuery: this.baseInputProps.resourceQuery,
  //                   mediaType: resource.mediaType,
  //                 })
  //                 .map((createdResourceIri) => {
  //                   return AtomicValue.set(value, { value: createdResourceIri });
  //                 });
  //             })
  //             .toProperty();
  //     } else {
        
  //       console.log("kefir 2");
  //       return Kefir.constant(
  //         FieldValue.replaceError(value, {
  //           kind: ErrorKind.Validation,
  //           message: 'Cannot finalize MultiFileInput value without a FileManager instance',
  //         })
  //       );
  //     }
    
  // }
}

SingleValueInput.assertStatic(MultiFileInput);

export default MultiFileInput;
