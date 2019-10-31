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
import { FormEvent, CSSProperties } from 'react';
import * as _ from 'lodash';
import { ProgressBar, FormControl, Button, Panel, Checkbox, Tab, Tabs } from 'react-bootstrap';
import * as maybe from 'data.maybe';
import * as moment from 'moment';
import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';
import * as classnames from 'classnames';

import { Component } from 'platform/api/components';
import { Cancellation } from 'platform/api/async';
import { refresh} from 'platform/api/navigation';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';
import {
  getRepositoryInfo, RepositoryType, NeptuneRepositoryType
} from 'platform/api/services/repository';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';
import { ErrorPresenter } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import { RdfUploadExtension } from './extensions';

import './RdfUpload.scss';

interface State {
  messages?: ReadonlyArray<AlertConfig>;
  progress?: Data.Maybe<number>;
  progressText?: Data.Maybe<string>;
  targetGraph?: Data.Maybe<string>;
  keepSourceGraphs?: boolean;
  showOptions?: boolean;
  remoteFileUrl?: string;
  repositoryType?: RepositoryType;
}

export interface Props {
  className?: string;
  style?: CSSProperties;
  contentType?: string;
}

const CLASS_NAME = 'RdfUpload';
const tabClass = `${CLASS_NAME}__tab`;
const noteClass = `${CLASS_NAME}__note`;


/**
 * @example
 * <mp-rdf-upload></mp-rdf-upload>
 */
