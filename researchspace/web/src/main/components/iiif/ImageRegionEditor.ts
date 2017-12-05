/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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
import { PropTypes } from 'react';
import { isEqual } from 'lodash';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Component } from 'platform/api/components';

import * as ImageApi from '../../data/iiif/ImageAPI';
import {
  queryIIIFImageOrRegion, ImageOrRegionInfo,
} from '../../data/iiif/ImageAnnotationService';
import { Manifest, createManifest } from '../../data/iiif/ManifestBuilder';
import { LdpAnnotationEndpoint } from '../../data/iiif/AnnotationEndpoint';

import { renderMirador, removeMirador, scrollToRegions } from './mirador/Mirador';

const D = React.DOM;

interface ImageRegionEditorProps {
  imageOrRegion: string;
  imageIdPattern: string;
  iiifServerUrl: string;
  repositories?: Array<string>;
}

interface ImageRegionEditorState {
  readonly loading?: boolean;
  readonly info?: ImageOrRegionInfo;
  readonly iiifImageId?: string;
  readonly errorMessage?: string;
}

/**
 * @example
 * <div style='height: 700px'>
 *   <rs-iiif-mirador image-or-region='http://example.com/AN00230/AN00230725_001_l.jpg'
 *     image-id-pattern='BIND(REPLACE(str(?imageIRI),
 *       "^.+/[A-Z0]*([1-9][0-9]*)_.*$", "$1") AS ?imageID)'
 *     iiif-server-url='http://example.com/IIIF'>
 *   </rs-iiif-mirador>
 * </div>
 */
export class ImageRegionEditorComponentMirador
  extends Component<ImageRegionEditorProps, ImageRegionEditorState> {

  static readonly propTypes: { [K in keyof ImageRegionEditorProps]?: any } = {
    imageOrRegion: PropTypes.string.isRequired,
    imageIdPattern: PropTypes.string.isRequired,
    iiifServerUrl: PropTypes.string.isRequired,
  };

  private miradorElement: HTMLElement;
    private miradorInstance: Mirador.Instance;

  constructor(props: ImageRegionEditorProps, context: any) {
    super(props, context);
    this.state = {loading: true};
  }

  componentDidMount() {
    const {imageOrRegion, imageIdPattern } = this.props;
    const imageOrRegionIri = Rdf.iri(imageOrRegion);
    queryIIIFImageOrRegion(
      imageOrRegionIri, imageIdPattern, this.getRepositories()
    ).onValue(imageInfo => {
      this.setState({loading: false, iiifImageId: imageInfo.imageId, info: imageInfo});
    }).onError(error => {
      this.setState({loading: false, errorMessage: error});
    });
  }

  public shouldComponentUpdate(
    nextProps: ImageRegionEditorProps, nextState: ImageRegionEditorState
  ) {
    return nextState.loading !== this.state.loading || !isEqual(nextProps, this.props);
  }

  private renderMirador(element: HTMLElement) {
    if (!this.state || !this.state.info || !element) { return; }

    removeMirador(this.miradorInstance, element);

    const {imageOrRegion} = this.props;
    const imageOrRegionIri = Rdf.iri(imageOrRegion);
    const imageInfo = this.state.info;

    const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
    const imageServiceURI = ImageApi.constructServiceRequestUri(
      iiifServerUrl, this.state.iiifImageId);

    ImageApi.queryImageBounds(iiifServerUrl, this.state.iiifImageId)
      .mapErrors<{ width: number; height: number; }>(error => {
        console.warn(`Failed to fetch bounds of image: ${imageOrRegion}`);
        return undefined;
      }).flatMap(bounds => createManifest({
        baseIri: imageInfo.imageIRI,
        imageIri: imageInfo.imageIRI,
        imageServiceUri: imageServiceURI,
        canvasSize: bounds,
      }, this.getRepositories())).onValue(manifest => {
        const miradorConfig = this.miradorConfigFromManifest(manifest, imageOrRegionIri, imageInfo);
        this.miradorInstance = renderMirador({
          targetElement: element,
          miradorConfig,
          onInitialized: mirador => {
            if (this.state.info && this.state.info.isRegion) {
              const viewport = this.state.info.viewport;
              scrollToRegions(mirador, () => viewport);
            }
          },
        });
      });
  }

  private getRepositories = () =>
    Maybe.fromNullable(this.props.repositories).orElse(
      () => Maybe.fromNullable(this.context.semanticContext).chain(
        c => Maybe.fromNullable([c.repository])
      )
    ).getOrElse(['default']);

  private miradorConfigFromManifest(
    manifest: Manifest,
    imageOrRegion: Rdf.Iri,
    imageInfo: ImageOrRegionInfo
  ): Mirador.Options {
    return {
      id: 'mirador', // The CSS ID selector for the containing element.
      layout: '1x1', // The number and arrangement of windows ("row"x"column")?
      saveSession: false,
      data: [{
        manifestUri: imageInfo.imageIRI.value,
        location: 'British Museum',
        manifestContent: manifest,
      }],
      annotationEndpoint: {
        name: 'Metaphactory annotation endpoint',
        module: 'AdapterAnnotationEndpoint',
        options: {
          endpoint: new LdpAnnotationEndpoint({
            displayedRegion: imageInfo.isRegion ? imageOrRegion : undefined,
          }),
        },
      },
      availableAnnotationDrawingTools: [
        'Rectangle', 'Ellipse', 'Freehand', 'Polygon', 'Pin',
      ],
      windowObjects: [{
        loadedManifest: imageInfo.imageIRI.value + '/manifest.json',
        viewType: 'ImageView',
        sidePanel: false,
        canvasControls: {
          annotations: {
            annotationState: 'on',
            annotationRefresh: true,
          },
        },
      }],
      annotationBodyEditor: {
        module: 'MetaphactoryAnnotationBodyEditor',
        options: {},
      },
      jsonStorageEndpoint: {
        name: 'Dummy JSON Storage',
        module: 'DummyJSONStorage',
        options: {},
      },
    };
  }

  componentWillUnmount() {
    removeMirador(this.miradorInstance, this.miradorElement);
  }

  render() {
    const {errorMessage} = this.state;
    return D.div({style: {position: 'relative', width: '100%', height: '100%'}},
      errorMessage
        ? React.createElement(ErrorNotification, {errorMessage})
        : D.div({
          ref: element => {
            this.miradorElement = element;
            this.renderMirador(element);
          },
          id: 'mirador',
          className: 'mirador',
          style: {width: '100%', height: '100%', position: 'relative'},
        })
    );
  }
}

export type c = ImageRegionEditorComponentMirador;
export const c = ImageRegionEditorComponentMirador;
export const f = React.createFactory(c);
export default c;
