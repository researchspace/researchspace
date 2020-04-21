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

import { expect } from 'chai';

import { Rdf, vocabularies } from 'platform/api/rdf';
const xsd = vocabularies.xsd;

describe('RDF', () => {
  describe('utils', () => {
    it('parse full IRI', () => {
      const iri = Rdf.fullIri('<http://example.com>');
      expect(iri.value).to.be.equal('http://example.com');
    });

    it('throws error when try to parse full IRI which is not enclosed in <>', () => {
      const iri = () => Rdf.fullIri('http://example.com');
      expect(iri).to.throw(Error);
    });
  });

  describe('Node', () => {
    const pairsOfEqualNodes: [Rdf.Node, Rdf.Node][] = [
      [Rdf.iri('some:iri'), Rdf.iri('some:iri')],
      [Rdf.literal('42', xsd.integer), Rdf.literal('42', xsd.integer)],
      [Rdf.langLiteral('42', 'en'), Rdf.langLiteral('42', 'en')],
    ];

    const pairsOfUnequalNodes: [Rdf.Node, Rdf.Node][] = [
      [Rdf.iri('some:iri'), Rdf.iri('some:other-iri')],
      [Rdf.iri('some:iri'), Rdf.literal('some:iri')],
      [Rdf.iri('some:iri'), Rdf.langLiteral('some:iri', 'en')],
      [Rdf.literal('hello'), Rdf.literal('world')],
      [Rdf.literal('42', xsd.integer), Rdf.literal('42', xsd.double)],
      [Rdf.literal('42', xsd.integer), Rdf.literal('42')],
      [Rdf.literal('foo'), Rdf.langLiteral('foo', 'en')],
      [Rdf.langLiteral('hello', 'en'), Rdf.langLiteral('world', 'en')],
      [Rdf.langLiteral('bar', 'en'), Rdf.langLiteral('bar', 'ru')],
    ];

    const pairsOfFalseComparisons: [Rdf.Node, any][] = [
      [Rdf.iri('foo:foo'), 'foo:foo'],
      [Rdf.iri('foo:foo'), { value: 'foo:foo' }],
      [Rdf.literal('foo'), 'foo'],
      [Rdf.literal('42', xsd.integer), 42],
      [Rdf.literal(true), true],
      [Rdf.langLiteral('bar', 'en'), {}],
    ];

    it('equals to same node is correct, reflexive and symmetric', () => {
      for (const [first, second] of pairsOfEqualNodes) {
        expect(first.equals(first) && second.equals(second)).to.be.equal(
          true,
          `${first} and ${second} should be equal to itself`
        );
        expect(first.equals(second) && second.equals(first)).to.be.equal(
          true,
          `${first} should be equal to ${second} (and in reverse too)`
        );
      }
    });

    it('equal nodes has same hashCode', () => {
      for (const [first, second] of pairsOfEqualNodes) {
        expect(first.hashCode()).to.be.equal(
          second.hashCode(),
          `Hashcode of equal nodes ${first} and ${second} must match`
        );
      }
    });

    it('different nodes are unequal', () => {
      for (const [first, second] of pairsOfUnequalNodes) {
        expect(first.equals(second)).to.be.equal(false, `${first} should not equals ${second}`);
        expect(second.equals(first)).to.be.equal(false, `${first} should not equals ${second}`);
      }
    });

    it('never equals to a non-Node', () => {
      for (const [node, other] of pairsOfFalseComparisons) {
        expect(node.equals(other)).to.be.equal(
          false,
          `Node ${node} should not equals to non-Node value ${JSON.stringify(other)}`
        );
      }
    });
  });
});
