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
import * as Kefir from 'kefir';
import { Dropzone } from 'platform/components/ui/dropzone';
import { RestartWrapper } from 'platform/components/admin/RestartWrapper';
import { Button } from 'react-bootstrap';
import * as request from 'platform/api/http';
import { Component } from 'platform/api/components';
import { Cancellation, requestAsProperty } from 'platform/api/async';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { ErrorPresenter } from 'platform/components/ui/notification';

interface State {
  messages?: ReadonlyArray<AlertConfig>;
}

export class AppUpload extends Component<{}, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {
      messages: [],
    };
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private uploadFile = (file: File): Kefir.Property<string> => {
    const req = request.post('/rest/admin/apps/upload-and-install').attach('file', file as any);

    req.send(file as any);
    return requestAsProperty(req).map((res) => res.text);
  };

  private onDrop = (files: ReadonlyArray<File>) => {
    this.setState({
      messages: [],
    });

    files.map((file: File, fileNumber: number) => {
      const upload = this.uploadFile(file);

      this.cancellation.map(upload).observe({
        value: (value) => this.appendUploadMessage(value),
        error: (error) => {
          this.appendUploadMessage('File: ' + file.name + ' failed.', error);
        },
      });
      return upload;
    });
  };

  private appendUploadMessage(message: string, uploadError?: any) {
    const RestartButton = (
      <RestartWrapper>
        <Button bsStyle="primary">Restart Now</Button>
      </RestartWrapper>
    );
    this.setState(
      (state: State): State => {
        return {
          messages: [
            ...state.messages,
            {
              alert: uploadError ? AlertType.WARNING : AlertType.SUCCESS,
              message,
              children: uploadError ? <ErrorPresenter error={uploadError} /> : RestartButton,
            },
          ],
        };
      }
    );
  }

  render() {
    const messages = this.state.messages.map((config, index) => <Alert key={index} {...config} />);
    return (
      <div className={'text-center'}>
        <Dropzone multiple={false} onDrop={this.onDrop} style={{ margin: 'auto' }}>
          <span>
            Please drag&amp;drop your app zip file here OR click into the field to open the browser's standard file
            selector.
          </span>
        </Dropzone>
        {messages}
      </div>
    );
  }
}

export default AppUpload;
