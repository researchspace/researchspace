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
import { listen, trigger } from 'platform/api/events';
import { Component } from 'platform/api/components';
import { FileManager } from 'platform/api/services/file-manager';

import * as FileEvents from './FileEvents';

export interface RemoveFileConfig {
  id: string
  iri: string;
  storage: string;

  namePredicateIri?: string;
  mediaTypePredicateIri?: string;
}
type RemoveFileProps = RemoveFileConfig & React.Props<RemoveFile>;

/**
 * Remove the file with associated resource from storage.
 *
 * <rs-file-remove id='id for events' iri='file resource iri' storage='file storage id'></rs-file-remove>
 */
export class RemoveFile extends Component<RemoveFileConfig, void> {
  constructor(props: RemoveFileProps, context: any) {
    super(props, context);
  }

  componentDidMount() {
    this.cancel
        .map(
          listen({
            target: this.props.id,
            eventType: FileEvents.FileRemove,
          })
        ).observe({
          value: (event) => {
            if (event.data.iri === this.props.iri) {
              this.remove();
            }
          }
        });
  }

  render() {
    if (React.Children.count(this.props.children) === 1) {
      const child = React.Children.only(this.props.children) as React.ReactElement<any>;
      const props = {
        onClick: this.remove,
      };
      return React.cloneElement(child, props);
    } else {
      return null;
    }
  }

  private remove = () => {
    const { repository } = this.context.semanticContext;
    const { iri, storage, namePredicateIri, mediaTypePredicateIri } = this.props;
    const fileManager = new FileManager({ repository });
    this.cancel
        .map(
          fileManager.deleteFileResource(Rdf.iri(iri), storage, { namePredicateIri, mediaTypePredicateIri })
        )
        .observe({
          value: () => {
            trigger({
              source: this.props.id,
              eventType: FileEvents.FileRemoved,
              data: { iri },
            });
          }
        });

  }
}
export default RemoveFile;
