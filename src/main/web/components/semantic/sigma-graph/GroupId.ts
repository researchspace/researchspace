/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * What a group stands for: the shared source node, the sorted child types and
 * the predicate. IRIs are given without angle brackets, as in the `nodes`
 * field of Sigma.NodeClicked; blank nodes and literals keep their own form.
 */
export interface SigmaGroupIdentity {
    source: string;
    types: string[];
    /**
     * Omitted when the grouped edges have no predicate.
     */
    predicate?: string;
}

export const GROUP_ID_PREFIX = 'sigma-group-';
const GROUP_ID_PATTERN = /^sigma-group-[0-9a-f]{32}$/;
// Changing this deliberately changes every group ID, e.g. if the grouping
// criteria change. Snapshots must then be invalidated in getGraphStorageKey.
const GROUP_ID_DOMAIN = 'sigma-group/v1\n';
const MEMBER_EDGE_DOMAIN = 'sigma-group-member/v1\n';

/**
 * Opaque, stable group node ID: `sigma-group-` and 32 lowercase hex digits
 * (the first 128 bits of SHA-256 of the group's canonical identity key).
 * It is a valid HTML id, CSS identifier, JSON string and URL component.
 * Read the group's fields from its `group` attribute, not from the ID.
 */
export function createGroupNodeId(identityKey: string): string {
    return GROUP_ID_PREFIX + sha256Hex(GROUP_ID_DOMAIN + identityKey).slice(0, 32);
}

export function isGroupNodeId(id: unknown): boolean {
    return typeof id === 'string' && GROUP_ID_PATTERN.test(id);
}

/** Key of the edge from a group's source to the group node. */
export const groupEdgeKey = (groupNode: string) => groupNode + '-edge';

/** Key of a synthetic group-to-child edge drawn in expand mode. */
export const derivedEdgeKey = (edge: string, source: string, target: string) =>
    'sigma-group-member-' + sha256Hex(MEMBER_EDGE_DOMAIN + JSON.stringify([edge, source, target])).slice(0, 32);

/** `<iri>` becomes `iri`; other terms are returned unchanged. */
export function toPlainIri(term: string): string {
    return term.length > 1 && term.charAt(0) === '<' && term.charAt(term.length - 1) === '>'
        ? term.substring(1, term.length - 1) : term;
}

/**
 * Graph key for a node named in an incoming event. Group IDs, blank nodes
 * (`_:b0`) and literals (`"text"@en`) are used as they are; bare IRIs are
 * wrapped in angle brackets.
 */
export function toGraphNodeKey(node: string): string {
    const raw = node.trim();
    if (isGroupNodeId(raw) || raw.startsWith('_:') || raw.charAt(0) === '"') return raw;
    return raw.charAt(0) === '<' && raw.charAt(raw.length - 1) === '>' ? raw : '<' + raw + '>';
}

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/**
 * Synchronous SHA-256 of the UTF-8 encoding of `text`, as lowercase hex.
 * Web Crypto is asynchronous, and grouping runs synchronously. Callers pass
 * JSON.stringify output, which escapes lone surrogates, so encoding is lossless.
 */
export function sha256Hex(text: string): string {
    const bytes = new TextEncoder().encode(text);
    const length = ((bytes.length + 9 + 63) >> 6) << 6;
    const data = new Uint8Array(length);
    data.set(bytes);
    data[bytes.length] = 0x80;
    const view = new DataView(data.buffer);
    view.setUint32(length - 8, Math.floor(bytes.length / 0x20000000));
    view.setUint32(length - 4, (bytes.length << 3) >>> 0);

    const h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const w = new Uint32Array(64);
    for (let offset = 0; offset < length; offset += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = w[i - 16] + s0 + w[i - 7] + s1;
        }
        let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
        for (let i = 0; i < 64; i++) {
            const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            hh = g; g = f; f = e; e = (d + t1) | 0;
            d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h[0] += a; h[1] += b; h[2] += c; h[3] += d;
        h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }
    let hex = '';
    for (let i = 0; i < 8; i++) hex += ('00000000' + h[i].toString(16)).slice(-8);
    return hex;
}
