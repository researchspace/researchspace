/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import { MultiDirectedGraph } from 'graphology';
import * as Kefir from 'kefir';
import { Rdf } from 'platform/api/rdf';
import {
    applyGroupingToGraph, cleanGraph, expandGroup, releaseNodeFromGroup,
} from 'platform/components/semantic/sigma-graph/GraphGrouping';
import {
    createGraphFromElements, mergeGraphs, withTypeLabels,
} from 'platform/components/semantic/sigma-graph/Common';

function fixture() {
    const graph = new MultiDirectedGraph();
    ['a', 'b', 'c', 'd', 'isolated'].forEach((node, i) => graph.addNode(node, {
        label: node, x: i, y: i, types: ['type'], typeLabels: ['Thing'],
    }));
    ['b', 'c', 'd'].forEach(node => {
        graph.addEdgeWithKey('p-' + node, 'a', node, { predicate: 'p', label: 'P ' + node, weight: 7 });
        graph.addEdgeWithKey('q-' + node, 'a', node, { predicate: 'q', label: 'Q ' + node, weight: 11 });
    });
    graph.addEdgeWithKey('p-b-2', 'a', 'b', { predicate: 'p', label: 'Second P', color: 'red' });
    return graph;
}
const groups = (graph: MultiDirectedGraph) => graph.filterNodes((_node, attrs) => !!attrs.grouped);
function assertEdgesEqual(actual: MultiDirectedGraph, expected: MultiDirectedGraph) {
    assert.sameMembers(actual.edges(), expected.edges());
    expected.forEachEdge((edge, attrs, source, target) => {
        assert.equal(actual.source(edge), source);
        assert.equal(actual.target(edge), target);
        assert.deepEqual(actual.getEdgeAttributes(edge), attrs);
    });
}
const group = (graph: MultiDirectedGraph, threshold = 3) =>
    applyGroupingToGraph(graph, { grouping: { enabled: true, threshold } });

