/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { cloneDeep } from 'lodash';

import { Rdf } from 'platform/api/rdf';
import {
  SparqlUtil, VariableBinder, VariableRenameBinder, PatternBinder,
} from 'platform/api/sparql';

import { ComplexTreePatterns } from './SemanticTreeInput';

export interface LightwightTreePatterns {
  /**
   * Binds to `?__scheme__` variable in the `schemePattern`
   */
  scheme?: string | Rdf.Iri;
  /**
   * Input bindings: `?__scheme__`
   * Output bindings: `?item`
   */
  schemePattern?: string | ReadonlyArray<SparqlJs.Pattern>;
  /**
   * Output bindings: `?item`, `?parent`
   */
  relationPattern?: string | ReadonlyArray<SparqlJs.Pattern>;
}

export const DefaultLightweightPatterns = {
  schemePattern: '?item <http://www.w3.org/2004/02/skos/core#inScheme> ?__scheme__',
  relationPattern: '?item <http://www.w3.org/2004/02/skos/core#broader> ?parent',
};

export function createDefaultTreeQueries(params: LightwightTreePatterns = {}): ComplexTreePatterns {
  const {
    schemePattern = DefaultLightweightPatterns.schemePattern,
    relationPattern = DefaultLightweightPatterns.relationPattern,
  } = params;

  const prefixes = SparqlUtil.parseQuery('SELECT * WHERE {}').prefixes;
  const relation = typeof relationPattern === 'string'
    ? SparqlUtil.parsePatterns(relationPattern, prefixes) : relationPattern;

  let scheme: ReadonlyArray<SparqlJs.Pattern> = [];
  if (params.scheme || params.schemePattern) {
    scheme = typeof schemePattern === 'string'
      ? SparqlUtil.parsePatterns(schemePattern, prefixes) : schemePattern;
    if (params.scheme) {
      const schemeIri = typeof params.scheme === 'string' ? Rdf.iri(params.scheme) : params.scheme;
      const binder = new VariableBinder({__scheme__: schemeIri});
      scheme.forEach(p => binder.pattern(p));
    }
  }

  const patterns = {relation, scheme};
  return {
    rootsQuery: SparqlUtil.serializeQuery(createRootsQuery(patterns)),
    childrenQuery: SparqlUtil.serializeQuery(createChildrenQuery(patterns)),
    parentsQuery: SparqlUtil.serializeQuery(createParentsQuery(patterns)),
    searchQuery: SparqlUtil.serializeQuery(createSearchQuery(patterns)),
  };
}

interface TreePatterns {
  /** Output bindings: `?item`, `?parent` */
  relation: ReadonlyArray<SparqlJs.Pattern>;
  /** Output bindings: `?item` */
  scheme: ReadonlyArray<SparqlJs.Pattern>;
}

function createRootsQuery({relation, scheme}: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    SELECT DISTINCT ?item ?label ?hasChildren WHERE {
      FILTER(?__scheme__)
      FILTER NOT EXISTS { { FILTER(?__relation__) } }
      ?item skos:prefLabel ?label .
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(bound(?child) as ?hasChildren)
    } ORDER BY ?label
  `);
  const childRelation = bindTreePatterns(relation, {itemVar: 'child', parentVar: 'item'});
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  return query;
}

function createChildrenQuery({relation, scheme}: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    SELECT DISTINCT ?item ?label ?hasChildren WHERE {
      FILTER(?__relation__)
      FILTER(?__scheme__)
      ?item skos:prefLabel ?label .
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(bound(?child) as ?hasChildren)
    } ORDER BY ?label
  `);
  const childRelation = bindTreePatterns(relation, {itemVar: 'child', parentVar: 'item'});
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  return query;
}

function createParentsQuery({relation, scheme}: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    select distinct ?item ?parent ?parentLabel where {
      FILTER(?__parentScheme__)
      FILTER(?__relation__)
      ?parent skos:prefLabel ?parentLabel .
    }
  `);
  const parentScheme = bindTreePatterns(scheme, {itemVar: 'parent'});
  new PatternBinder('__parentScheme__', parentScheme).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  return query;
}

function createSearchQuery({relation, scheme}: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    PREFIX bds: <http://www.bigdata.com/rdf/search#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT DISTINCT ?item ?label ?score ?hasChildren WHERE {
      FILTER(?__scheme__)
      ?item skos:prefLabel ?label.
      ?label bds:search ?__token__ ;
            bds:minRelevance "0.3" ;
            bds:relevance ?score ;
            bds:matchAllTerms "true"  .
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(BOUND(?child) AS ?hasChildren)
    }
    ORDER BY DESC(?score) ?label
    LIMIT 200
  `);
  const childRelation = bindTreePatterns(relation, {itemVar: 'child', parentVar: 'item'});
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  return query;
}

function bindTreePatterns(
  treePattern: ReadonlyArray<SparqlJs.Pattern>,
  {itemVar, parentVar}: { itemVar: string; parentVar?: string; },
): SparqlJs.Pattern[] {
  const patternClone = cloneDeep(treePattern) as SparqlJs.Pattern[];

  if (itemVar !== 'item') {
    const sourceRenamer = new VariableRenameBinder('item', itemVar);
    patternClone.forEach(p => sourceRenamer.pattern(p));
  }

  if (parentVar && parentVar !== 'parent') {
    const targetRenamer = new VariableRenameBinder('parent', parentVar);
    patternClone.forEach(p => targetRenamer.pattern(p));
  }

  return patternClone;
}
