/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.services.fields;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.google.common.collect.ImmutableMap;

import javax.annotation.Nullable;

import org.researchspace.data.json.JsonUtil;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.StreamSupport;

public class SearchConfigMerger {
    private final ObjectMapper mapper = JsonUtil.getDefaultObjectMapper();

    public ObjectNode mergeJson(ObjectNode base, ObjectNode override) {
        ObjectNode resultCategories = mapper.createObjectNode();
        assignPatternsMap(resultCategories, getAndCoerceToObject(base, "categories"));
        assignPatternsMap(resultCategories, getAndCoerceToObject(override, "categories"));

        ObjectNode resultRelations = mapper.createObjectNode();
        assignPatternsMap(resultRelations, getAndCoerceToObject(base, "relations"));
        assignPatternsMap(resultRelations, getAndCoerceToObject(override, "relations"));

        ObjectNode baseProfile = getAndCoerceToObject(base, "searchProfile");
        ObjectNode overrideProfile = getAndCoerceToObject(override, "searchProfile");
        ObjectNode resultProfile = mapper.createObjectNode();

        JsonNode profileCategories = mergeInlineProfileArrays(baseProfile.get("categories"),
                overrideProfile.get("categories"));
        if (profileCategories != null) {
            resultProfile.set("categories", profileCategories);
        }

        JsonNode profileRelations = mergeInlineProfileArrays(baseProfile.get("relations"),
                overrideProfile.get("relations"));
        if (profileRelations != null) {
            resultProfile.set("relations", profileRelations);
        }

        ObjectNode result = mapper.createObjectNode();
        Map<String, JsonNode> resultProps = ImmutableMap.of("categories", resultCategories, "relations",
                resultRelations, "searchProfile", resultProfile);
        result.setAll(resultProps);
        result.setAll(base.deepCopy().remove(resultProps.keySet()));
        result.setAll(override.deepCopy().remove(resultProps.keySet()));
        return result;
    }

    private ObjectNode getAndCoerceToObject(ObjectNode node, String key) {
        JsonNode value = node.has(key) ? node.get(key) : NullNode.getInstance();
        return JsonUtil.toObjectNode(value);
    }

    /**
     * Merge {@code Patterns} objects from {@code SearchConfig}.
     */
    private void assignPatternsMap(ObjectNode target, ObjectNode source) {
        for (Map.Entry<String, JsonNode> entry : JsonUtil.iterate(source)) {
            ArrayNode result = mapper.createArrayNode();

            String key = entry.getKey();
            JsonNode existing = target.has(key) ? target.get(key) : NullNode.getInstance();
            if (existing instanceof ArrayNode) {
                assignPatternsArray(result, (ArrayNode) existing);
            }

            JsonNode value = entry.getValue();
            if (value instanceof ArrayNode) {
                assignPatternsArray(result, (ArrayNode) value);
            }

            target.set(key, result);
        }
    }

    /**
     * Merge {@code PatternConfig[]} arrays from {@code SearchConfig}.
     */
    private void assignPatternsArray(ArrayNode target, ArrayNode source) {
        for (int i = 0; i < source.size(); i++) {
            JsonNode sourceItem = source.get(i);
            if (target.size() <= i) {
                target.add(sourceItem);
            } else {
                JsonNode targetItem = target.get(i);
                target.set(i, JsonUtil.shallowMerge(targetItem, sourceItem));
            }
        }
    }

    /**
     * Merge arrays from {@code InlineSearchProfileConfig}
     */
    private JsonNode mergeInlineProfileArrays(@Nullable JsonNode first, @Nullable JsonNode second) {
        if (first instanceof ArrayNode && second instanceof ArrayNode) {
            Map<String, ObjectNode> resultMap = new LinkedHashMap<>();
            assignInlineResources(resultMap, (ArrayNode) first);
            assignInlineResources(resultMap, (ArrayNode) second);

            ArrayNode result = mapper.createArrayNode();
            result.addAll(resultMap.values());
            return result;
        } else if (first instanceof ArrayNode) {
            return first;
        } else if (second instanceof ArrayNode) {
            return second;
        } else {
            return null;
        }
    }

    private void assignInlineResources(Map<String, ObjectNode> target, ArrayNode sourceProfileItems) {
        StreamSupport.stream(JsonUtil.iterate(sourceProfileItems).spliterator(), false)
                .filter(node -> node instanceof ObjectNode).map(node -> (ObjectNode) node)
                .filter(node -> node.get("iri") instanceof TextNode).forEach(node -> {
                    TextNode iriNode = (TextNode) node.get("iri");
                    String iri = iriNode.asText();
                    ObjectNode existing = target.get(iri);
                    if (existing == null) {
                        target.put(iri, node.deepCopy());
                    } else {
                        JsonUtil.assign(existing, node);
                    }
                });
    }
}
