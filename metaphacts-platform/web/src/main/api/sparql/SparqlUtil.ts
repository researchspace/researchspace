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

import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { getCurrentResource } from 'platform/api/navigation';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { isQuery, isTerm, isIri } from './TypeGuards';

// by default we initialized parser without prefixes so we don't need
// to initialize it explicitly in all tests, but the expectation is that
// in production run init is called on the system startup
let Parser: SparqlJs.SparqlParser = new SparqlJs.Parser();
export let RegisteredPrefixes: { [key: string]: string } = {};
export function init(registeredPrefixes: { [key: string]: string }) {
  RegisteredPrefixes = registeredPrefixes;
  Parser = new SparqlJs.Parser(registeredPrefixes);
}

const Generator = new SparqlJs.Generator();

export type RDFResultFormat = 'application/ld+json'
  | 'application/n-quads'
  | 'application/n-triples'
  | 'application/rdf+json'
  | 'application/rdf+xml'
  | 'application/trig'
  | 'application/trix'
  | 'application/x-binary-rdf'
  | 'application/x-trig'
  | 'application/x-turtle'
  | 'application/xml'
  | 'text/n3'
  | 'text/nquads'
  | 'text/plain'
  | 'text/rdf+n3'
  | 'text/turtle'
  | 'text/x-nquads';

export type TupleResultFormat = 'application/json'
  | 'application/sparql-results+json'
  | 'application/sparql-results+xml'
  | 'application/x-binary-rdf-results-table'
  | 'text/csv'
  | 'text/tab-separated-values';

export type BooleanResultFormat = 'text/boolean';
export type ResultFormat = RDFResultFormat | TupleResultFormat | BooleanResultFormat;

export function guessFileEnding(resultFormat: RDFResultFormat) {
  switch (resultFormat) {
    case 'application/rdf+xml':
        return 'rdf';
    case 'text/turtle':
        return 'ttl';
    case 'application/x-trig':
        return 'trig';
    case 'application/trix':
        return 'trix';
    case 'application/ld+json':
        return 'jsonld';
    case 'text/n3':
        return 'n3';
    case 'text/x-nquads':
        return 'nq';
    case 'application/n-triples':
        return 'nt';
    default:
        return 'application/rdf+xml';
  }
}

export function getFileEnding(file: File): string {
  return file.name.split('.').pop().toLowerCase().trim();
}

export function getMimeType(fileEnding: String): RDFResultFormat {

  switch (fileEnding) {
    case 'owl':
        return 'application/rdf+xml';
    case 'rdf':
        return 'application/rdf+xml';
    case 'ttl':
        return 'text/turtle';
    case 'trig':
        return 'application/x-trig';
    case 'trix':
        return 'application/trix';
    case 'jsonld':
        return 'application/ld+json';
    case 'n3':
        return 'text/n3';
    case 'nq':
        return 'text/x-nquads';
    case 'nt':
        return 'text/plain';
    case 'ntriples':
        return 'text/plain';
    default:
        return 'application/rdf+xml';
  }

}

export function addOrChangeLimit(
  query: SparqlJs.SelectQuery, limit: number
): SparqlJs.SparqlQuery {
  query.limit = limit;
  return query;
}

/**
 * TODO deprecated, please use parseQuerySync
 */
export function parseQueryAsync(query: string): Kefir.Property<SparqlJs.SparqlQuery> {
  try {
    return Kefir.constant(parseQuery(query));
  } catch (e) {
    console.error('Error while parsing the query: ' + e);
    return Kefir.constantError(e);
  }
}

/**
 * Parses SPARQL query from string representation to Query Algebra using SPARQL.js
 * Resolving all namespaces with platform namespace service.
 */
export function parseQuery<T extends SparqlJs.SparqlQuery>(query: string): T {
  return Parser.parse(
    encodeLegacyVars(replaceQueryParams(query))
  ) as T;
}

export function parseQuerySync<T extends SparqlJs.SparqlQuery>(query: string): T {
  return parseQuery<T>(query);
}

export function serializeQuery(query: SparqlJs.SparqlQuery): string {
  return decodeLegacyVars(Generator.stringify(query));
}

export function validateSelectQuery(query: SparqlJs.Query): Kefir.Property<SparqlJs.SelectQuery> {
  if (isQuery(query) && query.queryType === 'SELECT') {
    return Kefir.constant(query);
  } else {
    return Kefir.constantError<any>(new Error(`Invalid SELECT query: ${serializeQuery(query)}`));
  }
}

export function Sparql(
  strings: TemplateStringsArray, ...values: any []
): SparqlJs.SparqlQuery {
  return parseQuerySync(strings.raw[0]);
}

