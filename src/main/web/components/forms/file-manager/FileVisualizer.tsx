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

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { FileManager, FileResource } from 'platform/api/services/file-manager';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Spinner } from 'platform/components/ui/spinner';

import * as styles from './FileManager.scss';

const DEFAULT_TITLE = 'Download file';
const IMAGE_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/bmp',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
];

interface FileVisualizerState {
  progress?: number;
  alertState?: AlertConfig;
  resource?: FileResource;
}

interface FileVisualizerProps {
  /** IRI of the file resource to generate a visual representation for. */
  iri: string;
  /** Additional class names for component root element. */
  className?: string;
  /** Additional styles for the wrapping div. */
  style?: React.CSSProperties;
  /** Optional text for the wrapping div title. */
  title?: string;
  /** ID of the storage where the file is stored. */
  storage: string;
  /** Use in case of custom resource definition */
  namePredicateIri?: string;
  mediaTypePredicateIri?: string;
}

/**
 * Visualizer for uploaded files.
 * @example:
 * <mp-file-visualizer
 *  iri='someIri...'
 *  storage='storage-id'
 *  name-predicate-iri='{some-iri}'
 *  media-type-predicate-iri='{some-iri}'>
 * </mp-file-visualizer>
 * where 'iri' is an IRI of a LDP resource created by either the <semantic-form-file-input/> or <mp-file-uploader/>.
 *
 * Requires dedicated ACL permissions to access the REST file upload endpoint.
 */
export class FileVisualizer extends Component<FileVisualizerProps, FileVisualizerState> {
  private readonly cancellation = new Cancellation();

  constructor(props: FileVisualizerProps, context: any) {
    super(props, context);
    this.state = { progress: undefined };
  }

  private getFileManager() {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  componentDidMount() {
    this.fetchResource();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  componentWillReceiveProps(props: FileVisualizerProps) {
    if (props.iri !== this.props.iri) {
      this.fetchResource(props);
    }
  }

  fetchResource(props?: FileVisualizerProps) {
    props = props || this.props;

    if (props.iri) {
      this.cancellation
        .map(
          this.getFileManager().getFileResource(Rdf.iri(props.iri), {
            namePredicateIri: this.props.namePredicateIri,
            mediaTypePredicateIri: this.props.mediaTypePredicateIri,
          })
        )
        .observe({
          value: (resource) => {
            this.setState({ resource });
          },
          error: (error) => {
            this.setState({
              alertState: {
                alert: AlertType.WARNING,
                message: `Failed to fetch resource (${error}).`,
              },
              progress: null,
            });
          },
        });
    }
  }

  render() {
    const resourceIri = this.props.iri;
    const { resource } = this.state;

    let content: JSX.Element;
    if (resource) {
      const isImage = IMAGE_TYPES.indexOf(resource.mediaType) !== -1;
      if (isImage) {
        content = this.renderImageContent(resource);
      } else {
        content = this.renderFileContent(resource);
      }
    } else if (this.state.alertState) {
      content = this.renderError();
    } else if (resourceIri) {
      content = this.renderEmptyContent();
    }

    return (
      <div
        className={`${styles.FileVisualizer} ${this.props.className ? this.props.className : ''}`}
        style={this.props.style}
        title={this.props.title || DEFAULT_TITLE}
      >
        {content}
      </div>
    );
  }

  renderImageContent(resource: FileResource) {
    const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
    return (
      <a className={styles.uploadedImageDepiction} href={fileUrl}>
        <img src={fileUrl} />
      </a>
    );
  }

  renderFileContent(resource: FileResource) {
    const icon = getFileIcon(resource.mediaType);
    const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
    return (
      <a key="resource-iri" href={fileUrl} className={styles.fileIcon}>
        <i className={icon} aria-hidden="true"></i>
      </a>
    );
  }

  renderEmptyContent() {
    return (
      <div className={styles.emptyBody}>
        <Spinner className={styles.spinner} />
      </div>
    );
  }

  renderError() {
    return (
      <div className={styles.emptyBody}>
        Error
        <div className={styles.alertComponent}>
          <Alert {...this.state.alertState}></Alert>
        </div>
      </div>
    );
  }
}
export default FileVisualizer;

export function getFileIcon(mediaType: string): string {
  switch (mediaType) {
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/svg+xml':
    case 'image/tiff':
    case 'image/bmp':
    case 'image/png':
      return 'fa fa-file-image-o';
    case 'application/pdf':
      return 'fa fa-file-pdf-o';
    case 'application/xml':
      return 'fa fa-file-excel-o';
    case 'text/plain':
      return 'fa fa-file-text';
    case 'text/html':
      return 'fa fa-file-text-o';
    case 'video/mpeg':
    case 'video/mp4':
    case 'video/ogg':
    case 'video/quicktime':
    case 'video/webm':
    case 'video/x-ms-wmv':
    case 'video/x-flv':
    case 'video/3gpp':
    case 'video/3gpp2':
      return 'fa fa-film';
    default:
      return 'fa fa-file';
  }
}
