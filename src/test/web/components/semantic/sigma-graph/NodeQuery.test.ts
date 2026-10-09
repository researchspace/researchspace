/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import * as SparqlJs from 'sparqljs';
import { iri } from 'platform/api/rdf/core/Rdf';
import { VariableBinder } from 'platform/api/sparql/QueryBinder';
import { getNodeQueryContext } from 'platform/components/semantic/sigma-graph/NodeQuery';

describe('Sigma node-query binding', () => {
    ['?', '$'].forEach(sigil => {
        it('binds ' + sigil + 'subject without changing longer variables, literals or IRIs', () => {
            const parser = new SparqlJs.Parser({ ex: 'http://example.org/' });
            const query = parser.parse(`CONSTRUCT {
                ${sigil}subject ex:label ?subjectLabel .
                ${sigil}subject ex:note "?subject $subject" .
                ${sigil}subject ex:link <http://example.org/?subject> .
            } WHERE {
                # ?subjectLabel and $subject in a comment must not be substituted
                ${sigil}subject ex:label ?subjectLabel .
                OPTIONAL { ${sigil}subject ex:next ?subject2 }
                FILTER(?subjectLabel != "literal ?subject")
            }`) as SparqlJs.ConstructQuery;
            const context = getNodeQueryContext('<http://example.org/a>');
            // This is the same visitor used by SparqlClient for context.bindings.
            new VariableBinder(context.bindings).sparqlQuery(query);
            const expected = parser.parse(`CONSTRUCT {
                ex:a ex:label ?subjectLabel .
                ex:a ex:note "?subject $subject" .
                ex:a ex:link <http://example.org/?subject> .
            } WHERE {
                ex:a ex:label ?subjectLabel .
                OPTIONAL { ex:a ex:next ?subject2 }
                FILTER(?subjectLabel != "literal ?subject")
            }`);
            assert.deepEqual(query, expected);
            assert.doesNotThrow(() => parser.parse(new SparqlJs.Generator().stringify(query)));
        });
    });
    it('preserves repository, graph and other bindings without mutating the page context', () => {
        const context = {
            repository: 'test', defaultGraphs: ['http://example.org/graph'],
            bindings: { subject: iri('http://example.org/old'), other: iri('http://example.org/other') },
        };
        const result = getNodeQueryContext('<http://example.org/new>', context);
        assert.equal(result.repository, context.repository);
        assert.deepEqual(result.defaultGraphs, context.defaultGraphs);
        assert.equal(result.bindings.other, context.bindings.other);
        assert.equal(result.bindings.subject.value, 'http://example.org/new');
        assert.equal(context.bindings.subject.value, 'http://example.org/old');
        assert.notEqual(result.bindings, context.bindings);
    });
    it('does not treat literals or result-scoped blank nodes as resource IRIs', () => {
        ['_:b1', '"label"', '"label"@en', '', 'not an IRI'].forEach(node =>
            assert.isUndefined(getNodeQueryContext(node)));
    });
});