function replaceQueryParams(query: string): string {
  // TODO, for legacy purpose only. Bind ?? to current resource
  if (typeof getCurrentResource() === 'undefined') {
    return query;
  } else {
    // replace special Template: prefix which is not substitued by the NS service
    const contextResource = getCurrentResource().value.startsWith('Template:')
      ? '<' + getCurrentResource().value.substr('Template:'.length) + '>'
      : getCurrentResource().toString();
    return query.replace(/\?\?/g, contextResource).replace(
        /\$_this/g, contextResource
    );
  }
}

function decodeLegacyVars(query: string): string {
  return query.replace(/\?____/g, '?:');
}

function encodeLegacyVars(query: string): string {
  return query.replace(/\?:/g, '?____');
}

export function randomVariableName(): string {
  return '_' + Math.random().toString(36).substring(7);
}

/**
 * @see https://lucene.apache.org/core/2_9_4/queryparsersyntax.html
 */
const LUCENE_ESCAPE_REGEX = /([+\-&|!(){}\[\]^"~*?:\\])/g;

/**
 * Create a Lucene full text search query from a user input by
 * splitting it on whitespaces and escaping any special characters.
 */
export function makeLuceneQuery(inputText: string): Rdf.Literal {
  const words = inputText.split(' ')
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(w => w.replace(LUCENE_ESCAPE_REGEX, '\\$1'))
    .map(w => w + '*').join(' ');
  return Rdf.literal(words);
}

export function parsePatterns(
  patterns: string, prefixes?: { [prefix: string]: string }
): SparqlJs.Pattern[] {
  const wrappedPattern = `SELECT * WHERE { ${patterns} }`;
  const parser = prefixes
    ? new SparqlJs.Parser(prefixes)
    : Parser;
  const query = parser.parse(
    encodeLegacyVars(replaceQueryParams(wrappedPattern))
  ) as SparqlJs.SelectQuery;
  return query.where;
}

export function parsePropertyPath(propertyPath: string): SparqlJs.Term | SparqlJs.PropertyPath {
  const query = Parser.parse(`SELECT * WHERE { ?s ${propertyPath} ?o }`);
  if (query.type === 'query' && query.where.length === 1) {
    const pattern = query.where[0];
    if (pattern.type === 'bgp' && pattern.triples.length === 1) {
      const iriOrPath = pattern.triples[0].predicate;
      if (!isTerm(iriOrPath) || isIri(iriOrPath)) {
        return iriOrPath;
      }
    }
  }
  throw new Error(`Invalid Sparql property path: '${propertyPath}'`);
}

/**
 * Checks if SPARQL SELECT result is empty. With workaround for blazegraph bug
 * when empty result have one empty binding.
 * e.g for query like 'SELECT ?s ?p ?o WHERE { }'
 */
export function isSelectResultEmpty(result: {results: {bindings: {}[]}}): boolean {
  const bindings = result.results.bindings;
  return _.isEmpty(bindings) || bindings.length === 1 && _.isEmpty(bindings[0]);
}

/**
 * Resolves prefixed IRIs to full ones using platform-wide registered prefixes.
 * If an IRI is already in a full form, it would be returned as is.
 */
export function resolveIris(iris: string[]): Rdf.Iri[] {
  if (iris.length === 0) { return []; }
  const serializedIris = iris.map(iri => `(${iri})`).join(' ');
  // using initialized Sparql.js parser to resolve IRIs
  const parsed = parseQuery<SparqlJs.SelectQuery>(
    `SELECT * WHERE {} VALUES (?iri) { ${serializedIris} }`);
  return parsed.values.map(row => Rdf.iri(row['?iri']));
}

// see SPARQL 1.1 grammar for all allowed characters:
// https://www.w3.org/TR/sparql11-query/#rPN_LOCAL
const IRI_LOCAL_PART = /^[a-zA-Z][\\-_a-zA-Z0-9]*$/;

// TODO: move to NamespaceService
export function compactIriUsingPrefix(iri: Rdf.Iri): string {
  const iriValue = iri.value;
  for (const prefix in RegisteredPrefixes) {
    if (!RegisteredPrefixes.hasOwnProperty(prefix)) { continue; }
    const expandedPrefix = RegisteredPrefixes[prefix];
    if (iriValue.startsWith(expandedPrefix)) {
      const localPart = iriValue.substring(expandedPrefix.length, iriValue.length);
      if (IRI_LOCAL_PART.test(localPart)) {
        return prefix + ':' + localPart;
      }
    }
  }
  return `<${iriValue}>`;
}
