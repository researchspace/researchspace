/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
import { isEqual, flatten } from 'lodash';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import {
  ImageRegionEditorComponentMirador, ImageRegionEditorProps,
} from 'researchspace/components/iiif/ImageRegionEditor';

const BINDING_VARIABLE = 'subject';

export interface Props extends ImageRegionEditorProps {
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
  imageOrRegion?: { [iri: string]: Array<string> };
}

/**
 * @example
 * <rs-iiif-viewer-panel-system [[> rsp:IIIFConfig]]
 *    query="SELECT ?image WHERE { ?subject crm:P138i_has_representation ?image }">
 * </rs-iiif-viewer-panel-system>
 */
export class IIIFViewerPanel extends Component<Props, State> {
  private readonly cancellation = new Cancellation();
  private queryingCancellation = this.cancellation.derive();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.queryImages();
  }

  componentDidUpdate(prevProps: Props) {
    if (!isEqual(this.props, prevProps)) {
      this.queryImages();
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private queryImages() {
    const {semanticContext} = this.context;
    const {query, iris, repositories = [semanticContext.repository]} = this.props;

    const parsedQuery = SparqlUtil.parseQuery(query);
    const querying = iris.map(iri => {
      const sparql = SparqlClient.setBindings(parsedQuery, {[BINDING_VARIABLE]: Rdf.iri(iri)});
      const requests = repositories.map(repository =>
        SparqlClient.select(sparql, {context: {repository}}).map(
          ({results}) => ({iri, images: results.bindings.map(({image}) => image.value)})
        )
      );
      return Kefir.zip(requests);
    });
    this.queryingCancellation = this.cancellation.deriveAndCancel(this.queryingCancellation);
    this.queryingCancellation.map(
      Kefir.combine(querying)
    ).onValue(result => {
      const imageOrRegion: { [iri: string]: Array<string> } = {};
      flatten(result).forEach(({iri, images}) => {
        if (!(imageOrRegion[iri] && imageOrRegion[iri].length)) {
          imageOrRegion[iri] = images;
        }
      });
      this.setState({imageOrRegion});
    });
  }

  render() {
    const {imageOrRegion} = this.state;
    if (!imageOrRegion) { return null; }
    return <ImageRegionEditorComponentMirador {...this.props} imageOrRegion={imageOrRegion} />;
  }
}

export default IIIFViewerPanel;
