/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import { MultiDirectedGraph } from 'graphology';
import {
    applyGroupingToGraph, cleanGraph, expandGroup, releaseNodeFromGroup,
} from 'platform/components/semantic/sigma-graph/GraphGrouping';
import { mergeGraphs } from 'platform/components/semantic/sigma-graph/Common';

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
});
