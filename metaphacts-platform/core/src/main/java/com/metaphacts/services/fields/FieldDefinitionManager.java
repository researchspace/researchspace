/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.services.fields;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.cache.PlatformCache;
import com.metaphacts.data.json.JsonUtil;
import com.metaphacts.data.rdf.container.FieldDefinitionContainer;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.vocabulary.FIELDS;
import com.metaphacts.vocabulary.XsdUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.queryrender.RenderUtils;
import org.eclipse.rdf4j.repository.RepositoryConnection;

import javax.annotation.Nullable;
import javax.inject.Inject;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import static java.util.stream.Collectors.*;

public class FieldDefinitionManager implements PlatformCache {
    private static final Logger logger = LogManager.getLogger(FieldDefinitionManager.class);

    private final RepositoryManager repositoryManager;
    private final LoadingCache<IRI, Optional<FieldDefinition>> cache;

    @Inject
    public FieldDefinitionManager(RepositoryManager repositoryManager, CacheManager cacheManager) {
        this.repositoryManager = repositoryManager;
        this.cache = CacheBuilder.newBuilder()
            .maximumSize(1000)
            .expireAfterAccess(30, TimeUnit.MINUTES)
            .build(new CacheLoader<IRI, Optional<FieldDefinition>>() {
                @Override
                public Optional<FieldDefinition> load(IRI key) {
                    return loadFieldDefinitions(Collections.singletonList(key)).get(key);
                }

                @Override
                public Map<IRI, Optional<FieldDefinition>> loadAll(Iterable<? extends IRI> keys) throws Exception {
                    return loadFieldDefinitions(keys);
                }
            });
        cacheManager.register(this);
    }

    @Override
    public String getId() {
        return "FieldDefinitionManager";
    }

    @Override
    public void invalidate() {
        this.cache.invalidateAll();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        this.cache.invalidateAll(iris);
    }

