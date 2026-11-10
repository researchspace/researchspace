/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest.reconciliation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

import org.eclipse.rdf4j.sail.SailException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Builds the value of the <code>queries</code> request parameter of the
 * <a href="https://www.w3.org/community/reports/reconciliation/CG-FINAL-specs-0.2-20230410/">
 * Reconciliation Service API</a>: a batch with a single reconciliation query,
 * <code>{"q0": {"query": ..., "type": ..., "limit": ..., "properties": [...]}}</code>.
 * <p>
 * Every {@link Input} has a target that says where its value goes:
 * <ul>
 * <li><code>query</code> - the text to reconcile, mandatory;</li>
 * <li><code>type</code>, <code>type_strict</code> - sent as strings;</li>
 * <li><code>limit</code> - sent as a number, must be a positive integer;</li>
 * <li><code>properties.&lt;pid&gt;</code> or any other name - sent as an element
 * of <code>properties</code>, <code>{"pid": ..., "v": ...}</code>, where
 * <code>v</code> is encoded according to the {@link ValueKind} of the
 * input.</li>
 * </ul>
 * Values are sent verbatim. Nothing here is specific to one service, e.g. it is
 * up to the service whether <code>"Person,Group"</code> is one type or two.
 * Inputs with blank values are left out.
 */
public final class ReconciliationQueryBuilder {

    /** Identifier of the only query in the batch, i.e. the key of its results in the response. */
    public static final String QUERY_ID = "q0";

    public static final String QUERY = "query";
    public static final String TYPE = "type";
    public static final String TYPE_STRICT = "type_strict";
    public static final String LIMIT = "limit";
    public static final String PROPERTY_PREFIX = "properties.";

    /** How the value of a property is represented in JSON. */
    public enum ValueKind {
        /** <code>"v": "value"</code> */
        STRING,
        /** <code>"v": 42</code> */
        NUMBER,
        /** <code>"v": true</code> */
        BOOLEAN,
        /** <code>"v": {"id": "value"}</code>, a reference to an entity known to the service */
        ENTITY
    }

    public static final class Input {
        private final String target;
        private final String value;
        private final ValueKind kind;

        public Input(String target, String value, ValueKind kind) {
            this.target = target;
            this.value = value;
            this.kind = kind;
        }

        public Input(String target, String value) {
            this(target, value, ValueKind.STRING);
        }
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ReconciliationQueryBuilder() {
    }

    public static String build(Collection<Input> inputs) throws SailException {
        String text = null;
        String type = null;
        String typeStrict = null;
        Integer limit = null;
        List<Input> properties = new ArrayList<>();

        for (Input input : inputs) {
            if (input.value == null || input.value.trim().isEmpty()) {
                continue;
            }
            switch (input.target) {
            case QUERY:
                text = input.value;
                break;
            case TYPE:
                type = input.value;
                break;
            case TYPE_STRICT:
                typeStrict = input.value;
                break;
            case LIMIT:
                limit = parseLimit(input.value);
                break;
            default:
                String pid = input.target.startsWith(PROPERTY_PREFIX)
                        ? input.target.substring(PROPERTY_PREFIX.length())
                        : input.target;
                properties.add(new Input(pid, input.value, input.kind));
            }
        }

        if (text == null) {
            throw new SailException("Reconciliation service requires a non-empty '" + QUERY + "' input");
        }

        ObjectNode query = MAPPER.createObjectNode();
        query.put(QUERY, text);
        if (type != null) {
            query.put(TYPE, type);
        }
        if (typeStrict != null) {
            query.put(TYPE_STRICT, typeStrict);
        }
        if (limit != null) {
            query.put(LIMIT, limit.intValue());
        }
        if (!properties.isEmpty()) {
            // inputs come from a hash map, sorted to make the request stable
            properties.sort(Comparator.comparing((Input p) -> p.target).thenComparing(p -> p.value));
            ArrayNode array = query.putArray("properties");
            for (Input property : properties) {
                ObjectNode node = array.addObject();
                node.put("pid", property.target);
                putValue(node, property);
            }
        }

        ObjectNode batch = MAPPER.createObjectNode();
        batch.set(QUERY_ID, query);
        try {
            return MAPPER.writeValueAsString(batch);
        } catch (JsonProcessingException e) {
            throw new SailException(e);
        }
    }

    private static int parseLimit(String value) {
        try {
            int limit = Integer.parseInt(value.trim());
            if (limit > 0) {
                return limit;
            }
        } catch (NumberFormatException e) {
            // reported below
        }
        throw new SailException("'" + LIMIT + "' input must be a positive integer, but was: " + value);
    }

    private static void putValue(ObjectNode node, Input property) {
        String value = property.value;
        switch (property.kind) {
        case NUMBER:
            try {
                node.put("v", new BigDecimal(value.trim()));
            } catch (NumberFormatException e) {
                throw new SailException("'" + property.target + "' input must be a number, but was: " + value);
            }
            break;
        case BOOLEAN:
            String normalized = value.trim();
            if ("true".equals(normalized) || "1".equals(normalized)) {
                node.put("v", true);
            } else if ("false".equals(normalized) || "0".equals(normalized)) {
                node.put("v", false);
            } else {
                throw new SailException("'" + property.target + "' input must be a boolean, but was: " + value);
            }
            break;
        case ENTITY:
            node.putObject("v").put("id", value);
            break;
        default:
            node.put("v", value);
        }
    }
}
