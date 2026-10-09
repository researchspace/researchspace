/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { fullIri } from 'platform/api/rdf/core/Rdf';
import type { QueryContext } from 'platform/api/sparql/SparqlClient';

/** Bind through SparqlClient's parsed-query visitor, never by replacing text. */
export function getNodeQueryContext(node: string, context: QueryContext = {}): QueryContext | undefined {
    if (!node.startsWith('<') || !node.endsWith('>')) return undefined;
    return {
        ...context,
        bindings: { ...context.bindings, subject: fullIri(node) },
    };
}
