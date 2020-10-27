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

import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as OpenSeadragon from 'openseadragon';
import * as Immutable from 'immutable';

import * as ImageApi from '../../data/iiif/ImageAPI';
import { ImageOrRegionInfo } from '../../data/iiif/ImageAnnotationService';

import './image-overlay.scss';
import * as block from 'bem-cn';

const b = block('open-seadragon-overlay');

export interface OverlayProps {
  metadata: Immutable.List<ImageOrRegionInfo>;
  iiifServerUrl: string;
  firstImageWeight: number;
}

export class OpenSeadragonOverlay extends Component<OverlayProps, {}> {
  private osd: {
    viewer: OpenSeadragon.Viewer;
    images: OpenSeadragon.TiledImage[];
  };

  constructor(props: OverlayProps) {
    super(props);
  }

  shouldComponentUpdate(nextProps: OverlayProps, nextState: {}) {
    if (this.osd) {
      if (nextProps.firstImageWeight !== this.props.firstImageWeight) {
        this.setOpacity(nextProps.firstImageWeight);
      }
    }
    return false;
  }

  private setOpacity(firstImageOpacity: number) {
    const subsequentOpacity = subsequentImagesOpacity(firstImageOpacity, this.osd.images.length);
    for (let i = 1; i < this.osd.images.length; i++) {
      this.osd.images[i].setOpacity(subsequentOpacity);
    }
    this.osd.viewer.forceRedraw();
  }

  getImageInformationRequestUri(imageInfo: ImageOrRegionInfo) {
    const serverAndPrefix = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
    return ImageApi.constructInformationRequestUri(serverAndPrefix, imageInfo.imageId);
  }

  render() {
    return D.div({
      className: b('').toString(),
      style: {},
      ref: (element) => {
        try {
          this.renderOpenSeadragon(element);
        } catch (e) {
          console.log(e);
        }
      },
    });
  }

  private renderOpenSeadragon(element: HTMLElement) {
    if (element && this.props.metadata && this.props.iiifServerUrl) {
      const viewer = OpenSeadragon({
        id: 'osd',
        element: element,
        alwaysBlend: true,
        showNavigationControl: false,
        opacity: 1,
        minZoomImageRatio: 0.6,
        maxZoomPixelRatio: 4,
        tileSources: [this.getImageInformationRequestUri(this.props.metadata.first())],
      });
      viewer.addOnceHandler('tile-loaded', this.onFirstImageLoaded);
      this.osd = { viewer, images: [] };
    } else if (this.osd) {
      this.osd.viewer.destroy();
      this.osd = undefined;
    }
  }

  private onFirstImageLoaded = (event: OpenSeadragon.TileLoadedEvent) => {
    this.osd.images.push(event.tiledImage);
    const opacity = subsequentImagesOpacity(this.props.firstImageWeight, this.props.metadata.size);
    this.props.metadata.skip(1).forEach((imageInfo) => {
      const requestUri = this.getImageInformationRequestUri(imageInfo);
      this.osd.viewer.addTiledImage({
        tileSource: requestUri,
        opacity,
        success: this.onSubsequentImageLoaded,
      });
    });
  };

  private onSubsequentImageLoaded = (event: OpenSeadragon.AddTiledImageSuccessEvent) => {
    this.osd.images.push(event.item);
  };
}

function subsequentImagesOpacity(firstImageWeight: number, imageCount: number) {
  return (1 - firstImageWeight) / Math.max(1, imageCount - 1);
}