    public Map<IRI, FieldDefinition> queryFieldDefinitions(Iterable<? extends IRI> fieldIris) {
        try {
            logger.trace("Querying field definitions: {}", fieldIris);
            Map<IRI, Optional<FieldDefinition>> found = this.cache.getAll(fieldIris);
            return flattenOptionMap(found);
        } catch (ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    public Map<IRI, FieldDefinition> queryAllFieldDefinitions() {
        logger.trace("Querying all field definitions");
        Map<IRI, Optional<FieldDefinition>> found = loadFieldDefinitions(null);
        this.cache.putAll(found);
        return flattenOptionMap(found);
    }

    private static <K, V> Map<K, V> flattenOptionMap(Map<K, Optional<V>> map) {
        Map<K, V> result = new HashMap<>();
        map.forEach((key, optional) -> {
            optional.ifPresent(value -> result.put(key, value));
        });
        return result;
    }

    private Map<IRI, Optional<FieldDefinition>> loadFieldDefinitions(@Nullable Iterable<? extends IRI> fieldIris) {
        String constructQuery = makeFieldDefinitionQuery(fieldIris);
        SparqlOperationBuilder<GraphQuery> operationBuilder =
            SparqlOperationBuilder.create(constructQuery, GraphQuery.class);

        Map<IRI, FieldDefinition> foundFields;
        try (RepositoryConnection connection = repositoryManager.getAssetRepository().getConnection()) {
            GraphQuery query = operationBuilder.build(connection);
            try (GraphQueryResult queryResult = query.evaluate()) {
                foundFields = frameFieldDefinitions(queryResult);
            }
        }

        Map<IRI, Optional<FieldDefinition>> result = new HashMap<>();

        Iterable<? extends IRI> iris = fieldIris != null ? fieldIris : foundFields.keySet();

        for (IRI iri : iris) {
            if (foundFields.containsKey(iri)) {
                result.put(iri, Optional.of(foundFields.get(iri)));
            } else {
                result.put(iri, Optional.empty());
            }
        }
        return result;
    }

    private String makeFieldDefinitionQuery(@Nullable Iterable<? extends IRI> fieldIris) {
        String valuesClause = fieldIris == null
            ? "" : renderValuesClause("?iri", fieldIris, Collections::singletonList);
        return "PREFIX field: <http://www.metaphacts.com/ontology/fields#>" +
            "\nPREFIX ldp: <http://www.w3.org/ns/ldp#>" +
            "\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "\nPREFIX sp: <http://spinrdf.org/sp#>" +
            "\nCONSTRUCT {" +
            "\n  ?iri rdfs:comment ?description ." +
            "\n  ?iri field:minOccurs ?minOccurs ." +
            "\n  ?iri field:maxOccurs ?maxOccurs ." +
            "\n  ?iri field:xsdDatatype ?xsdDatatype ." +
            "\n  ?iri field:domain ?domain ." +
            "\n  ?iri field:range ?range ." +
            "\n  ?iri field:defaultValue ?defaultValue ." +
            "\n  ?iri field:selectPattern ?selectPattern ." +
            "\n  ?iri field:insertPattern ?insertPattern ." +
            "\n  ?iri field:deletePattern ?deletePattern ." +
            "\n  ?iri field:askPattern ?askPattern ." +
            "\n  ?iri field:autosuggestionPattern ?autosuggestionPattern ." +
            "\n  ?iri field:valueSetPattern ?valueSetPattern ." +
            "\n  ?iri field:treePatterns ?treePatterns ." +
            "\n} WHERE {" +
            "\n  " + valuesClause +
            "\n  <" + FieldDefinitionContainer.IRI_STRING + "> ldp:contains ?field ." +
            "\n  ?iri a field:Field ." +
            "\n  OPTIONAL { ?iri rdfs:comment ?description }" +
            "\n  OPTIONAL { ?iri field:minOccurs ?minOccurs }" +
            "\n  OPTIONAL { ?iri field:maxOccurs ?maxOccurs }" +
            "\n  OPTIONAL { ?iri field:xsdDatatype ?xsdDatatype }" +
            "\n  OPTIONAL { ?iri field:domain ?domain }" +
            "\n  OPTIONAL { ?iri field:range ?range }" +
            "\n  OPTIONAL { ?iri field:defaultValue ?defaultValue }" +
            "\n  OPTIONAL { ?iri field:selectPattern/sp:text ?selectPattern }" +
            "\n  OPTIONAL { ?iri field:insertPattern/sp:text ?insertPattern }" +
            "\n  OPTIONAL { ?iri field:deletePattern/sp:text ?deletePattern }" +
            "\n  OPTIONAL { ?iri field:askPattern/sp:text ?askPattern }" +
            "\n  OPTIONAL { ?iri field:autosuggestionPattern/sp:text ?autosuggestionPattern }" +
            "\n  OPTIONAL { ?iri field:valueSetPattern/sp:text ?valueSetPattern }" +
            "\n  OPTIONAL { ?iri field:treePatterns ?treePatterns }" +
            "\n}";
    }

    private static <T> String renderValuesClause(
        String rowSpecification,
        Iterable<T> values,
        Function<T, List<Value>> rowMapper
    ) {
        StringBuilder builder = new StringBuilder();
        builder.append("VALUES (").append(rowSpecification).append(") {\n");
        for (T value : values) {
            builder.append("(");
            for (Value item : rowMapper.apply(value)) {
                RenderUtils.toSPARQL(item, builder).append(" ");
            }
            builder.append(")");
        }
        builder.append("}");
        return builder.toString();
    }

    private Map<IRI, FieldDefinition> frameFieldDefinitions(GraphQueryResult queryResult) {
        Map<IRI, FieldDefinition> definitions = new HashMap<>();
        while (queryResult.hasNext()) {
            Statement st = queryResult.next();
            if (!(st.getSubject() instanceof IRI)) {
                continue;
            }

            IRI iri = (IRI)st.getSubject();
            FieldDefinition field = definitions.get(iri);
            if (field == null) {
                field = new FieldDefinition();
                field.setIri(iri);
                definitions.put(iri, field);
            }

            IRI predicate = st.getPredicate();
            if (predicate.equals(RDFS.COMMENT)) {
                field.setDescription(objectAsLiteral(st));
            } else if (predicate.equals(FIELDS.MIN_OCCURS)) {
                field.setMinOccurs(objectAsLiteral(st));
            } else if (predicate.equals(FIELDS.MAX_OCCURS)) {
                field.setMaxOccurs(objectAsLiteral(st));
            } else if (predicate.equals(FIELDS.XSD_DATATYPE)) {
                field.setXsdDatatype(objectAsIRI(st));
            } else if (predicate.equals(FIELDS.DOMAIN)) {
                field.getDomain().add(objectAsIRI(st));
            } else if (predicate.equals(FIELDS.RANGE)) {
                field.getRange().add(objectAsIRI(st));
            } else if (predicate.equals(FIELDS.DEFAULT_VALUE)) {
                field.getDefaultValues().add(st.getObject());
            } else if (predicate.equals(FIELDS.SELECT_PATTERN)) {
                field.setSelectPattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.INSERT_PATTERN)) {
                field.setInsertPattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.DELETE_PATTERN)) {
                field.setDeletePattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.ASK_PATTERN)) {
                field.setAskPattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.AUTOSUGGESTION_PATTERN)) {
                field.setAutosuggestionPattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.VALUE_SET_PATTERN)) {
                field.setValueSetPattern(objectAsString(st));
            } else if (predicate.equals(FIELDS.TREE_PATTERNS)) {
                field.setTreePatterns(objectAsString(st));
            }
        }
        return definitions;
    }

    private static IRI objectAsIRI(Statement st) {
        if (st.getObject() instanceof IRI) {
            return (IRI)st.getObject();
        }
        throw makeInvalidFieldPropertyError(st, "an IRI", null);
    }

    private static String objectAsString(Statement st) {
        if (st.getObject() instanceof Literal) {
            return st.getObject().stringValue();
        }
        throw makeInvalidFieldPropertyError(st, "a string literal", null);
    }

    @Nullable
    private static Literal objectAsLiteral(Statement st) {
        if (st.getObject() instanceof Literal) {
            return (Literal)st.getObject();
        }
        throw makeInvalidFieldPropertyError(st, "a literal", null);
    }

    private static RuntimeException makeInvalidFieldPropertyError(Statement st, String expected, Throwable cause) {
        return new RuntimeException(
            "Field definition " + st.getSubject() +
            " has invalid " +  st.getPredicate().toString() +
            " property value " + st.getObject().toString() +
            " (expected " + expected + ")",
            cause
        );
    }

    public Map<String, Object> jsonFromField(FieldDefinition field) {
        Map<String, Object> json = new HashMap<>();
        json.put("iri", field.getIri().stringValue());

        if (field.getDescription() != null) {
            json.put("description", field.getDescription().stringValue());
        }
        if (field.getMinOccurs() != null) {
            String datatype = field.getMinOccurs().getDatatype().stringValue();
            try {
                json.put("minOccurs", XsdUtils.isIntegerDatatype(datatype)
                    ? Integer.parseInt(field.getMinOccurs().stringValue())
                    : field.getMinOccurs().stringValue());
            } catch (NumberFormatException e) {
                throw new RuntimeException(
                    "Failed to serialize field " + field.getIri() +
                    " to JSON: invalid minOccurs value " + field.getMinOccurs(), e);
            }
        }
        if (field.getMaxOccurs() != null) {
            String datatype = field.getMaxOccurs().getDatatype().stringValue();
            try {
                json.put("maxOccurs", XsdUtils.isIntegerDatatype(datatype)
                    ? Integer.parseInt(field.getMaxOccurs().stringValue())
                    : field.getMaxOccurs().stringValue());
            } catch (NumberFormatException e) {
                throw new RuntimeException(
                    "Failed to serialize field " + field.getIri() +
                    " to JSON: invalid maxOccurs value " + field.getMaxOccurs(), e);
            }
        }
        if (field.getXsdDatatype() != null) {
            json.put("xsdDatatype", field.getXsdDatatype().stringValue());
        }

        json.put("domain", field.getDomain().stream().map(Value::stringValue).sorted().collect(toList()));
        json.put("range", field.getRange().stream().map(Value::stringValue).sorted().collect(toList()));
        json.put("defaultValues", field.getDefaultValues().stream().map(Value::stringValue).sorted().collect(toList()));

        if (field.getSelectPattern() != null) {
            json.put("selectPattern", field.getSelectPattern());
        }
        if (field.getInsertPattern() != null) {
            json.put("insertPattern", field.getInsertPattern());
        }
        if (field.getDeletePattern() != null) {
            json.put("deletePattern", field.getDeletePattern());
        }
        if (field.getAskPattern() != null) {
            json.put("askPattern", field.getAskPattern());
        }
        if (field.getAutosuggestionPattern() != null) {
            json.put("autosuggestionPattern", field.getAutosuggestionPattern());
        }
        if (field.getValueSetPattern() != null) {
            json.put("valueSetPattern", field.getValueSetPattern());
        }
        if (field.getTreePatterns() != null) {
            ObjectMapper mapper = JsonUtil.getDefaultObjectMapper();
            try {
                Object treePatternsJson = mapper.readTree(field.getTreePatterns());
                json.put("treePatterns", treePatternsJson);
            } catch (IOException e) {
                throw new RuntimeException(
                    "Failed to serialize field " + field.getIri() +
                    " to JSON: invalid treePatterns value " + field.getTreePatterns(), e);
            }
        }

        return json;
    }
}
