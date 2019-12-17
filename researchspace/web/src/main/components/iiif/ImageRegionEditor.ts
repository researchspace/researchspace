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
import * as D from 'react-dom-factories';
import * as PropTypes from 'prop-types';
import { isEqual, values, toPairs } from 'lodash';
import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { addNotification, ErrorNotification } from 'platform/components/ui/notification';
import { Component } from 'platform/api/components';
import { ResourceLinkComponent } from 'platform/api/navigation/components';

import * as ImageApi from '../../data/iiif/ImageAPI';
import {
  queryIIIFImageOrRegion, ImageOrRegionInfo,
} from '../../data/iiif/ImageAnnotationService';
import { Manifest, createManifest } from '../../data/iiif/ManifestBuilder';
import {
  LdpAnnotationEndpoint, AnnotationEndpoint, ImagesInfoByIri,
} from '../../data/iiif/AnnotationEndpoint';

import { chooseMiradorLayout } from './SideBySideComparison';

import { renderMirador, removeMirador, scrollToRegions } from './mirador/Mirador';

export interface ImageRegionEditorConfig {
  id?: string;
  imageOrRegion: string | { [iri: string]: Array<string> };
  imageIdPattern: string;
  iiifServerUrl: string;
  repositories?: Array<string>;
}

export interface ImageRegionEditorProps extends ImageRegionEditorConfig {
  annotationEndpoint?: AnnotationEndpoint;
  onMiradorInitialized?: (miradorInstance: Mirador.Instance) => void;
}

interface ImageRegionEditorState {
  readonly loading?: boolean;
  readonly info?: ReadonlyMap<string, ImageOrRegionInfo>;
  readonly iiifImageId?: ReadonlyMap<string, string>;
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
  static defaultProps: Partial<ImageRegionEditorProps> = {
    id: 'mirador',
  };

  private readonly cancellation = new Cancellation();
  private infoQueryingCancellation = this.cancellation.derive();
  private manifestQueryingCancellation = this.cancellation.derive();

  static readonly propTypes: { [K in keyof ImageRegionEditorProps]?: any } = {
    imageOrRegion: PropTypes.any.isRequired,
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
    this.queryImagesInfo();
  }

  public shouldComponentUpdate(
    nextProps: ImageRegionEditorProps, nextState: ImageRegionEditorState
  ) {
    return nextState.loading !== this.state.loading || !isEqual(nextProps, this.props);
  }

  private queryImagesInfo() {
    const {imageIdPattern} = this.props;

    const allImages = this.getImages();
    const querying = values(allImages).map(images => {
      if (!images.length) { return Kefir.constant([]); }
      const infoQuerying = images.map(Rdf.iri).map(imageOrRegionIri =>
        queryIIIFImageOrRegion(imageOrRegionIri, imageIdPattern, this.getRepositories())
          .flatMapErrors<ImageOrRegionInfo>(() =>
            Kefir.constant(undefined)
          )
      );
      return Kefir.combine(infoQuerying);
    });

    this.infoQueryingCancellation = this.cancellation.deriveAndCancel(
      this.infoQueryingCancellation
    );
    this.infoQueryingCancellation.map(
      Kefir.combine(querying)
    ).observe({
      value: result => {
        const info = new Map<string, ImageOrRegionInfo>();
        const iiifImageId = new Map<string, string>();
        result.forEach(imagesInfo =>
          imagesInfo.forEach(imageInfo => {
            if (!imageInfo) { return; }
            info.set(imageInfo.iri.value, imageInfo);
            iiifImageId.set(imageInfo.iri.value, imageInfo.imageId);
          })
        );
        this.setState({loading: false, iiifImageId, info});
      },
      error: error => this.setState({loading: false, errorMessage: error}),
    });
  }

  private renderMirador(element: HTMLElement) {
    if (!this.state || !this.state.info || !element) { return; }

    removeMirador(this.miradorInstance, element);

    const allImages = this.getImages();
    const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);

