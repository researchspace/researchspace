/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { cloneDeep } from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, VariableBinder, VariableRenameBinder, PatternBinder } from 'platform/api/sparql';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { ComplexTreePatterns } from './SemanticTreeInput';

export interface LightwightTreePatterns {
  /**
   * Binds to `?__scheme__` variable in the `schemePattern`
   */
  scheme?: string;
  /**
   * Input bindings: `?__scheme__`
   * Output bindings: `?item`
   */
  schemePattern?: string;
  /**
   * Output bindings: `?item`, `?parent`
   */
  relationPattern?: string;

  /**
   * Input bindings: `?item`
   * Output bindings: `?order`
   */
  orderByPattern?: string;

  /**
   * Input bindings: `?item`
   * Output bindings: `?label`
   */
  labelPattern?: string;
}

export const DefaultLightweightPatterns = {
  schemePattern: '?item <http://www.w3.org/2004/02/skos/core#inScheme> ?__scheme__',
  relationPattern: '?item <http://www.w3.org/2004/02/skos/core#broader> ?parent',
  orderByPattern: 'BIND(?label as ?order) .'
};

export function createDefaultTreeQueries(params: LightwightTreePatterns = {}): ComplexTreePatterns {
  const { labelPropertyPattern } = ConfigHolder.getUIConfig();
  const {
    schemePattern = DefaultLightweightPatterns.schemePattern,
    relationPattern = DefaultLightweightPatterns.relationPattern,
    orderByPattern = DefaultLightweightPatterns.orderByPattern,
    labelPattern = `?item ${labelPropertyPattern} ?label .`
  } = params;

  const prefixes = SparqlUtil.parseQuery('SELECT * WHERE {}').prefixes;
  const relation =
    typeof relationPattern === 'string' ? SparqlUtil.parsePatterns(relationPattern, prefixes) : relationPattern;
  const orderBy = SparqlUtil.parsePatterns(orderByPattern, prefixes);
  const label = SparqlUtil.parsePatterns(labelPattern, prefixes);

  let scheme: ReadonlyArray<SparqlJs.Pattern> = [];
  if (params.scheme || params.schemePattern) {
    scheme = SparqlUtil.parsePatterns(schemePattern, prefixes);
    if (params.scheme) {
      const schemeIri = Rdf.iri(params.scheme);
      const binder = new VariableBinder({ __scheme__: schemeIri });
      scheme.forEach((p) => binder.pattern(p));
    }
  }

  const patterns = { relation, scheme, orderBy, label };
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
  /** Output bindings: `?order` */
  orderBy: ReadonlyArray<SparqlJs.Pattern>;
  /** Output bindings: `?label` */
  label?: ReadonlyArray<SparqlJs.Pattern>;
}

function createRootsQuery({ relation, scheme, orderBy, label }: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    SELECT DISTINCT ?item ?label ?hasChildren WHERE {
      FILTER(?__scheme__)
      FILTER NOT EXISTS { { FILTER(?__relation__) } }
      FILTER(?__label__)
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(bound(?child) as ?hasChildren)
      OPTIONAL {
        FILTER(?__orderBy__)
      }
    } ORDER BY ?order ?label
  `);
  const childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  new PatternBinder('__orderBy__', orderBy).sparqlQuery(query);
  new PatternBinder('__label__', label).sparqlQuery(query);
  return query;
}

function createChildrenQuery({ relation, scheme, orderBy, label }: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    SELECT DISTINCT ?item ?label ?hasChildren WHERE {
      FILTER(?__relation__)
      FILTER(?__scheme__)
      FILTER(?__label__)
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(bound(?child) as ?hasChildren)
      OPTIONAL {
        FILTER(?__orderBy__)
      }
    } ORDER BY ?order ?label
  `);
  const childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  new PatternBinder('__orderBy__', orderBy).sparqlQuery(query);
  new PatternBinder('__label__', label).sparqlQuery(query);
  return query;
}

function createParentsQuery({ relation, scheme, label }: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    select distinct ?item ?parent ?parentLabel where {
      FILTER(?__parentScheme__)
      FILTER(?__relation__)
      FILTER(?__label__)
    }
  `);
  const parentScheme = bindTreePatterns(scheme, { itemVar: 'parent' });
  const parentLabel = bindTreePatterns(label, { itemVar: 'parent', itemLabelVar: 'parentLabel' });
  new PatternBinder('__parentScheme__', parentScheme).sparqlQuery(query);
  new PatternBinder('__relation__', relation).sparqlQuery(query);
  new PatternBinder('__label__', parentLabel).sparqlQuery(query);
  return query;
}

function createSearchQuery({ relation, scheme, orderBy, label }: TreePatterns) {
  const query = SparqlUtil.parseQuery(`
    PREFIX bds: <http://www.bigdata.com/rdf/search#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT DISTINCT ?item ?label ?score ?hasChildren WHERE {
      FILTER(?__scheme__)
      FILTER(?__label__)
      ?label bds:search ?__token__ ;
            bds:minRelevance "0.3" ;
            bds:relevance ?score ;
            bds:matchAllTerms "true"  .
      OPTIONAL { FILTER(?__childRelation__) }
      BIND(BOUND(?child) AS ?hasChildren)
      OPTIONAL {
        FILTER(?__orderBy__)
      }
    }
    ORDER BY DESC(?score) ?order ?label
    LIMIT 200
  `);
  const childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
  new PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
  new PatternBinder('__scheme__', scheme).sparqlQuery(query);
  new PatternBinder('__orderBy__', orderBy).sparqlQuery(query);
  new PatternBinder('__label__', label).sparqlQuery(query);
  return query;
}

function bindTreePatterns(
  treePattern: ReadonlyArray<SparqlJs.Pattern>,
  { itemVar, itemLabelVar, parentVar }: { itemVar: string; parentVar?: string; itemLabelVar?: string }
): SparqlJs.Pattern[] {
  const patternClone = cloneDeep(treePattern) as SparqlJs.Pattern[];

  if (itemVar !== 'item') {
    const sourceRenamer = new VariableRenameBinder('item', itemVar);
    patternClone.forEach((p) => sourceRenamer.pattern(p));
  }

  if (itemLabelVar && itemLabelVar !== 'label') {
    const sourceRenamer = new VariableRenameBinder('label', itemLabelVar);
    patternClone.forEach((p) => sourceRenamer.pattern(p));
  }

  if (parentVar && parentVar !== 'parent') {
    const targetRenamer = new VariableRenameBinder('parent', parentVar);
    patternClone.forEach((p) => targetRenamer.pattern(p));
  }

  return patternClone;
}
