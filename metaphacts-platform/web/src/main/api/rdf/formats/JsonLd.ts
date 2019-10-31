/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as JsonLd from 'jsonld';
import * as Kefir from 'kefir';
import * as N3 from 'n3';

import * as Rdf from '../core/Rdf';

registerTtlParser();
registerGraphParser();

export interface LoaderOptions {
  /** @default false */
  fetchRemoteContexts?: boolean;
  overrideContexts?: {
    [contextIri: string]: object
  };
}

const NODE_DOCUMENT_LOADER = JsonLd.documentLoaders.node();

export function makeDocumentLoader(options: LoaderOptions): JsonLd.DocumentLoader {
  return (url, callback) => {
    if (options.overrideContexts && url in options.overrideContexts) {
      return callback(null, {
        // this is for a context via a link header
        contextUrl: null,
        // this is the actual document that was loaded
        document: options.overrideContexts[url],
        // this is the actual context URL after redirects
        documentUrl: url,
      });
    }

    if (options.fetchRemoteContexts) {
      return NODE_DOCUMENT_LOADER(url, callback);
    } else {
      callback(new Error(`Fetching remote JSON-LD contexts is not allowed`), null);
    }
  };
}

export function compact(
  input: object,
  ctx: object | string,
  options: JsonLd.CompactOptions & { documentLoader: JsonLd.DocumentLoader }
): Kefir.Property<any> {
  return Kefir.fromNodeCallback(
    callback => JsonLd.compact(input, ctx, options, callback)
  ).toProperty();
}

export function frame(
  input: object | string,
  frame: object,
  options: JsonLd.FrameOptions & { documentLoader: JsonLd.DocumentLoader }
): Kefir.Property<any> {
  return Kefir.fromNodeCallback(
    callback => JsonLd.frame(input, frame, options, callback)
  ).toProperty();
}

export function fromRdf(
  dataset: object | string,
  options: JsonLd.FromRdfOptions & { documentLoader: JsonLd.DocumentLoader }
): Kefir.Property<any> {
  return Kefir.fromNodeCallback(
    callback => JsonLd.fromRDF(dataset, options, callback)
  ).toProperty();
}

function registerTtlParser() {
  JsonLd.registerRDFParser('text/turtle', (input, callback) => {
    const quads: JsonLd.Quad[] = [];
    N3.Parser().parse(input, (error, triple, hash) => {
      if (error) {
        callback(error, quads);
      } else if (triple) {
        const quad = createJsonLdQuad(triple);
        quads.push(quad);
      } else if (callback) {
        callback(undefined, quads);
      }
    });
  });
}

/**
 * Registers parser from Rdf.Graph to json-ld with 'mph/graph' MIME-type.
 */
function registerGraphParser() {
  JsonLd.registerRDFParser('mph/graph', (input, callback) => {
    const inputGraph = input as Rdf.Graph;
    const quads = inputGraph.triples.forEach(triple => (
      {
        subject: getTerm(triple.s),
        predicate: getTerm(triple.p),
        object: getTerm(triple.o),
        graph: {
          termType: 'DefaultGraph',
          value: '',
        }
      }
    ));
    function getTerm(term: Rdf.Node): JsonLd.Term {
      if (term.isLiteral()) {
        return {
          termType: 'Literal',
          value: term.value,
          language: term.language,
          datatype: {
            termType: 'NamedNode',
            value: term.datatype.value,
          },
        };
      } else if (term.isBnode()) {
          return {
            termType: 'BlankNode',
            value: term.value,
          };
      } else if (term.isIri()) {
        return {
          termType: 'NamedNode',
          value: term.value,
        };
      }
    }
    return quads;
  });
}

function createJsonLdQuad(triple: N3.Triple): JsonLd.Quad {
  return {
    subject: getTerm(triple.subject),
    predicate: getTerm(triple.predicate),
    object: getTerm(triple.object),
    graph: {
      termType: 'DefaultGraph',
      value: '',
    },
  };

  function getTerm(value: string): JsonLd.Term {
    if (N3.Util.isLiteral(value)) {
      return getLiteralTerm(value);
    } else if (N3.Util.isBlank(value)) {
      return {
        termType: 'BlankNode',
        value: value,
      };
    } else {
      return {
        termType: 'NamedNode',
        value: value,
      };
    }
  }

  function getLiteralTerm(literal: string): JsonLd.Term {
    return {
      termType: 'Literal',
      value: N3.Util.getLiteralValue(literal),
      language: N3.Util.getLiteralLanguage(literal),
      datatype: {
        termType: 'NamedNode',
        value: N3.Util.getLiteralType(literal),
      },
    };
  }
}