    const manifestQuerying = toPairs(allImages).map(([iri, images]) =>
      this.queryManifestParameters({iri, images, iiifServerUrl}).flatMap(allParams => {
        const params = allParams.filter(param => param !== undefined);
        if (params.length === 0) {
          addNotification({
            level: 'error',
            children: React.createElement('p', {},
              'Images of the entity ',
              React.createElement(ResourceLinkComponent, {iri}),
              ' not found'
            ),
          });
          return Kefir.constant(undefined);
        }
        if (params.length < allParams.length) {
          addNotification({
            level: 'warning',
            children: React.createElement('p', {},
              'Some images of the entity ',
              React.createElement(ResourceLinkComponent, {iri}),
              ' not found'
            ),
          });
        }
        return createManifest(params);
      })
    );

    this.manifestQueryingCancellation = this.cancellation.deriveAndCancel(
      this.manifestQueryingCancellation
    );
    this.manifestQueryingCancellation.map(
      Kefir.zip(manifestQuerying)
    ).onValue(allManifests => {
      const manifests = allManifests.filter(manifest => manifest !== undefined);
      const miradorConfig = this.miradorConfigFromManifest(manifests);
      this.miradorInstance = renderMirador({
        targetElement: element,
        miradorConfig,
        onInitialized: mirador => {
          scrollToRegions(mirador, ({canvasId}) => {
            for (const [iri, image] of Array.from(this.state.info)) {
              if (canvasId === image.imageIRI.value) {
                return image.viewport;
              }
            }
            return undefined;
          });
          if (this.props.onMiradorInitialized) {
            this.props.onMiradorInitialized(mirador);
          }
      }});
    });
  }

  private queryManifestParameters(
    {iri, images, iiifServerUrl}: { iri: string; images: Array<string>; iiifServerUrl: string }
  ) {
    if (!images.length) { return Kefir.constant([]); }
    const queryingImagesInfo = images.map(imageIri => {
      const imageInfo = this.state.info.get(imageIri);
      const iiifImageId = this.state.iiifImageId.get(imageIri);
      if (!imageInfo || !iiifImageId) { return Kefir.constant(undefined); }
      const imageServiceUri = ImageApi.constructServiceRequestUri(iiifServerUrl, iiifImageId);
      return ImageApi.queryImageBounds(iiifServerUrl, iiifImageId).flatMap(canvasSize =>
        Kefir.constant({
          baseIri: imageInfo.isRegion ? imageInfo.imageIRI : Rdf.iri(iri),
          imageIri: imageInfo.imageIRI,
          imageServiceUri,
          canvasSize,
        })
      ).flatMapErrors(() =>
        Kefir.constant(undefined)
      );
    });
    return Kefir.zip(queryingImagesInfo).toProperty();
  }

  private getImages() {
    const {imageOrRegion} = this.props;
    if (typeof imageOrRegion === 'string') {
      return {[imageOrRegion]: [imageOrRegion]};
    }
    return imageOrRegion;
  }

  private getRepositories = () =>
    Maybe.fromNullable(this.props.repositories).orElse(
      () => Maybe.fromNullable(this.context.semanticContext).chain(
        c => Maybe.fromNullable([c.repository])
      )
    ).getOrElse(['default']);

  private miradorConfigFromManifest(
    manifests: Array<Manifest>
  ): Mirador.Options {
    const {id, annotationEndpoint} = this.props;
    const imagesInfo = this.state.info as ImagesInfoByIri;
    return {
      id: id, // The CSS ID selector for the containing element.
      layout: chooseMiradorLayout(manifests.length),
      saveSession: false,
      data: manifests.map(manifest => ({
        manifestUri: manifest['@id'],
        location: 'British Museum',
        manifestContent: manifest,
      })),
      annotationEndpoint: {
        name: 'ResearchSpace annotation endpoint',
        module: 'AdapterAnnotationEndpoint',
        options: {
          endpoint: annotationEndpoint || new LdpAnnotationEndpoint({imagesInfo}),
        },
      },
      availableAnnotationDrawingTools: [
        'Rectangle', 'Ellipse', 'Freehand', 'Polygon', 'Pin',
      ],
      windowObjects: manifests.map<Mirador.WindowObject>(manifest => ({
        loadedManifest: manifest['@id'],
        viewType: 'ImageView',
        sidePanel: false,
        canvasControls: {
          annotations: {
            annotationState: 'on',
            annotationRefresh: true,
          },
        },
      })),
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
    this.cancellation.cancelAll();
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
          id: this.props.id,
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