export class RdfUpload extends Component<Props, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      messages: [],
      progress: maybe.Nothing<number>(),
      progressText: maybe.Nothing<string>(),
      targetGraph: maybe.Nothing<string>(),
      keepSourceGraphs: false,
      showOptions: false,
    };
  }

  componentDidMount() {
    RdfUploadExtension.loadAndUpdate(this, this.cancellation);
    this.cancellation.map(
      getRepositoryInfo('default')
    ).onValue(
      info => this.setState({
        repositoryType: info.type,
      })
    );
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onDrop = (files: ReadonlyArray<File>) => {
    const {repository} = this.context.semanticContext;

    this.setState({
      messages: [],
      progress: maybe.Nothing<number>(),
    });

    const uploads = files.map((file: File, fileNumber: number) => {
      const contentType = _.isEmpty(this.props.contentType)
        ? SparqlUtil.getMimeType(SparqlUtil.getFileEnding(file))
        : this.props.contentType;
      const targetGraph = this.state.targetGraph.isJust
        ? this.state.targetGraph.get()
        : `file://${file.name}-${createTimestamp()}`;

      const upload = RDFGraphStoreService.createGraphFromFile({
        targetGraph: Rdf.iri(encodeURI(targetGraph)),
        keepSourceGraphs: this.state.keepSourceGraphs,
        file,
        contentType,
        onProgress: (percent) => this.setState({
          progress: maybe.Just<number>(((fileNumber / files.length) + (percent / 100)) * 100),
          progressText: maybe.Just<string>(fileNumber + '/' + files.length + ' Files'),
        }),
        repository,
      });

      this.cancellation.map(upload).observe({
        value: () => this.appendUploadMessage('File: ' + file.name + ' uploaded.'),
        error: error => {
          console.error(error);
          this.appendUploadMessage('File: ' + file.name + ' failed.', error);
        },
      });
      return upload;
    });

    this.cancellation.map(Kefir.combine(uploads)).observe({
      value: () => setTimeout(() => refresh(), 2000),
    });
  }

  private appendUploadMessage(message: string, uploadError?: any) {
    this.setState((state: State): State => {
      return {
        messages: [...state.messages, {
          alert: uploadError ? AlertType.WARNING : AlertType.SUCCESS,
          message,
          children: uploadError ? <ErrorPresenter error={uploadError} /> : undefined,
        }]
      };
    });
  }

  private onChangeTargetGraph = (e: FormEvent<ReactBootstrap.FormControl>) => {
    e.stopPropagation();
    e.preventDefault();
    const val = (e.target as any).value.trim();
    if (!_.isEmpty(val)) {
      this.setState({ targetGraph: maybe.Just(val) });
    }
  }

  private onChangeKeepSourceGraphs = (e: FormEvent<ReactBootstrap.FormControl>) => {
    this.setState({ keepSourceGraphs: (e.target as any).checked });
  }

  render() {
    if (RdfUploadExtension.isLoading()) {
      return <Spinner />;
    }
    const {className, style} = this.props;

    const messages = this.state.messages.map((config, index) => <Alert key={index} {...config} />);
    const progressBar = this.state.progress.map(progress => (
      <ProgressBar active min={0} max={100}
        now={progress} label={this.state.progressText.getOrElse('Uploading Files')}
      />
    )).getOrElse(null);

    const isInProcess = Boolean(this.state.progress.getOrElse(0));

    return (
      <div className={classnames(CLASS_NAME, className)} style={style}>
        <a onClick={() => this.setState({showOptions: !this.state.showOptions})}>
          Advanced Options
        </a>
        {this.renderAdvancedOptions()}
        <Tabs id='rdf-upload-tabs' unmountOnExit={true}>
          {this.renderTabExtensions()}
          <Tab eventKey={1} className={tabClass} title='File Upload' disabled={isInProcess}>
            {progressBar}
            <div className={noteClass}>
              RDF files can be uploaded using the drag&amp;drop field below.
              Clicking into the field will open the browser's default file selector.
            </div>
            <Dropzone onDrop={this.onDrop}>
              <div className={`${CLASS_NAME}__rdf-dropzone-content`}>
                Please drag&amp;drop your RDF file(s) here.
              </div>
            </Dropzone>
            {messages}
          </Tab>
          {/* load by URL doesn't make any sense for Neptune repository */}
          {this.state.repositoryType !== NeptuneRepositoryType ?
            <Tab eventKey={2} className={tabClass} title='Load by HTTP/FTP/File URL'
                disabled={isInProcess}>
              {progressBar}
              <div className={noteClass}>
                Please note: Loading via HTTP/FTP/File URL depends on the database backend
                i.e. it must support the SPARQL LOAD command and must allow outgoing
                network connections to the publicly accessible HTTP/FTP URLs or must have
                access to the File URL respectively.
              </div>
              <FormControl type='text' value={this.state.remoteFileUrl || ''}
                placeholder='Please enter publicly accessible HTTP/FTP URL'
                onChange={e => this.setState({
                  remoteFileUrl: (e.currentTarget as any as HTMLInputElement).value,
                })}
              />
              <Button bsStyle='primary' className={`${CLASS_NAME}__load-button`}
                disabled={!this.state.remoteFileUrl || isInProcess}
                onClick={this.onClickLoadByUrl}>
                Load by URL
              </Button>
              {messages}
            </Tab> : null
            }
        </Tabs>
      </div>
    );
  }

  private renderTabExtensions() {
    const tabs = RdfUploadExtension.get();
    if (!tabs) {
      return null;
    }
    const tabKeys = Object.keys(tabs);
    tabKeys.sort();

    const {repositoryType, targetGraph} = this.state;
    return tabKeys.map((tabKey, index) => {
      const tab = tabs[tabKey]({repositoryType, targetGraph});
      if (tab) {
        return (
          <Tab eventKey={3 + index} className={tabClass} title={tab.title}>
            {tab.content}
          </Tab>
        );
      } else {
        return null;
      }
    });
  }

  private renderAdvancedOptions() {
    return (
      <Panel className='' collapsible expanded={this.state.showOptions}>
        <FormControl type='text' label='Target NamedGraph'
          placeholder='URI of the target NamedGraph. Will be generated automatically if empty.'
          onChange={this.onChangeTargetGraph}
        />
        <Checkbox label='Keep source NamedGraphs'
          onChange={this.onChangeKeepSourceGraphs}>
          Keep source NamedGraphs
        </Checkbox>
      </Panel>
    );
  }

  private onClickLoadByUrl = () => {
    this.setState({
      messages: [],
      progress: maybe.Nothing<number>(),
    });

    const {remoteFileUrl, targetGraph} = this.state;
    let updateQuery: SparqlJs.Update;
    try {
      updateQuery = makeLoadQuery(remoteFileUrl, targetGraph);
    } catch (error) {
      const message = targetGraph.isJust
        ? 'Error constructing update query (probably invalid file or named graph URL?)'
        : 'Error constructing update query (probably invalid file URL?)';
      this.appendUploadMessage(message, error);
      return;
    }

    this.setState({
      progress: maybe.Just<number>(100),
      progressText: maybe.Just<string>('Database is processing the LOAD command'),
    });

    const {semanticContext} = this.context;
    this.cancellation.map(
      SparqlClient.executeSparqlUpdate(updateQuery, {context: semanticContext})
    ).observe({
      value: () => {
        this.appendUploadMessage('File from URL successfully loaded.');
        setTimeout(() => refresh() , 2000);
      },
      error: error => {
        console.error(error);
        this.appendUploadMessage('Failed to load file from URL.', error);
      },
      end: () => {
        this.setState({
          progress: maybe.Nothing<number>(),
          progressText: maybe.Nothing<string>(),
        });
      },
    });
  }
}

function makeLoadQuery(remoteFileUrl: string, targetGraph: Data.Maybe<string>): SparqlJs.Update {
  const targetGraphIri = targetGraph.isJust
    ? targetGraph.get()
    : `${remoteFileUrl}-${createTimestamp()}`;

  const query = `LOAD <${encodeURI(remoteFileUrl)}> INTO GRAPH <${encodeURI(targetGraphIri)}>`;
  const parsedUpdate = SparqlUtil.parseQuery(query);
  if (parsedUpdate.type !== 'update') {
    throw new Error('Query must be an update operation');
  }

  return parsedUpdate;
}

function createTimestamp(): string {
  return moment().format('DD-MM-YYYY-hh-mm-ss');
}

export default RdfUpload;
