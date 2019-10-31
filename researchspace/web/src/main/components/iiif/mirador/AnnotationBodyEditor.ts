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

import * as D from 'react-dom-factories';
import { render as renderReactToDOM } from 'react-dom';

import {
  OARegionAnnotation, getAnnotationTextResource,
} from '../../../data/iiif/LDPImageRegionService';

interface MiradorAnnotationBodyEditor {
  show(selector: string): void;
  isDirty(): boolean;
  createAnnotation(): any;
  updateAnnotation(annotation: any): void;
}

interface MiradorAnnotationBodyEditorOptions {
  annotation: any;
  windowId: string;
}

export class MetaphactoryAnnotationBodyEditor implements MiradorAnnotationBodyEditor {
  annotation: OARegionAnnotation;
  windowId: string;

  private originalRegionTitle: string;
  private changedRegionTitle: string;

  constructor(options: MiradorAnnotationBodyEditorOptions) {
    this.annotation = options.annotation;
    this.windowId = options.windowId;

    const textResource = getAnnotationTextResource(this.annotation);
    this.originalRegionTitle = textResource ? textResource.chars : '';
  }

  show(selector: string) {
    const container = document.querySelector(selector);
    if (!container) { return; }
    const root = document.createElement('div');
    container.insertBefore(root, container.firstChild);
    const reactElement = this.renderReactElement();
    renderReactToDOM(reactElement, root);
  }

  private renderReactElement() {
    return D.div(
      {className: 'annotation-body-editor'},
      D.input({
        className: 'annotation-body-editor__title-field',
        placeholder: 'Title',
        defaultValue: this.originalRegionTitle,
        onChange: event => {
          this.changedRegionTitle = (event.target as HTMLInputElement).value;
        },
      }));
  }

  isDirty() { return this.changedRegionTitle !== this.originalRegionTitle; }

  createAnnotation() {
    return {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@type': 'oa:Annotation',
      'motivation': ['oa:commenting'],
      'resource': {
        '@type': 'dctypes:Text',
        'format': 'text/html',
        'chars': this.changedRegionTitle,
      },
    };
  }

  updateAnnotation(annotation: any) {
    const textResource = getAnnotationTextResource(this.annotation);
    if (textResource) {
      textResource.chars = this.changedRegionTitle;
    }
  }
}
