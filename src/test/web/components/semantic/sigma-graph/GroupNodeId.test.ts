/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import { MultiDirectedGraph } from 'graphology';
import * as Handlebars from 'handlebars';
import * as he from 'he';
import { GenericFunctions } from 'platform/api/services/template/functions/GenericFunctions';
import {
    applyGroupingToGraph, expandGroup, releaseNodeFromGroup, resolveScatterRequest,
} from 'platform/components/semantic/sigma-graph/GraphGrouping';
import {
    createGroupNodeId, isGroupNodeId, sha256Hex, toGraphNodeKey, toPlainIri,
} from 'platform/components/semantic/sigma-graph/GroupId';

const sourceIri = "https://example.org/collection/O'Brien?label=Zürich&value=%3A!()*#項目";
const source = '<' + sourceIri + '>';
const predicateIri = 'http://www.cidoc-crm.org/cidoc-crm/P67_refers_to';
const predicate = '<' + predicateIri + '>';
const types = [
    'http://www.cidoc-crm.org/cidoc-crm/E21_Person',
    'http://example.org/type/Ä',
];
const ID = /^sigma-group-[0-9a-f]{32}$/;
// Letters, digits and hyphens only: no HTML, JSON, CSS or URL syntax.
const SAFE = /^[A-Za-z][A-Za-z0-9-]*$/;

function fixture(root = source, edgePredicate: string = predicate) {
    const graph = new MultiDirectedGraph();
    graph.addNode(root, {});
    ['<http://example.org/a>', '<http://example.org/b>'].forEach((node, index) => {
        graph.addNode(node, {
            types: (index === 0 ? types : types.slice().reverse()).map(value => ({ value })),
            typeLabels: ['Person'], x: index, y: index,
        });
        graph.addEdgeWithKey('edge-' + index, root, node, { predicate: { value: edgePredicate } });
    });
    return graph;
}

function grouped(graph = fixture()) {
    const result = applyGroupingToGraph(graph, { grouping: { enabled: true, threshold: 2 } });
    const ids = result.filterNodes((_node, attributes) => !!attributes.grouped);
    assert.lengthOf(ids, 1);
    return { graph: result, id: ids[0] };
}

describe('Sigma SHA-256', () => {
    it('matches the FIPS 180-2 test vectors, including a two-block message', () => {
        assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        assert.equal(
            sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
            '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
        );
    });
    it('hashes the UTF-8 encoding of multi-block, non-ASCII input', () => {
        // Reference value from Node's crypto.createHash('sha256').
        assert.equal(
            sha256Hex('a'.repeat(1000) + 'Zürich 項目 😀'),
            '92ca0b5890fd3c9dfedbc34cf4d45e8587d0b982642eea85bb90d2f059ced259'
        );
    });
});

describe('Sigma group IDs', () => {
    it('are opaque, delimiter-free and safe as HTML ids and CSS identifiers', () => {
        const original = fixture();
        const before = JSON.stringify(original.export());
        const { graph, id } = grouped(original);
        assert.match(id, ID);
        assert.match(id, SAFE);
        assert.isTrue(isGroupNodeId(id));
        assert.equal(JSON.stringify(original.export()), before, 'grouping must not mutate the source graph');
        graph.edges().forEach(edge => {
            if (edge.startsWith('sigma-group')) assert.match(edge, SAFE);
        });
    });

    it('stay the same when type order changes or another child joins the group', () => {
        const original = fixture();
        const first = grouped(original).id;
        original.forEachNode((node, attributes) => {
            if (attributes.types) original.setNodeAttribute(node, 'types', attributes.types.slice().reverse());
        });
        const child = '<http://example.org/c>';
        original.addNode(child, { types: types.slice().reverse().map(value => ({ value })) });
        original.addEdgeWithKey('edge-2', source, child, { predicate: { value: predicate } });
        assert.equal(grouped(original).id, first);
    });

    it('differ for every distinct source, predicate or term representation', () => {
        const ids = [
            grouped().id,
            grouped(fixture(source.replace('%3A', ':'))).id,
            grouped(fixture(sourceIri)).id, // same text without angle brackets
            grouped(fixture(source, '<http://example.org/other>')).id,
            grouped(fixture('<http://example.org/\uD800>')).id, // lone surrogate
            grouped(fixture('<http://example.org/�>')).id, // its UTF-8 replacement
        ];
        assert.equal(new Set(ids).size, ids.length);
        ids.forEach(id => assert.match(id, ID));
    });

    it('depend only on the canonical identity key', () => {
        const key = JSON.stringify([source, types.slice().sort(), predicate]);
        assert.equal(grouped().id, createGroupNodeId(key));
    });
});

