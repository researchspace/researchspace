/**
 * ResearchSpace
 * Copyright (C) 2024
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

import { expect } from 'chai';
import { OrderedMap } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import {
  buildPresetFacetAst,
} from 'platform/components/search/web-components/SemanticSearchFacet';
import { PresetFacetValueConfig } from 'platform/components/semantic/search/config/SearchConfig';
import * as Model from 'platform/components/semantic/search/data/search/Model';

describe('SemanticSearchFacet preset facets', () => {
  const relationIri = '<http://example.com/relation>'; // configuration-style IRI
  const presetValueIri = '<http://example.com/value>'; // configuration-style IRI

  function createCategory(iriValue: string, label: string): Model.Category {
    const tuple: SparqlClient.Binding = {};
    return {
      iri: Rdf.iri(iriValue),
      label,
      tuple,
    };
  }

  function createRelations(): Model.Relations {
    const domain = createCategory('http://example.com/domain', 'Domain');
    const range = createCategory('http://example.com/range', 'Range');
    const tuple: SparqlClient.Binding = {};
    const relationIriNode = Rdf.iri(relationIri.slice(1, -1));
    const key = Model.RelationKey.key({ iri: relationIriNode, domain: domain.iri, range: range.iri });
    const relation: Model.Relation = {
      iri: relationIriNode,
      label: 'related to',
      tuple,
      hasDomain: domain,
      hasRange: range,
      equals: (other) => other && other.iri.equals(relationIriNode),
      hashCode: () => key.hashCode(),
    };

    return OrderedMap<Model.RelationKey.Key, Model.Relation>().set(key, relation);
  }

  it('builds resource preset ast when relation exists', () => {
    const relations = createRelations();
    const preset: PresetFacetValueConfig = {
      relation: relationIri,
      value: presetValueIri,
      label: 'Preset Resource',
    };

    const ast = buildPresetFacetAst([preset], relations);
    expect(ast).to.exist;
    const conjunct = ast!.conjuncts[0];
    expect(conjunct.relation.iri.value).to.equal('http://example.com/relation');

    const disjunct = conjunct.disjuncts[0];
    expect(disjunct.kind).to.equal(Model.EntityDisjunctKinds.Resource);
    const resource = disjunct.value as Model.Resource;
    expect(resource.iri.value).to.equal('http://example.com/value');
    expect(resource.label).to.equal('Preset Resource');
  });

  it('builds literal preset ast when literal kind is specified', () => {
    const relations = createRelations();
    const preset: PresetFacetValueConfig = {
      relation: relationIri,
      value: 'Example literal',
      kind: 'literal',
      language: 'en',
    };

    const ast = buildPresetFacetAst([preset], relations);
    expect(ast).to.exist;
    const disjunct = ast!.conjuncts[0].disjuncts[0];
    expect(disjunct.kind).to.equal(Model.LiteralDisjunctKind);
    const literalValue = (disjunct.value as Model.Literal).literal;
    expect(literalValue.value).to.equal('Example literal');
    expect(literalValue.language).to.equal('en');
  });

  it('returns undefined when relation cannot be resolved', () => {
    const relations = createRelations();
    const preset: PresetFacetValueConfig = {
      relation: '<http://example.com/missing>',
      value: presetValueIri,
    };

    const ast = buildPresetFacetAst([preset], relations);
    expect(ast).to.be.undefined;
  });

  it('builds multiple presets when more than one relation configured', () => {
    const relations = createRelations();
    const secondRelationIri = '<http://example.com/another-relation>';
    const domain = createCategory('http://example.com/domain2', 'Domain 2');
    const range = createCategory('http://example.com/range2', 'Range 2');
    const tuple: SparqlClient.Binding = {};
    const secondRelationNode = Rdf.iri(secondRelationIri.slice(1, -1));
    const secondKey = Model.RelationKey.key({ iri: secondRelationNode, domain: domain.iri, range: range.iri });
    const secondRelation: Model.Relation = {
      iri: secondRelationNode,
      label: 'another relation',
      tuple,
      hasDomain: domain,
      hasRange: range,
      equals: (other) => other && other.iri.equals(secondRelationNode),
      hashCode: () => secondKey.hashCode(),
    };
    const relationsWithSecond = relations.set(secondKey, secondRelation);

    const presets: PresetFacetValueConfig[] = [
      { relation: relationIri, value: presetValueIri, label: 'First' },
      { relation: secondRelationIri, value: '<http://example.com/value2>', label: 'Second' },
    ];

    const ast = buildPresetFacetAst(presets, relationsWithSecond);
    expect(ast).to.exist;
    expect(ast!.conjuncts).to.have.lengthOf(2);
    const [first, second] = ast!.conjuncts;
    expect((first.disjuncts[0].value as Model.Resource).label).to.equal('First');
    expect(second.relation.iri.value).to.equal('http://example.com/another-relation');
  });
});
