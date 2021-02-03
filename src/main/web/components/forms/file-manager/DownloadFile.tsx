/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { LoadingBackdrop } from 'platform/components/utils/LoadingBackdrop';
import { FileManager } from 'platform/api/services/file-manager';


export interface DownloadFileConfig {
  iri: string;
  storage: string;
  namePredicateIri?: string;
  mediaTypePredicateIri?: string;
}
type DownloadFileProps = DownloadFileConfig & React.Props<DownloadFile>;

interface DownloadFileState {
  isLoading: boolean;
}

/**
 * Download the file from storage.
 *
 * <rs-file-download iri='file resource iri' storage='storage id'></rs-file-download>
 */
export class DownloadFile extends Component<DownloadFileProps, DownloadFileState> {

  constructor(props: DownloadFileProps, context: any) {
    super(props, context);
    this.state = {
      isLoading: false,
    };
  }

  render() {
    if (this.state.isLoading) {
      return <LoadingBackdrop />;
    }

    const child = React.Children.only(this.props.children) as React.ReactElement<any>;
    const props = {
      onClick: this.download,
    };
    return React.cloneElement(child, props);
  }

  private download = () => {
    this.setState({isLoading: true,});

    const { repository } = this.context.semanticContext;
    const { iri, storage, namePredicateIri, mediaTypePredicateIri } = this.props;
    const fileManager = new FileManager({ repository });
    this.cancel
        .map(
          fileManager.getFileResource(Rdf.iri(iri), { namePredicateIri, mediaTypePredicateIri })
        )
        .observe({
          value: (resource) => {
            const file = FileManager.getFileUrl(resource.fileName, storage);
            window.open(file);
            this.setState({isLoading: false});
          }
        });
  }
}

export default DownloadFile;