describe('Sigma grouping preserves RDF relationships', () => {
    it('retains parallel predicates, original edge attributes and isolated nodes below the threshold', () => {
        const graph = fixture();
        graph.addEdgeWithKey('reverse', 'b', 'a', { predicate: 'p', label: 'reverse' });
        graph.addEdgeWithKey('loop', 'a', 'a', { predicate: 'p', label: 'loop' });
        const grouped = group(graph, 10);
        assert.sameMembers(grouped.nodes(), graph.nodes());
        assertEdgesEqual(grouped, graph);
    });
    it('counts distinct children rather than parallel edges towards the threshold', () => {
        const graph = fixture();
        graph.dropNode('c');
        graph.dropNode('d');
        assert.lengthOf(groups(group(graph, 2)), 0);
    });
    it('restores exact edge identities and attributes when replacing overlapping groups', () => {
        const graph = fixture();
        const before = JSON.stringify(graph.export());
        const grouped = group(graph);
        assert.lengthOf(groups(grouped), 2);
        groups(grouped).forEach(node => expandGroup(grouped, node, 'replace'));
        assert.sameMembers(grouped.nodes(), graph.nodes());
        graph.forEachNode((node, attributes) => assert.deepEqual(grouped.getNodeAttributes(node), attributes));
        assertEdgesEqual(grouped, graph);
        assert.equal(JSON.stringify(graph.export()), before, 'grouping must not mutate the source graph');
    });
    it('preserves parallel group-to-child edges in expand mode and is idempotent', () => {
        const grouped = group(fixture());
        const node = groups(grouped).find(n => grouped.getNodeAttribute(n, 'children')[0].edges[0].attributes.predicate === 'p');
        expandGroup(grouped, node, 'expand');
        const edges = grouped.outEdges(node, 'b');
        assert.lengthOf(edges, 2);
        assert.sameMembers(edges.map(edge => grouped.getEdgeAttribute(edge, 'label')), ['P b', 'Second P']);
        const size = grouped.size;
        expandGroup(grouped, node, 'expand');
        assert.equal(grouped.size, size);
    });
    it('restores every predicate when releasing the same child from several groups', () => {
        const graph = fixture();
        const grouped = group(graph);
        groups(grouped).forEach(node => releaseNodeFromGroup(grouped, 'b', node));
        assert.sameMembers(grouped.inEdges('b'), ['p-b', 'p-b-2', 'q-b']);
        groups(grouped).forEach(node => releaseNodeFromGroup(grouped, 'c', node));
        cleanGraph(grouped); // automatically releases each final child
        assert.lengthOf(groups(grouped), 0);
        assertEdgesEqual(grouped, graph);
    });
    it('removes synthetic membership edges on release after expand', () => {
        const graph = fixture();
        const grouped = group(graph);
        groups(grouped).forEach(node => {
            expandGroup(grouped, node, 'expand');
            releaseNodeFromGroup(grouped, 'b', node);
            assert.lengthOf(grouped.outEdges(node, 'b'), 0);
            expandGroup(grouped, node, 'replace');
        });
        assertEdgesEqual(grouped, graph);
    });
    it('survives a JSON persistence round trip before expansion', () => {
        const graph = fixture();
        const restored = new MultiDirectedGraph();
        restored.import(JSON.parse(JSON.stringify(group(graph).export())));
        groups(restored).forEach(node => expandGroup(restored, node, 'replace'));
        assertEdgesEqual(restored, graph);
    });
    it('retains new children and new parallel edges when merging an existing group', () => {
        const graph = fixture();
        const grouped = group(graph);
        graph.addNode('e', { types: ['type'], typeLabels: ['Thing'], x: 3, y: 3 });
        graph.addEdgeWithKey('p-e', 'a', 'e', { predicate: 'p', label: 'P e' });
        graph.addEdgeWithKey('p-b-3', 'a', 'b', { predicate: 'p', label: 'Third P' });
        mergeGraphs(grouped, group(graph));
        groups(grouped).forEach(node => expandGroup(grouped, node, 'replace'));
        assertEdgesEqual(grouped, graph);
    });
    it('does not duplicate original edges when an expansion returns an already grouped child', () => {
        const graph = fixture();
        const grouped = group(graph);
        const incoming = new MultiDirectedGraph();
        incoming.addNode('a', { x: 1, y: 1 });
        incoming.addNode('b', { x: 2, y: 2 });
        incoming.addEdgeWithKey('p-b', 'a', 'b', graph.getEdgeAttributes('p-b'));
        mergeGraphs(grouped, incoming);
        groups(grouped).forEach(node => expandGroup(grouped, node, 'replace'));
        assertEdgesEqual(grouped, graph);
    });
    it('keeps distinct type combinations separate even when their concatenation is identical', () => {
        const graph = new MultiDirectedGraph();
        graph.addNode('a', {});
        ['b', 'c', 'd', 'e'].forEach((node, index) => {
            graph.addNode(node, { types: index < 2 ? ['ab', 'c'] : ['a', 'bc'] });
            graph.addEdgeWithKey(node, 'a', node, { predicate: 'p' });
        });
        const grouped = group(graph, 2);
        assert.lengthOf(groups(grouped), 2);
        groups(grouped).forEach(node => expandGroup(grouped, node, 'replace'));
        assertEdgesEqual(grouped, graph);
    });
    it('never hides a child that is drawn on its own, and forms only groups that reach the threshold', () => {
        const graph = fixture();
        graph.addNode('e', { x: 9, y: 9 });
        graph.addEdgeWithKey('b-e', 'b', 'e', { predicate: 'r' });
        // b has an outgoing edge, so it is drawn: groups keep only c and d.
        const grouped = group(graph, 2);
        assert.lengthOf(groups(grouped), 2);
        groups(grouped).forEach(node => assert.sameMembers(
            grouped.getNodeAttribute(node, 'children').map((child: any) => child.node), ['c', 'd']));
        assert.sameMembers(grouped.edges('a', 'b'), ['p-b', 'p-b-2', 'q-b']);
        // With threshold 3, two hidden children are not enough for a group.
        assertEdgesEqual(group(graph, 3), graph);
    });
    it('keeps every node either drawn or in a group, never both, for arbitrary graphs', () => {
        let seed = 7;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let run = 0; run < 200; run++) {
            const graph = new MultiDirectedGraph();
            const size = 3 + Math.floor(random() * 8);
            for (let i = 0; i < size; i++) graph.addNode('n' + i, { types: [random() < 0.5 ? 't' : 'u'], x: i, y: i });
            for (let i = 0; i < size * 2; i++) {
                const source = 'n' + Math.floor(random() * Math.min(3, size));
                const target = 'n' + Math.floor(random() * size);
                graph.addEdge(source, target, { predicate: random() < 0.7 ? 'p' : 'q' });
            }
            const threshold = 2 + Math.floor(random() * 2);
            const grouped = group(graph, threshold);
            groups(grouped).forEach(node => {
                const children = grouped.getNodeAttribute(node, 'children');
                assert.isAtLeast(children.length, threshold);
                children.forEach((child: any) => assert.isFalse(grouped.hasNode(child.node), 'run ' + run));
            });
            groups(grouped).forEach(node => expandGroup(grouped, node, 'replace'));
            assertEdgesEqual(grouped, graph);
        }
    });
    it('releases children from other groups as soon as an expansion draws them', () => {
        const graph = fixture();
        const grouped = group(graph);
        const [p, q] = groups(grouped);
        expandGroup(grouped, p, 'expand');
        assert.isTrue(grouped.hasNode(p));
        assert.lengthOf(grouped.getNodeAttribute(q, 'children'), 0, 'b, c and d are drawn, so q no longer hides them');
        cleanGraph(grouped);
        assert.isFalse(grouped.hasNode(q));
        expandGroup(grouped, p, 'replace');
        assertEdgesEqual(grouped, graph);
    });
    it('keeps a group expanded in place when an unrelated result is merged', () => {
        const graph = fixture();
        const grouped = group(graph);
        const node = groups(grouped)[0];
        expandGroup(grouped, node, 'expand');
        cleanGraph(grouped);
        const edges = grouped.edges().length;
        const unrelated = new MultiDirectedGraph();
        unrelated.addNode('z', { x: 0, y: 0 });
        unrelated.addNode('y', { x: 1, y: 1 });
        unrelated.addEdgeWithKey('z-y', 'z', 'y', { predicate: 'r' });
        mergeGraphs(grouped, unrelated);
        cleanGraph(grouped);
        assert.isTrue(grouped.hasNode(node));
        assert.equal(grouped.edges().length, edges + 1);
        assert.isFalse(grouped.hasEdge('p-b') || grouped.hasEdge('p-b-2'), 'b stays attached to the expanded group');
    });
    it('releases an expanded child when a merged result contains it', () => {
        const graph = fixture();
        const grouped = group(graph);
        const node = groups(grouped).find(n => grouped.getNodeAttribute(n, 'children')[0].edges[0].attributes.predicate === 'p');
        expandGroup(grouped, node, 'expand');
        const incoming = new MultiDirectedGraph();
        incoming.addNode('b', { x: 0, y: 0 });
        mergeGraphs(grouped, incoming);
        // b was already drawn by the expansion, so the q group released it too.
        assert.sameMembers(grouped.inEdges('b').filter(edge => grouped.source(edge) === 'a'), ['p-b', 'p-b-2', 'q-b']);
        assert.lengthOf(grouped.outEdges(node, 'b'), 0);
    });
});