describe('Sigma group identity', () => {
    it('is exposed by name, as IRIs without angle brackets', () => {
        const { graph, id } = grouped();
        assert.deepEqual(graph.getNodeAttribute(id, 'group'), {
            source: sourceIri, types: types.slice().sort(), predicate: predicateIri,
        });
    });

    it('keeps blank nodes as they are and omits a missing predicate', () => {
        const graph = new MultiDirectedGraph();
        graph.addNode('_:b0', {});
        ['<http://example.org/a>', '<http://example.org/b>'].forEach((node, index) => {
            graph.addNode(node, { types: [] });
            graph.addEdgeWithKey('edge-' + index, '_:b0', node, {});
        });
        const { graph: result, id } = grouped(graph);
        assert.deepEqual(result.getNodeAttribute(id, 'group'), { source: '_:b0', types: [] });
    });

    it('survives persistence, and the ID still expands and releases its children', () => {
        const original = fixture();
        const { graph, id } = grouped(original);
        const restored = new MultiDirectedGraph();
        restored.import(JSON.parse(JSON.stringify(graph.export())));
        assert.deepEqual(restored.getNodeAttribute(id, 'group'), graph.getNodeAttribute(id, 'group'));
        expandGroup(restored, id, 'expand');
        releaseNodeFromGroup(restored, '<http://example.org/a>', id);
        expandGroup(restored, id, 'replace');
        assert.sameMembers(restored.nodes(), original.nodes());
        assert.sameMembers(restored.edges(), original.edges());
    });
});

describe('Sigma group IDs in templates', () => {
    const handlebars = Handlebars.create();
    handlebars.registerHelper({ ...GenericFunctions });

    it('round trip through naive and stringify JSON attributes', () => {
        const { id } = grouped();
        const render = handlebars.compile(
            `<mp-event-trigger id="{{componentId}}-{{id}}" ` +
            `data='{"id": "{{id}}", "mode": "expand"}' ` +
            `extra='{"id": {{stringify id}} }'></mp-event-trigger>`
        );
        const html = render({ id, componentId: 'graph' });
        assert.equal(/id="([^"]*)"/.exec(html)[1], 'graph-' + id, 'nothing to escape');
        assert.deepEqual(JSON.parse(he.decode(/data='([^']*)'/.exec(html)[1])), { id, mode: 'expand' });
        assert.deepEqual(JSON.parse(he.decode(/extra='([^']*)'/.exec(html)[1])), { id });
    });

    it('read group fields by name without parsing the ID', () => {
        const { graph, id } = grouped();
        const render = handlebars.compile(
            '{{#if group}}{"source": {{stringify group.source}}, "types": {{stringify group.types}}, ' +
            '"predicate": {{stringify group.predicate}} }{{/if}}'
        );
        assert.deepEqual(JSON.parse(he.decode(render({ id, group: graph.getNodeAttribute(id, 'group') }))), {
            source: sourceIri, types: types.slice().sort(), predicate: predicateIri,
        });
        assert.equal(render({ id: source }), '');
    });
});

describe('Sigma incoming event node keys', () => {
    it('use group IDs, blank nodes and literals as they are and bracket bare IRIs', () => {
        const { id } = grouped();
        assert.equal(toGraphNodeKey(' ' + id + ' '), id);
        assert.equal(toGraphNodeKey('http://example.org/a'), '<http://example.org/a>');
        assert.equal(toGraphNodeKey('<http://example.org/a>'), '<http://example.org/a>');
        assert.equal(toGraphNodeKey('sigma-group-not-a-hash'), '<sigma-group-not-a-hash>');
        assert.equal(toGraphNodeKey('_:b0'), '_:b0');
        assert.equal(toGraphNodeKey('"foo"@en'), '"foo"@en');
        assert.equal(toPlainIri('<x>'), 'x');
        assert.equal(toPlainIri('_:b0'), '_:b0');
    });

    it('honour the ScatterGroupNode mode, defaulting to replace and ignoring unknown modes', () => {
        const { graph, id } = grouped();
        assert.deepEqual(resolveScatterRequest(graph, { id, mode: 'expand' }), { node: id, mode: 'expand' });
        assert.deepEqual(resolveScatterRequest(graph, { id }), { node: id, mode: 'replace' });
        const warn = console.warn;
        const warnings: any[] = [];
        console.warn = (...args: any[]) => { warnings.push(args); };
        try {
            assert.isUndefined(resolveScatterRequest(graph, { id, mode: 'Expand' }));
        } finally {
            console.warn = warn;
        }
        assert.lengthOf(warnings, 1);
        assert.isTrue(graph.hasNode(id), 'an unknown mode must not remove the group');
    });

    it('ignore ScatterGroupNode requests for resource nodes, which replace would delete', () => {
        const { graph } = grouped();
        assert.isUndefined(resolveScatterRequest(graph, undefined));
        assert.isUndefined(resolveScatterRequest(graph, { id: '<http://example.org/missing>' }));
        assert.isUndefined(resolveScatterRequest(graph, { id: source, mode: 'replace' }));
        assert.isTrue(graph.hasNode(source));
    });
});
