/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { MultiDirectedGraph } from 'graphology';
import { Attributes } from 'graphology-types';
import { SigmaGraphConfig } from './Config';

interface GroupEdge {
    key: string;
    source: string;
    target: string;
    attributes: Attributes;
}
export interface GroupChild {
    node: string;
    attributes: Attributes;
    edges: GroupEdge[];
}
interface Group {
    source: string;
    predicate: any;
    children: Map<string, GroupChild>;
}

const derivedEdgeKey = (edge: string, source: string, target: string) =>
    'sigma-group-member:' + JSON.stringify([edge, source, target]);

function groupEdgeLabel(children: GroupChild[]): string {
    const labels = new Set<string>();
    children.forEach(child => child.edges.forEach(edge => {
        if (typeof edge.attributes.label === 'string') labels.add(edge.attributes.label);
    }));
    return Array.from(labels).join(' ');
}

function updateGroupLabel(graph: MultiDirectedGraph, node: string, children: GroupChild[]) {
    const types = graph.getNodeAttribute(node, 'typeLabels');
    const prefix = (Array.isArray(types) ? Array.from(new Set(types)).join(', ') : types) || 'Group';
    graph.setNodeAttribute(node, 'label', prefix + ' (' + children.length + ')');
    const edge = 'sigma-group-edge:' + node;
    if (graph.hasEdge(edge)) graph.setEdgeAttribute(edge, 'label', groupEdgeLabel(children));
}

/** Keep original relationships in each child so grouping is reversible. */
export function applyGroupingToGraph(graph: MultiDirectedGraph, props: SigmaGraphConfig): MultiDirectedGraph {
    const groups = new Map<string, Group>();
    const types = new Map<string, any[]>();
    graph.forEachNode((node, attributes) => {
        types.set(node, (Array.isArray(attributes.types) ? attributes.types : [])
            .map(type => type && typeof type === 'object' ? type.value : type).sort());
    });
    graph.forEachEdge((edge, attributes, source, target) => {
        const predicate = attributes.predicate;
        const predicateValue = predicate && typeof predicate === 'object' ? predicate.value : predicate;
        const key = 'sigma-group:' + JSON.stringify([source, types.get(target), predicateValue]);
        let group = groups.get(key);
        if (!group) {
            group = { source, predicate, children: new Map() };
            groups.set(key, group);
        }
        let child = group.children.get(target);
        if (!child) {
            child = { node: target, attributes: { ...graph.getNodeAttributes(target) }, edges: [] };
            group.children.set(target, child);
        }
        child.edges.push({ key: edge, source, target, attributes: { ...attributes } });
    });

    const grouped = new MultiDirectedGraph();
    const addNode = (node: string) => {
        if (!grouped.hasNode(node)) grouped.addNode(node, { ...graph.getNodeAttributes(node) });
    };
    // Includes isolated nodes, which never occur in an incoming-edge group.
    graph.forEachNode(node => { if (graph.inDegree(node) === 0) addNode(node); });
    groups.forEach((group, key) => {
        addNode(group.source);
        const children = Array.from(group.children.values());
        if (children.length < (props.grouping?.threshold ?? 3)) {
            children.forEach(child => {
                addNode(child.node);
                child.edges.forEach(edge => grouped.addEdgeWithKey(
                    edge.key, edge.source, edge.target, { ...edge.attributes }
                ));
            });
            return;
        }

        const first = children[0].attributes;
        grouped.addNode(key, {
            grouped: true, children, typeLabels: first.typeLabels,
            size: (props.sizes?.nodes ?? 10) * 1.5, color: first.color,
            x: Number.isFinite(first.x) ? first.x : Math.random(),
            y: Number.isFinite(first.y) ? first.y : Math.random(),
        });
        updateGroupLabel(grouped, key, children);
        grouped.addEdgeWithKey('sigma-group-edge:' + key, group.source, key, {
            label: groupEdgeLabel(children), predicate: group.predicate,
            size: props.sizes?.edges ?? 5, color: props.colours?.edge || '#aaa',
        });
    });
    return grouped;
}

function addChild(graph: MultiDirectedGraph, groupNode: string, child: GroupChild) {
    if (graph.hasNode(child.node)) return;
    const group = graph.getNodeAttributes(groupNode);
    const attributes = { ...child.attributes };
    // Preserve distinct child positions: putting every child at the group's
    // exact coordinates can leave a force layout unable to separate them.
    if (!Number.isFinite(attributes.x)) attributes.x = Number.isFinite(group.x) ? group.x : Math.random();
    if (!Number.isFinite(attributes.y)) attributes.y = Number.isFinite(group.y) ? group.y : Math.random();
    graph.addNode(child.node, attributes);
}

function addChildEdges(graph: MultiDirectedGraph, groupNode: string, child: GroupChild, replace: boolean) {
    child.edges.forEach(edge => {
        const source = replace ? edge.source : groupNode;
        const key = replace ? edge.key : derivedEdgeKey(edge.key, groupNode, child.node);
        if (!graph.hasEdge(key)) graph.addEdgeWithKey(key, source, child.node, { ...edge.attributes });
    });
}

/** Replace restores original edges; expand draws distinct group-to-child edges. */
export function expandGroup(graph: MultiDirectedGraph, groupNode: string, mode: 'expand' | 'replace') {
    const children: GroupChild[] = graph.getNodeAttribute(groupNode, 'children') || [];
    children.forEach(child => addChild(graph, groupNode, child));
    children.forEach(child => addChildEdges(graph, groupNode, child, mode === 'replace'));
    if (mode === 'replace') graph.dropNode(groupNode);
}

export function releaseNodeFromGroup(graph: MultiDirectedGraph, childNode: string, groupNode: string) {
    const children: GroupChild[] = graph.getNodeAttribute(groupNode, 'children') || [];
    const child = children.find(entry => entry.node === childNode);
    if (!child) return;
    addChild(graph, groupNode, child);
    addChildEdges(graph, groupNode, child, true);
    child.edges.forEach(edge => {
        const key = derivedEdgeKey(edge.key, groupNode, childNode);
        if (graph.hasEdge(key)) graph.dropEdge(key);
    });
    const remaining = children.filter(entry => entry.node !== childNode);
    graph.setNodeAttribute(groupNode, 'children', remaining);
    updateGroupLabel(graph, groupNode, remaining);
}

/** Merge metadata too: a later query can extend an already visible group. */
export function mergeGroupChildren(graph: MultiDirectedGraph, node: string, incoming: GroupChild[]) {
    const existing: GroupChild[] = graph.getNodeAttribute(node, 'children') || [];
    const children = new Map(existing.map(child => [child.node, {
        ...child, edges: child.edges.slice(),
    }] as [string, GroupChild]));
    incoming.forEach(child => {
        const previous = children.get(child.node);
        if (!previous) children.set(child.node, { ...child, edges: child.edges.slice() });
        else {
            const keys = new Set(previous.edges.map(edge => edge.key));
            child.edges.forEach(edge => {
                if (!keys.has(edge.key)) { previous.edges.push(edge); keys.add(edge.key); }
            });
        }
    });
    const merged = Array.from(children.values());
    graph.setNodeAttribute(node, 'children', merged);
    updateGroupLabel(graph, node, merged);
}

export function cleanGraph(graph: MultiDirectedGraph) {
    graph.nodes().forEach(node => {
        if (!graph.getNodeAttribute(node, 'grouped')) return;
        const children: GroupChild[] = graph.getNodeAttribute(node, 'children') || [];
        if (children.length === 1) releaseNodeFromGroup(graph, children[0].node, node);
        if (children.length <= 1) graph.dropNode(node);
    });
}
