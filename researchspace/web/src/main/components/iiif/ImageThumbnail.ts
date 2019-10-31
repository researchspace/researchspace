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
import * as Kefir from 'kefir';
import { isEqual } from 'lodash';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { Component } from 'platform/api/components';

import * as ImageApi from '../../data/iiif/ImageAPI';
import {
  queryIIIFImageOrRegion, ImageOrRegionInfo,
} from '../../data/iiif/ImageAnnotationService';

export interface Props {
  imageOrRegion: string;
  imageIdPattern: string;
  iiifServerUrl: string;
  width?: number | string;
  height?: number | string;
  preserveImageSize?: boolean;
}

export interface State {
  loading: boolean;
  thumbnail?: LoadedThumbnail;
  error?: any;
}

interface LoadedThumbnail {
  iiifUri: string;
  info: ImageOrRegionInfo;
  requestedRegion?: Rectangle;
  naturalSize?: {width: number; height: number};
}

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ThumbnailRequest = {
  iri?: Rdf.Iri;
  imageIdPattern: string;
  iiifServerUrl: string;
  width: number;
  height: number;
};

const REGION_OVERLAY_MARGIN_FRACTION = 0.05;
const REGION_OVERLAY_STROKE_WIDTH = '2%';

/**
 * Displays thumbnail of rso:EX_Digital_Image or rso:EX_Digital_Image_Region.
 *
 * By default component fits image in parent bounds and (if specified) props.{width, height}
 * preserving aspect ratio of image. This could be disabled by setting 'preserveImageSize'.
 *
 * @example
 * <!-- fits inside 300x200 px rectangle -->
 * <rs-iiif-image-thumbnail image-or-region='http://example.com/bar/bar.jpg'
 *    image-id-pattern='BIND(REPLACE(?imageIRI, "^http://example.com/(.*)$", "$1") as ?imageID)'
 *    iiif-server-url='/Scaler/IIIF'
 *    width='{300}' height='{200}'>
 * </rs-iiif-image-thumbnail>
 *
 * <div style="height: 200px; width: 400px;">
 *  <!-- fills container div -->
 *  <rs-iiif-image-thumbnail image-or-region='http://example.com/bar/bar.jpg'
 *    image-id-pattern='BIND(REPLACE(?imageIRI, "^http://example.com/(.*)$", "$1") as ?imageID)'
 *    iiif-server-url='/Scaler/IIIF'>
 *  </rs-iiif-image-thumbnail>
 * </div>
 */
class ImageThumbnailComponent extends Component<Props, State> {
  private requests: Kefir.Pool<ThumbnailRequest>;

  constructor(props: Props, context) {
    super(props, context);
    this.state = {loading: true};
    this.requests = Kefir.pool<ThumbnailRequest>();

    this.requests.flatMapLatest(
      request =>
        request.iri ? this.loadImageOrRegion(request) : Kefir.never()
    ).onValue((thumbnail: LoadedThumbnail) => this.setState({loading: true, thumbnail}))
      .onError(error => this.setState({loading: false, error}));
  }

  private loadImageOrRegion(
    {iri, imageIdPattern, iiifServerUrl, width, height}: ThumbnailRequest
  ): Kefir.Stream<LoadedThumbnail> {
    type QueryResult = {
      info: ImageOrRegionInfo;
      bounds: ImageApi.ImageBounds;
    };
    const repository =
      Maybe.fromNullable(this.context.semanticContext).map(c => c.repository).getOrElse('default');
    const queryResult = queryIIIFImageOrRegion(iri, imageIdPattern, [repository])
      .flatMap<QueryResult>(info => ImageApi
        .queryImageBounds(iiifServerUrl, info.imageId)
        .map(bounds => ({info, bounds}))
      );
    return queryResult.map(({info, bounds}) => {
      const requestParams: ImageApi.ImageRequestParams = {
        imageId: info.imageId,
        format: 'jpg',
      };
      const requestedRegion = (info.isRegion && info.boundingBox)
        ? computeDisplayedRegionWithMargin(
          info.boundingBox, bounds, REGION_OVERLAY_MARGIN_FRACTION)
        : undefined;
      requestParams.region = requestedRegion;
      if (width || height) {
        requestParams.size = new ImageApi.Size.BestFit(width, height);
      }
      const imageUri = ImageApi.constructImageUri(iiifServerUrl, requestParams);
      return {
        iiifUri: imageUri,
        info: info,
        requestedRegion,
      };
    });
  }

  componentDidMount() {
    this.requestThumbnail(this.props);
  }

  componentWillReceiveProps(nextProps: Props) {
    // do not re-render thumbnail if nothing changed
    if (!isEqual(nextProps, this.props)) {
      this.requestThumbnail(nextProps);
    }
  }

