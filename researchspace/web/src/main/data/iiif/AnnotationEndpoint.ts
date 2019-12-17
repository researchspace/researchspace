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

import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';

import { LdpRegionService, OARegionAnnotation } from './LDPImageRegionService';

import { ImageOrRegionInfo } from './ImageAnnotationService';

export interface AnnotationEndpoint {
  init?: () => void;
  search?: (canvasIri: Rdf.Iri) => Kefir.Property<OARegionAnnotation[]>;
  create?: (annotation: OARegionAnnotation) => Kefir.Property<Rdf.Iri>;
  update?: (annotation: OARegionAnnotation) => Kefir.Property<Rdf.Iri>;
  remove?: (annotationIri: Rdf.Iri) => Kefir.Property<void>;
  userAuthorize?: (action: any, annotation: OARegionAnnotation) => boolean;
}

export type ImagesInfoByIri = Map<string, ImageOrRegionInfo>;

export class LdpAnnotationEndpoint implements AnnotationEndpoint {
  private readonly imagesInfo: ImagesInfoByIri;

  constructor(options: { imagesInfo?: ImagesInfoByIri }) {
    this.imagesInfo = options.imagesInfo || new Map<string, ImageOrRegionInfo>();
  }

  search(canvasIri: Rdf.Iri) {
    let annotationList = LdpRegionService.search(canvasIri);
    // filtering specific image region if we're called to display only one region.
    // This is overhead, all regions are retreived and only one is used,
    // but i'm unshure should we change API here
    const imageInfo = this.imagesInfo.get(canvasIri.value);
    if (imageInfo && imageInfo.isRegion) {
      annotationList = annotationList.map(list => list.filter(
        annotation => annotation['@id'] === imageInfo.iri.value));
    }
    return annotationList;
  }

  create(annotation: OARegionAnnotation) {
    return LdpRegionService.addRegion({annotation});
  }

  update(annotation: OARegionAnnotation) {
    const id = Rdf.iri(annotation['@id']);
    return LdpRegionService.updateRegion(id, {annotation});
  }

  remove(annotationIri: Rdf.Iri) {
    return LdpRegionService.deleteRegion(annotationIri) as Kefir.Property<any>;
  }
}
