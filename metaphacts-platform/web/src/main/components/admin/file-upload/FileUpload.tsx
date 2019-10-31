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

import * as React from 'react';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';
import { ProgressBar } from 'react-bootstrap';

import { navigateToResource, refresh } from 'platform/api/navigation';
import { Rdf } from 'platform/api/rdf';
import { FileUploadService } from 'platform/api/services/file-upload';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';

interface FileUploadState {
  alertState?: Data.Maybe<AlertConfig>
  progress?: Data.Maybe<number>
  progressText?: Data.Maybe<string>
  resourceUri?: Data.Maybe<string>
  showOptions?: boolean
}

interface FileUploadProps {

  /**
   * SPARQL construct query which is used to generate the data that should be associated with
   * uploaded file.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __sequence - unique numerical value
   * * __contextUri__ - see `contextUri` property
   * * __newId__ - IRI generated with `generateIdQuery`
   */
  createResourceQuery: string

  /**
   * SPARQL select query which is used to generate unique IRI for the uploaded file.
   * The query should have only one projection variable *newId* with the IRI.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __sequence__ - unique numerical value
   * * __contextUri__ - see `contextUri` property
   */
  generateIdQuery: string

  /**
   * File storage id. Used to detect upload folder based on "upload-<storage>"
   * property value from the environment.prop file.
   */
  storage: string

  /**
   * File metadata extractor
   */
  metadataExtractor?: string

  /**
   * Context variable that will be propagated to `createResourceQuery` and `generateIdQuery`.
   */
  contextUri: string

  /**
   * dropzone caption
   */
  description: string

  /**
   * MIME content type of the file
   */
  contentType: string

  /**
   * Optional post-action to be performed after uploading the file.
   * Can be either "reload" or "redirect" (redirects to the newly created resource)
   * or any IRI string to which the form will redirect.
   */
  postAction?: string;
}

/**
 * In the following example `iiifFolder` storage corresponds to `upload-iiifFolder=file:///somefolder` parameter set in the `environment.prop` file.
 *
 * @example
 * <mp-file-upload
 *   create-resource-query='
 *     prefix dc: <http://purl.org/dc/elements/1.1/>
 *     CONSTRUCT {
 *       ?__newId__ a SomeImageType.
 *       ?__newId__ dc:MediaType "image/jpeg".
 *     } WHERE {}
 * '
 *   generate-id-query='SELECT ?newId WHERE {BIND(URI(CONCAT(CONCAT(STR(?__contextUri__), "/"), ?__sequence__)) as ?newId)}'
 *   context-uri='[[this]]'
 *   storage='iiifFolder'
 *   post-action='redirect'
 * ></mp-file-upload>
 */
export class FileUpload extends React.Component<FileUploadProps, FileUploadState> {
  messages: Kefir.Pool<string>;
  constructor(props: FileUploadProps, context: any) {
    super(props, context);
    this.state = {
      alertState: maybe.Nothing<AlertConfig>(),
      progress: maybe.Nothing<number>(),
      progressText: maybe.Nothing<string>(),
      showOptions: false,
    };
  }

  componentDidMount() {
    this.messages = Kefir.pool<string>();
    this.messages.onValue(v => {
      const message = this.state.alertState.isJust ? this.state.alertState.get().message : '';
      this.setState({
        alertState: maybe.Just({
          alert: AlertType.WARNING,
          message: message + v,
        }),
      });
    });
  }

  onDrop(files: File[]) {
    this.setState({
      alertState: maybe.Nothing<AlertConfig>(),
      progress: maybe.Nothing<number>(),
    });
    const file = files[0];
    const contentType = _.isEmpty(this.props) || _.isEmpty(this.props.contentType)
      ? FileUploadService.getMimeType(file)
      : this.props.contentType;

    const upload = FileUploadService.uploadFile({
      createResourceQuery: this.props.createResourceQuery,
      generateIdQuery: this.props.generateIdQuery,
      storage: this.props.storage,
      metadataExtractor: this.props.metadataExtractor,
      contextUri: this.props.contextUri,
      file: file,
      contentType: contentType,
      onProgress: percent => this.setState({
        progress: maybe.Just<number>(percent),
        progressText: maybe.Just<string>('Uploading ...'),
      }),
    });
    upload.onValue(this.performPostAction).onError(
      error =>
        this.messages.plug(
          Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>')
        )
    );
  }

  render() {
    const description = _.isEmpty(this.props) || _.isEmpty(this.props.description)
      ? 'Please drag&drop your image file(s) here.'
      : this.props.description;

    return (
      <div style={{width: '50%'}}>
        {this.state.alertState.map(value => <Alert {...value} />).getOrElse(null)}
        {this.state.progress.map(progress =>
          <ProgressBar
            active={true} min={0} max={100} now={progress}
            label={this.state.progressText.getOrElse('Uploading Files')}
          />
        ).getOrElse(null)}
        <Dropzone onDrop={this.onDrop.bind(this)}>
          <div className='text-center'>{description}</div>
        </Dropzone>
      </div>
    );
  }

  private performPostAction = (newFileIri: Rdf.Iri) => {
    if (!this.props.postAction || this.props.postAction === 'reload') {
      refresh();
    } else if (this.props.postAction === 'redirect') {
      navigateToResource(newFileIri).onValue(v => v);
    } else {
      navigateToResource(Rdf.iri(this.props.postAction)).onValue(v => v);
    }
  }

}
export default FileUpload;
