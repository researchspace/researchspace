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

import {
  DOM as D, createFactory, createElement, Component, FormEvent,
} from 'react';
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';
import * as moment from 'moment';
import * as Kefir from 'kefir';
import * as ReactDropzone from 'react-dropzone';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';
import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';

const Dropzone = createFactory(ReactDropzone);
const ProgressBar = createFactory(ReactBootstrap.ProgressBar);
const Input = createFactory(ReactBootstrap.FormControl);
const Panel = createFactory(ReactBootstrap.Panel);
const Checkbox = createFactory(ReactBootstrap.Checkbox);

interface State {
  alertState?: Data.Maybe<AlertConfig>
  progress?: Data.Maybe<number>
  progressText?: Data.Maybe<string>
  targetGraph?: Data.Maybe<string>
  keepSourceGraphs?: boolean
  showOptions?: boolean
}

export interface Props {
  config: {
    description: string
    method: string
    contentType: string
  }
}

export class RdfUpload extends Component<Props, State> {
  messages: Kefir.Pool<string>;
  constructor() {
    super();
    this.state = {
      alertState: maybe.Nothing<AlertConfig>(),
      progress: maybe.Nothing<number>(),
      progressText: maybe.Nothing<string>(),
      targetGraph: maybe.Nothing<string>(),
      keepSourceGraphs: false,
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
    let fileNumber = 0;
    const uploads = files.map((file: File) => {
      fileNumber++;
      const contentType = _.isEmpty(this.props.config) || _.isEmpty(this.props.config.contentType)
        ? SparqlUtil.getMimeType(SparqlUtil.getFileEnding(file))
        : this.props.config.contentType;
      const targetGraph = this.state.targetGraph.isJust
        ? this.state.targetGraph.get()
        : 'file://' + file.name + '-' + moment().format('DD-MM-YYYY-hh-mm-ss');


      const upload = RDFGraphStoreService.createGraphFromFile(
        Rdf.iri(targetGraph), this.state.keepSourceGraphs, file,
        contentType,
        (percent) => this.setState({
          progress: maybe.Just<number>(((fileNumber / files.length) + (percent / 100)) * 100),
          progressText: maybe.Just<string>(fileNumber + '/' + files.length + ' Files'),
        })
      );

      upload.onValue(() =>
        this.messages.plug(Kefir.constant('File: ' + file.name + ' uploaded.<br/>'))
      ).onError((error) =>
        this.messages.plug(Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>'))
        );
      return upload;

    }); // end forEach
    // TODO
    Kefir.combine(uploads).onValue(() => window.location.reload());
  }

  onChangeTargetGraph = (e: FormEvent<ReactBootstrap.FormControl>) => {
    e.stopPropagation();
    e.preventDefault();
    const val = (e.target as any).value.trim();
    if (!_.isEmpty(val)) {
      this.setState({ targetGraph: maybe.Just(val) });
    }
  }

  onChangeKeepSourceGraphs = (e: FormEvent<ReactBootstrap.FormControl>) => {
    this.setState({ keepSourceGraphs: (e.target as any).checked });
  }

  render() {
    const description = _.isEmpty(this.props.config) || _.isEmpty(this.props.config.description)
      ? 'Please drag&drop your RDF file(s) here.'
      : this.props.config.description;

    return D.div(
      { style: { width: '50%' } },
      D.a(
        { onClick: () => this.setState({ showOptions: !this.state.showOptions }) },
        'Advanced Options'
      ),
      Panel(
        { className: '', collapsible: true, expanded: this.state.showOptions },
        Input(
          {
            type: 'text',
            label: 'Target NamedGraph',
            placeholder: 'URI of the target NamedGraph. Will be generated automatically if empty.',
            onChange: this.onChangeTargetGraph,
          }
        ),
        Checkbox(
          {
            label: 'Keep source NamedGraphs',
            onChange: this.onChangeKeepSourceGraphs,
          },
          'Keep source NamedGraphs'
        )
      ),
      this.state.alertState.map(value => createElement(Alert, value)).getOrElse(null),
      this.state.progress.map(
        progress => ProgressBar({
          active: true, min: 0, max: 100,
          now: progress, label: this.state.progressText.getOrElse('Uploading Files'),
        })
      ).getOrElse(null),
      Dropzone({ onDrop: this.onDrop.bind(this) }, D.div({ className: 'text-center' }, description))
    );
  }

}

export default RdfUpload;