  requestThumbnail(props: Props) {
    this.requests.plug(Kefir.constant({
      iri: Rdf.iri(props.imageOrRegion),
      imageIdPattern: props.imageIdPattern,
      iiifServerUrl: props.iiifServerUrl,
      width: this.props.width ? Number(this.props.width) : undefined,
      height: this.props.height ? Number(this.props.height) : undefined,
    }));
  }

  componentWillUnmount() {
    this.requests.plug(Kefir.constant({} as ThumbnailRequest));
  }

  render() {
    const defaultSize = this.props.preserveImageSize ? undefined : '100%';

    let {width, height} = this.props;
    if (width === undefined) { width = defaultSize; }
    if (height === undefined) { height = defaultSize; }

    return D.div(
      {className: 'image-thumbnail', style: {width, height}},
      this.renderChild());
  }

  private renderChild() {
    if (this.state.loading) {
      const image = this.state.thumbnail ? D.img({
        src: this.state.thumbnail.iiifUri,
        style: {display: 'none'},
        onLoad: e => this.onImageLoad(e),
        onError: () => this.setState(prev => ({
          loading: false, thumbnail: prev.thumbnail, error:
            `Failed to load image at URI '${prev.thumbnail.iiifUri}'.`,
        })),
      }) : null;
      return D.div({}, React.createElement(Spinner), image);
    } else if (this.state.error) {
      return React.createElement(ErrorNotification, {errorMessage: this.state.error});
    } else if (this.state.thumbnail) {
      return this.renderImage(this.state.thumbnail);
    } else {
      return D.span({}, this.props.imageOrRegion);
    }
  }

  private onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const image = e.target as HTMLImageElement;
    this.setState(prev => ({
      loading: false,
      thumbnail: {
        iiifUri: prev.thumbnail.iiifUri,
        info: prev.thumbnail.info,
        requestedRegion: prev.thumbnail.requestedRegion,
        naturalSize: {width: image.naturalWidth, height: image.naturalHeight},
      },
    }));
  }

  private renderImage(thumbnail: LoadedThumbnail): React.ReactElement<any> {
    const hasOverlay = Boolean(thumbnail.info.svgContent);

    const {width, height} = thumbnail.naturalSize;
    const componentSize = this.props.preserveImageSize
      ? thumbnail.naturalSize : {width: '100%', height: '100%'};

    return D.svg(
      {
        style: {
          verticalAlign: 'middle',
          width: componentSize.width,
          height: componentSize.height,
        },
        // fit content in viewBox center-aligned
        preserveAspectRatio: 'xMidYMid meet',
        viewBox: `0 0 ${width} ${height}`,
      },
      D.image({xlinkHref: thumbnail.iiifUri, width, height}),
      hasOverlay ? D.g({
        dangerouslySetInnerHTML: thumbnail.info.svgContent,
        ref: parent => this.renderSVGOverlay(parent, thumbnail),
      }) : undefined
    );
  }

  private renderSVGOverlay(parent: SVGElement, thumbnail: LoadedThumbnail) {
    if (!parent) { return; }
    const svgElement = <SVGElement>parent.firstChild;
    const region = thumbnail.requestedRegion;
    svgElement.setAttribute('viewBox',
      `${region.x} ${region.y} ` +
      `${region.width} ${region.height}`);
    svgElement.setAttribute('width', String(thumbnail.naturalSize.width));
    svgElement.setAttribute('height', String(thumbnail.naturalSize.height));

    overrideOverlayStrokeWidth(svgElement, REGION_OVERLAY_STROKE_WIDTH);
  }
}

function computeDisplayedRegionWithMargin(
  regionBounds: Rectangle,
  imageSize: ImageApi.ImageBounds,
  marginPercent: number
) {
  const margin = Math.max(
    regionBounds.width * marginPercent,
    regionBounds.height * marginPercent);
  // clamp region with margin by (0,0) and image size
  return new ImageApi.Region.Absolute(
    Math.max(regionBounds.x - margin, 0),
    Math.max(regionBounds.y - margin, 0),
    Math.min(regionBounds.width + margin * 2, imageSize.width),
    Math.min(regionBounds.height + margin * 2, imageSize.height));
}

function overrideOverlayStrokeWidth(overlay: SVGElement, newWidth: string) {
  const paths = overlay.querySelectorAll('path');
  for (let i = 0; i < paths.length; i++) {
    paths[i].setAttribute('stroke-width', newWidth);
  }
}

export type component = ImageThumbnailComponent;
export const component = ImageThumbnailComponent;
export const factory = React.createFactory(component);
export default component;
