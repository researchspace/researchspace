/**
 * ResearchSpace
 * Copyright (C) 2025, Pharos: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as Maybe from 'data.maybe';
import { Rdf } from 'platform/api/rdf';
import * as _ from 'lodash';

export class NamespaceService {
    private prefixMap: { [prefix: string]: string } = {};
    private nsMap: { [ns: string]: string } = {};

    public init(prefixes: { [prefix: string]: string }) {
        this.prefixMap = prefixes;
        this.nsMap = _.invert(prefixes);
    }

    public resolveToIRI(prefixedIri: string): Data.Maybe<Rdf.Iri> {
        if (prefixedIri.startsWith('<') && prefixedIri.endsWith('>')) {
            return Maybe.Just(Rdf.iri(prefixedIri.slice(1, -1)));
        }

        const parts = prefixedIri.split(':');
        if (parts.length === 2) {
            const [prefix, localPart] = parts;
            const namespace = this.prefixMap[prefix];
            if (namespace) {
                return Maybe.Just(Rdf.iri(namespace + localPart));
            }
        }

        // Fallback to default namespace for unqualified names
        const defaultNamespace = this.prefixMap[''] || this.prefixMap['Default'];
        if (defaultNamespace) {
            return Maybe.Just(Rdf.iri(defaultNamespace + prefixedIri));
        }

        return Maybe.Nothing();
    }

    public getPrefixedIRI(iri: Rdf.Iri): Data.Maybe<string> {
        const iriString = iri.value;
        for (const ns in this.nsMap) {
            if (iriString.startsWith(ns)) {
                const localPart = iriString.substring(ns.length);
                const prefix = this.nsMap[ns];
                // Basic check for valid local part characters
                if (/^[a-zA-Z0-9_-]*$/.test(localPart)) {
                    return Maybe.Just(`${prefix}:${localPart}`);
                }
            }
        }
        return Maybe.Nothing();
    }
}

export const namespaceService = new NamespaceService();