describe('Sigma type labels', () => {
    const type = Rdf.iri('http://example.org/vocab#Person');
    const other = Rdf.iri('http://example.org/vocab/Place/');
    const node = (id: string, types?: Rdf.Node[]) => ({
        group: 'nodes', data: { id, label: id, '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>': types },
    });
    const elements = () => [
        node('<a>'), node('<b>', [type]), node('<c>', [type]), node('<d>', [type, other]),
        ...['<b>', '<c>', '<d>'].map((target, i) => ({
            group: 'edges', data: { id: 'e' + i, source: '<a>', target, resource: '<p>' },
        })),
    ];
    it('labels groups with the fetched label of their type, falling back to the local name', () => {
        let requested: string[];
        let result: any[];
        withTypeLabels(elements(), undefined, iris => {
            requested = iris.map(iri => iri.value);
            return Kefir.constant(new Map([[iris[0], 'Person']]));
        }).onValue(value => { result = value; });
        assert.sameMembers(requested, [type.value, other.value], 'one request, no duplicates');
        assert.deepEqual(result.find(e => e.data.id === '<d>').data.typeLabels, ['Person', 'Place']);
        const grouped = createGraphFromElements(
            result.filter(e => e.data.id !== '<d>' && e.data.target !== '<d>'), { grouping: { enabled: true, threshold: 2 } });
        assert.equal(grouped.getNodeAttribute(groups(grouped)[0], 'label'), 'Person (2)');
    });
    it('does not call the label service when no node has a type', () => {
        let called = false;
        const input = [node('<a>'), node('<b>')];
        withTypeLabels(input, undefined, () => { called = true; return Kefir.constant(new Map()); })
            .onValue(value => assert.strictEqual(value, input));
        assert.isFalse(called);
    });
});
