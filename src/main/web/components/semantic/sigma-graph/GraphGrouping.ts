/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { MultiDirectedGraph } from 'graphology';
import { Attributes } from 'graphology-types';
import { SigmaGraphConfig } from './Config';
import {
    SigmaGroupIdentity, createGroupNodeId, derivedEdgeKey, groupEdgeKey, toPlainIri,
} from './GroupId';

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
    identity: SigmaGroupIdentity;
    children: Map<string, GroupChild>;
}

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
    const edge = groupEdgeKey(node);
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
        const targetTypes: string[] = types.get(target);
        // Canonical identity from the original RDF terms; hashed into the node ID below.
        const identityKey = JSON.stringify([source, targetTypes, predicateValue ?? null]);
        let group = groups.get(identityKey);
        if (!group) {
            const identity: SigmaGroupIdentity = {
                source: toPlainIri(source),
                types: targetTypes.map(type => toPlainIri(String(type))),
            };
            if (predicateValue != null) identity.predicate = toPlainIri(String(predicateValue));
            group = { source, predicate, identity, children: new Map() };
            groups.set(identityKey, group);
        }
        let child = group.children.get(target);
        if (!child) {
            child = { node: target, attributes: { ...graph.getNodeAttributes(target) }, edges: [] };
            group.children.set(target, child);
        }
        child.edges.push({ key: edge, source, target, attributes: { ...attributes } });
    });

    // Roots and every edge source are drawn on their own. A child that is drawn
    // anyway must not also be hidden in a group, and a group left with fewer
    // hidden children than the threshold is not formed. Not forming a group
    // draws its children, which can affect other groups: repeat until stable.
    const threshold = props.grouping?.threshold ?? 3;
    const drawn = new Set<string>();
    graph.forEachNode(node => {
        if (graph.inDegree(node) === 0 || graph.outDegree(node) > 0) drawn.add(node);
    });
    const formed = new Set(groups.keys());
    for (let changed = true; changed;) {
        changed = false;
        formed.forEach(identityKey => {
            const children = Array.from(groups.get(identityKey).children.keys());
            if (children.filter(child => !drawn.has(child)).length < threshold) {
                formed.delete(identityKey);
                children.forEach(child => drawn.add(child));
                changed = true;
            }
        });
    }

    const grouped = new MultiDirectedGraph();
    const addNode = (node: string) => {
        if (!grouped.hasNode(node)) grouped.addNode(node, { ...graph.getNodeAttributes(node) });
    };
    // Includes isolated nodes, which never occur in an incoming-edge group.
    graph.forEachNode(node => { if (graph.inDegree(node) === 0) addNode(node); });
    groups.forEach((group, identityKey) => {
        addNode(group.source);
        const all = Array.from(group.children.values());
        const children = formed.has(identityKey) ? all.filter(child => !drawn.has(child.node)) : [];
        all.filter(child => !children.includes(child)).forEach(child => {
            addNode(child.node);
            child.edges.forEach(edge => grouped.addEdgeWithKey(
                edge.key, edge.source, edge.target, { ...edge.attributes }
            ));
        });
        if (children.length === 0) return;

        const key = createGroupNodeId(identityKey);
        const first = children[0].attributes;
        grouped.addNode(key, {
            grouped: true, group: group.identity, children, typeLabels: first.typeLabels,
            size: (props.sizes?.nodes ?? 10) * 1.5, color: first.color,
            x: Number.isFinite(first.x) ? first.x : Math.random(),
            y: Number.isFinite(first.y) ? first.y : Math.random(),
        });
        updateGroupLabel(grouped, key, children);
        grouped.addEdgeWithKey(groupEdgeKey(key), group.source, key, {
            label: groupEdgeLabel(children), predicate: group.predicate,
            size: props.sizes?.edges ?? 5, color: props.colours?.edge || '#aaa',
        });
    });
    return grouped;
}

/**
 * Release group children that are drawn on their own, e.g. after a query
 * result added them. A child shown only because its group was expanded in
 * place stays with the group, unless `incoming` (the merged result) has it.
 */
export function releaseDrawnChildren(graph: MultiDirectedGraph, incoming?: MultiDirectedGraph) {
    const releases: Array<[string, string]> = [];
    graph.forEachNode((node, attributes) => {
        if (!attributes.grouped) return;
        (attributes.children || []).forEach((child: GroupChild) => {
            if (!graph.hasNode(child.node)) return;
            const expandedInPlace = child.edges.some(edge =>
                graph.hasEdge(derivedEdgeKey(edge.key, node, child.node)));
            if (!expandedInPlace || incoming?.hasNode(child.node)) releases.push([child.node, node]);
        });
    });
    releases.forEach(([child, group]) => detachChild(graph, child, group));
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
    // The children are drawn now, so other groups must not keep hiding them.
    releaseDrawnChildren(graph);
}

export function releaseNodeFromGroup(graph: MultiDirectedGraph, childNode: string, groupNode: string) {
    detachChild(graph, childNode, groupNode);
    releaseDrawnChildren(graph);
}

function detachChild(graph: MultiDirectedGraph, childNode: string, groupNode: string) {
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

/**
 * Validate a Sigma.ScatterGroupNode request. Only existing group nodes can be
 * scattered: expanding a resource node in replace mode would delete it.
 */
export function resolveScatterRequest(
    graph: MultiDirectedGraph, data: { id?: string; mode?: string } | undefined
): { node: string; mode: 'expand' | 'replace' } | undefined {
    const node = typeof data?.id === 'string' ? data.id.trim() : undefined;
    if (!node || !graph.hasNode(node) || !graph.getNodeAttribute(node, 'grouped')) return undefined;
    const mode = data.mode ?? 'replace';
    if (mode !== 'expand' && mode !== 'replace') {
        // Never fall back to replace, which removes the group node.
        console.warn(`Sigma.ScatterGroupNode: ignoring unknown mode "${mode}"; use "expand" or "replace".`);
        return undefined;
    }
    return { node, mode };
}

export function cleanGraph(graph: MultiDirectedGraph) {
    graph.nodes().forEach(node => {
        if (!graph.getNodeAttribute(node, 'grouped')) return;
        const children: GroupChild[] = graph.getNodeAttribute(node, 'children') || [];
        if (children.length === 1) releaseNodeFromGroup(graph, children[0].node, node);
        if (children.length <= 1) graph.dropNode(node);
    });
}
