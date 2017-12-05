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

import * as jsonld from 'jsonld';

const iiifContext = require('./ld-resources/iiif-context.json');

export class JsonLDUtilsClass {
  readonly CONTEXTS = {
    'http://iiif.io/api/presentation/2/context.json': iiifContext,
  };
  nodeDocumentLoader = jsonld.documentLoaders.node();

  registerLocalLoader() {
    // FIXME when typescript 2.0 is out
    (<any>jsonld).documentLoader = (error, payload) => this.localResourceLoader(error, payload);
  }

  localResourceLoader(url: string, callback: (error: any, payload: any) => void) {
    if (url in this.CONTEXTS) {
      return callback(
        null, {
          contextUrl: null, // this is for a context via a link header
          document: this.CONTEXTS[url], // this is the actual document that was loaded
          documentUrl: url, // this is the actual context URL after redirects
        });
    }
    this.nodeDocumentLoader(url, callback);
  }
}

export const JsonLDUtils = new JsonLDUtilsClass();
export default JsonLDUtils;
