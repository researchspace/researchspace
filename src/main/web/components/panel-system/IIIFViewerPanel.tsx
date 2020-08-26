/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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
import { isEqual, flatten } from 'lodash';
import * as Kefir from 'kefir';

import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { ImageRegionEditorComponentMirador, ImageRegionEditorConfig } from 'platform/components/iiif/ImageRegionEditor';
import { AddImagesForObjectEvent, AddObjectImagesEvent, IiifManifestObject } from '../iiif/ImageRegionEditorEvents';


const BINDING_VARIABLE = 'subject';

export interface IIIFViewerPanelProps extends ImageRegionEditorConfig {
  /**
   * SPARQL SELECT query string that is used for fetching images of an entity.
   * Entities IRIs will be injected into the query using the "?subject" binding variable.
   * The query must expose the "?image" query variable.
   */
  query: string;
  /**
   * Entities IRIs
   */
  iris: Array<string>;
}

export interface State {
  imageOrRegion?:  IiifManifestObject[];
}

/**
 * @example
 * <rs-iiif-viewer-panel-system [[> rsp:IIIFConfig]]
 *    query="SELECT ?image WHERE { ?subject crm:P138i_has_representation ?image }">
 * </rs-iiif-viewer-panel-system>
 */
export class IIIFViewerPanel extends Component<IIIFViewerPanelProps, State> {
  private readonly cancellation = new Cancellation();
  private queryingCancellation = this.cancellation.derive();

  constructor(props: IIIFViewerPanelProps, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.queryImages();
    this.listenToEvents();
  }

  componentDidUpdate(prevProps: IIIFViewerPanelProps) {
    if (!isEqual(this.props, prevProps)) {
      this.queryImages();
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private listenToEvents = () => {
    this.cancellation
        .map(
          listen({
            eventType: AddImagesForObjectEvent,
            target: this.props.id
          })
        ).observe({
          value: (event) => {
            const { query } = this.props;
            const parsedQuery = SparqlUtil.parseQuery(query);
            const sparql = SparqlClient.setBindings(parsedQuery, { [BINDING_VARIABLE]: Rdf.iri(event.data.objectIri) });
            SparqlClient.select(sparql)
                        .map(({ results }) => ({
                          iri: event.data.objectIri,
                          images: results.bindings.map(({ image }) => image.value),
                        }))
                        .onValue(
                          images => {
                            trigger({
                              eventType: AddObjectImagesEvent,
                              source: this.props.id,
                              targets: [this.props.id],
                              data: {
                                objectIri: event.data.objectIri,
                                imageIris: images.images
                              }
                            });
                          }
                        );
          }
        })
  }

  private queryImages() {
    const { semanticContext } = this.context;
    const { query, iris, repositories = [semanticContext.repository] } = this.props;

    const parsedQuery = SparqlUtil.parseQuery(query);
    const querying = iris.map((iri) => {
      const sparql = SparqlClient.setBindings(parsedQuery, { [BINDING_VARIABLE]: Rdf.iri(iri) });
      const requests = repositories.map((repository) =>
        SparqlClient.select(sparql, { context: { repository } }).map(({ results }) => ({
          iri,
          images: results.bindings.map(({ image }) => image.value),
        }))
      );
      return Kefir.zip(requests);
    });
    this.queryingCancellation = this.cancellation.deriveAndCancel(this.queryingCancellation);
    this.queryingCancellation.map(Kefir.combine(querying)).onValue((result) => {
      const imageOrRegion: IiifManifestObject[] = [];
      flatten(result).forEach(({ iri, images }) => {
        imageOrRegion.push({ objectIri: iri, images});
      });
      this.setState({ imageOrRegion });
    });
  }

  render() {
    const { imageOrRegion } = this.state;
    if (!imageOrRegion) {
      return null;
    }
    return <ImageRegionEditorComponentMirador {...this.props} imageOrRegion={imageOrRegion} />;
  }
}

export default IIIFViewerPanel;
