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

import { createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import { uniqueId, keyBy, isEqual } from 'lodash';
import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import {
  queryIIIFImageOrRegion, ImageOrRegionInfo,
} from '../../data/iiif/ImageAnnotationService';
import * as ImageApi from '../../data/iiif/ImageAPI';
import { createManifest, Manifest } from '../../data/iiif/ManifestBuilder';
import { LdpRegionService, OARegionAnnotation } from '../../data/iiif/LDPImageRegionService';
import { LdpAnnotationEndpoint } from '../../data/iiif/AnnotationEndpoint';

import { renderMirador, removeMirador, scrollToRegions } from './mirador/Mirador';

interface Props {
  selection: Array<Rdf.Iri | string>;
  repositories?: Array<string>;
  imageIdPattern: string;
  iiifServerUrl: string;
}

interface State {
  loading: boolean;
  imagesMetadata?: Metadata[];
  miradorConfig?: Mirador.Options;
  error?: any;
}

interface Metadata {
  manifest: Manifest;
  imageInfo: ImageOrRegionInfo;
  annotations: OARegionAnnotation[];
}

type Request = Data.Maybe<Props>;

/**
 * Side-by-Side image comparison component.
 * Due to usage of Mirador, you must place it in a html element with defined height.
 *
 * @example
 * <rs-iiif-mirador-side-by-side-comparison
 *   compared-images='[<image1>, <image2>, <region3>]'
 *   image-id-pattern='BIND(REPLACE(?imageIRI, "^http://example.com/(.*)$", "$1") as ?imageID)'
 *   iiif-server-url='<iiif-server>'>
 * </rs-iiif-mirador-side-by-side-comparison>
 */
export class SideBySideComparison extends Component<Props, State> {
  private requests: Kefir.Pool<Request>;
  private miradorElementId: string;

  private miradorElement: HTMLElement;
  private miradorInstance: Mirador.Instance;

  static defaultProps = {
    repositories: ['default'],
  };

  constructor(props, context) {
    super(props, context);
    this.requests = Kefir.pool<Request>();
    this.miradorElementId = uniqueId('mirador_');

    this.state = {loading: true};

    // 1. create Mirador configuration, including all manifests and layout
    this.requests.flatMapLatest(request => request.isJust
      ? this.loadMiradorConfig(request.get()) : Kefir.never<any>()
    ).onValue(({imagesMetadata, miradorConfig}) =>
      this.setState({loading: false, imagesMetadata, miradorConfig})
    ).onError(error => this.setState({loading: false, error}));
  }

  private loadMiradorConfig(request: Props) {
    // 1.1. to create Mirador Config, gather
    // all images info (manifest, image info, regions/annotations)
    // 1.1.1 we need image dimensions from iiif image server to create manifest
    return this.gatherImageMetadata(request).map(imagesMetadata => {
      const miradorConfig = this.createMiradorConfig(imagesMetadata);
      return {imagesMetadata, miradorConfig};
    });
  }

  /**
   * This gathers Image Metadata from iiif image server to get
   * image sizes, image regions from LDP and creates manifest.
   *
   * It's executed in a sequence, but we could parallel some tasks.
   * We should fetch image sizes, then create manifest,
   * while fetching regions could be done in parallel.
   *
   * @param request
   * @returns {Stream<Metadata[]>}
     */
  private gatherImageMetadata(request: Props): Kefir.Stream<Metadata[]> {
    const repositories = request.repositories;
    // 1.1.1.1 get full iiif service url if it's relative one
    const serviceUrl = ImageApi.getIIIFServerUrl(request.iiifServerUrl);

    const metadataTasks = request.selection
      .map(iri => typeof iri === 'string' ? Rdf.iri(iri) : iri)
      .map(iri => queryIIIFImageOrRegion(
        iri, request.imageIdPattern, repositories
      ).flatMap(imageInfo => {
        // creating image API request url for given image
        const serviceRequestUri = ImageApi.constructServiceRequestUri(
          serviceUrl, imageInfo.imageId);
        // getting info.json from image API
        return ImageApi.queryImageBounds(serviceUrl, imageInfo.imageId).flatMap(bounds =>
        // we've got image size, we can create manifest
        // but instead we are starting to fetch for regions
          LdpRegionService.search(imageInfo.imageIRI).flatMap(annotations =>
            // and lastly we're creating manifest and putting it all together
            createManifest([{
              baseIri: imageInfo.iri,
              imageIri: imageInfo.imageIRI,
              imageServiceUri: serviceRequestUri,
              canvasSize: bounds,
            }]).map(manifest => ({manifest, imageInfo, annotations}))
          )
        );
      }));

    return Kefir.zip(metadataTasks);
  }

  private createMiradorConfig(imagesMetadata: Metadata[]): Mirador.Options {
    const metadataByIri = keyBy(imagesMetadata, meta => meta.imageInfo.iri.value);
    let annotationEndpoint = new SideBySideAnnotationEndpoint(
      metadataByIri
    );
    return {
      id: this.miradorElementId,
      layout: chooseMiradorLayout(imagesMetadata.length),
      saveSession: false,
      data: imagesMetadata.map(metadata => ({
        manifestUri:  metadata.manifest['@id'],
        location: 'British Museum',
        manifestContent: metadata.manifest,
      })),
      annotationEndpoint: {
        name: 'ResearchSpace annotation endpoint',
        module: 'AdapterAnnotationEndpoint',
        options: {
          endpoint: annotationEndpoint,
        },
      },
      windowObjects: imagesMetadata.map((metadata): Mirador.WindowObject => ({
        loadedManifest: metadata.manifest['@id'],
        viewType: 'ImageView' as 'ImageView',
        sidePanel: false,
        canvasControls: {
          annotations: {
            annotationState: 'on',
            annotationCreation: true,
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

  componentDidMount() {
    this.requests.plug(Kefir.constant(maybe.Just(this.props)));
  }

  componentWillUnmount() {
    this.requests.plug(Kefir.constant(maybe.Nothing()));
    removeMirador(this.miradorInstance, this.miradorElement);
  }


  public shouldComponentUpdate(nextProps: Props, nextState: State) {
    return nextState.loading !== this.state.loading || !isEqual(nextProps, this.props);
  }

  render() {
    return D.div({style: {position: 'relative', width: '100%', height: '100%'}},
      this.renderContent()
    );
  }

  private renderContent() {
    if (this.state.loading) {
      return createElement(Spinner);
    } else if (this.state.error) {
      return createElement(ErrorNotification, {errorMessage: this.state.error});
    } else {
      return D.div({
        ref: element => {
          this.miradorElement = element;
          this.renderMirador(element);
        },
        id: this.miradorElementId,
        className: 'mirador',
        style: {width: '100%', height: '100%', position: 'relative'},
      });
    }
  }

  private renderMirador(element: HTMLElement) {
    if (!this.state || !this.state.miradorConfig || !element) { return; }

    removeMirador(this.miradorInstance, element);

    this.miradorInstance = renderMirador({
      targetElement: element,
      miradorConfig: this.state.miradorConfig,
      onInitialized: mirador => {
        scrollToRegions(mirador, ({index}) => {
          const metadata = this.state.imagesMetadata[index];
          return metadata.imageInfo.viewport;
        });
      },
    });
  }
}

/**
 * Computes the arrangement of Mirador windows
 */
export function chooseMiradorLayout(slotCount: number) {
  const layout: Mirador.LayoutDescription = {type: 'column'};
  if (slotCount <= 1) { return layout; }

  const rows = Math.max(1, Math.floor(Math.sqrt(slotCount)));
  const columns = Math.ceil(slotCount / rows);
  const columnsInLastRow = slotCount - columns * (rows - 1);
  layout.children = [];

  for (let i = 0; i < rows; i++) {
    const row: Mirador.LayoutDescription = {type: 'row', children: []};
    layout.children.push(row);
    const columnCount = (i === rows - 1) ? columnsInLastRow : columns;

    for (let j = 0; j < columnCount; j++) {
      row.children.push({type: 'column'});
    }
  }

  return layout;
}

class SideBySideAnnotationEndpoint extends LdpAnnotationEndpoint {
  metadataByIri: any;

  constructor(metadataByIri: any) {
    super({});
    this.metadataByIri = metadataByIri;
  }

  search(canvasIri: Rdf.Iri) {
    const meta = this.metadataByIri[canvasIri.value];
    if (meta && meta.imageInfo.isRegion) {
    return Kefir.constant(meta.annotations.filter(
      annotation => annotation['@id'] === canvasIri.value
    ));
    } else {
     return Kefir.constant(meta.annotations);
    }
  }

}

export type c = SideBySideComparison;
export const c = SideBySideComparison;
export const f = createFactory(c);
export default c;
