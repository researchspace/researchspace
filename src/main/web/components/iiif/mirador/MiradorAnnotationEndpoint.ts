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

import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';

import { OARegionAnnotation, getAnnotationTextResource } from '../../../data/iiif/LDPImageRegionService';
import { AnnotationEndpoint } from '../../../data/iiif/AnnotationEndpoint';

interface MiradorAnnotationEndpoint {
  dfd: any;
  annotationsList: OARegionAnnotation[];

  init(): void;

  search(options: { uri: string }, onSuccess: (data: OARegionAnnotation[]) => void, onError: () => void): void;

  create(oaAnnotation: OARegionAnnotation, onSuccess: (data: OARegionAnnotation) => void, onError: () => void): void;

  update(oaAnnotation: OARegionAnnotation, onSuccess: () => void, onError: () => void): void;

  deleteAnnotation(annotationId: string, onSuccess: () => void, onError: () => void): void;

  set(property: string, value: any, options: any): void;

  userAuthorize(action: any, annotation: OARegionAnnotation): boolean;
}

export class AdapterAnnotationEndpoint implements MiradorAnnotationEndpoint {
  dfd: JQueryDeferred<any>;
  annotationsList: OARegionAnnotation[];

  readonly endpoint: AnnotationEndpoint;

  constructor(options: { dfd: JQueryDeferred<any>; endpoint: AnnotationEndpoint }) {
    this.dfd = options.dfd;
    this.endpoint = options.endpoint;
  }

  init() {
    if (this.endpoint.init) {
      this.endpoint.init();
    }
  }

  set(property: string, value: any, options: any) {
    this[property] = value;
  }

  userAuthorize(action: any, annotation: OARegionAnnotation): boolean {
    if (this.endpoint.userAuthorize) {
      return this.endpoint.userAuthorize(action, annotation);
    } else {
      return true;
    }
  }

  search(options: { uri: string }, onSuccess: (data: OARegionAnnotation[]) => void, onError: () => void) {
    this.annotationsList = [];

    const task = this.endpoint.search
      ? this.endpoint.search(Rdf.iri(options.uri))
      : Kefir.constantError<any>(new Error('AnnotationEndpoint.search is not implemented'));

    task
      .onValue((annotationList) => {
        if (typeof onSuccess === 'function') {
          onSuccess(annotationList);
        } else {
          this.annotationsList = annotationList.map((annotation) => {
            annotation['endpoint'] = this;
            return annotation;
          });
          this.dfd.resolve(false);
        }
      })
      .onError(onError);
  }

  create(oaAnnotation: OARegionAnnotation, onSuccess: (data: OARegionAnnotation) => void, onError: () => void) {
    oaAnnotation['@id'] = '';
    const textResource = getAnnotationTextResource(oaAnnotation);
    oaAnnotation['http://www.w3.org/2000/01/rdf-schema#label'] = textResource.chars.replace(/<(?:.|\n)*?>/gm, '');
    oaAnnotation['endpoint'] = this;
    const clone = cloneAnnotation(oaAnnotation);

    const task = this.endpoint.create
      ? this.endpoint.create(clone)
      : Kefir.constantError<any>(new Error('AnnotationEndpoint.create is not implemented'));

    task
      .onValue((iri) => {
        oaAnnotation['@id'] = iri.value;
        this.annotationsList.push(oaAnnotation);
        onSuccess(oaAnnotation);
      })
      .onError(onError);
  }

  update(oaAnnotation: OARegionAnnotation, onSuccess: (data: OARegionAnnotation) => void, onError: () => void) {
    const clone = cloneAnnotation(oaAnnotation);
    const textResource = getAnnotationTextResource(clone);
    clone['http://www.w3.org/2000/01/rdf-schema#label'] = textResource.chars.replace(/<(?:.|\n)*?>/gm, '');

    const task = this.endpoint.update
      ? this.endpoint.update(clone)
      : Kefir.constantError<any>(new Error('AnnotationEndpoint.update is not implemented'));

    task.onValue(() => onSuccess(oaAnnotation)).onError(onError);
  }

  deleteAnnotation(annotationId: string, onSuccess: () => void, onError: () => void) {
    const annotationIndex = this.annotationsList.findIndex(a => a['@id'] === annotationId);
    const annotation = this.annotationsList[annotationIndex];
    const task = this.endpoint.remove
      ? this.endpoint.remove(annotation)
      : Kefir.constantError<any>(new Error('AnnotationEndpoint.delete is not implemented'));

    this.annotationsList.splice(annotationIndex, 1);
    task.onValue(onSuccess).onError(onError);
  }
}

function cloneAnnotation(annotation: OARegionAnnotation) {
  const endpoint = annotation['endpoint'];
  delete annotation['endpoint'];
  const clone = _.cloneDeep(annotation);
  annotation['endpoint'] = endpoint;
  return clone;
}
