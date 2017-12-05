/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.templates.helper;

import java.io.IOException;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.Modify;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.queryrender.RenderUtils;
import org.eclipse.rdf4j.queryrender.sparql.SparqlTupleExprRenderer;
import org.eclipse.rdf4j.sail.federation.algebra.NaryJoin;
import org.semarglproject.vocab.XSD;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Options;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.json.JsonUtil;
import com.metaphacts.data.rdf.container.FieldDefinitionContainer;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.templates.helper.HelperUtil.QueryResult;

/**
 * Helper function that reads field definitions from the database and returns them as properly JSON
 * and HTML encoded JSON object array string.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class FieldDefinitionSource {
    private static final String LITERAL_CATEGORY_IRI = "http://www.w3.org/2000/01/rdf-schema#Literal";

    private static final Logger logger = LogManager.getLogger(FieldDefinitionSource.class);

    private final LabelCache labelCache;
    private final NamespaceRegistry namespaceRegistry;
    private final RepositoryManager repositoryManager;

    public FieldDefinitionSource(LabelCache labelCache, NamespaceRegistry namespaceRegistry, RepositoryManager repositoryManager) {
        this.labelCache = labelCache;
        this.namespaceRegistry = namespaceRegistry;
        this.repositoryManager = repositoryManager;
    }

    /**
     * Handlebars helper function that expects mapping between field alias and IRI.
     */
    public String fieldDefinitions(Options options) throws IOException {
        return this.generateFieldDefinitons(options.hash, options);
    }

    /**
     * Helper function takes a sparql select query with `field` projection variable,
     * and then retrieves field definitions for the corresponding fields.
     * Optionally, query can project `alias` variable, that can be used as a shorthand for the field URI.
     */
    public String fieldDefinitionsFromQuery(String param0, Options options) {
        QueryResult result =
            HelperUtil.evaluateSelectQuery(param0, options, logger, repositoryManager.getAssetRepository());
        if (!result.bindingNames.contains(FIELD_BINDING_VARIABLE)) {
            throw new IllegalArgumentException("Binding variable " + FIELD_BINDING_VARIABLE + " does not exist in query result.");
        }

        Map<String, Object> aliasMap = new LinkedHashMap<>();
        for (BindingSet b: result.bindings) {
            String field = b.getBinding(FIELD_BINDING_VARIABLE).getValue().stringValue();
            String alias = b.hasBinding(FIELD_ALIAS_BINDING_VARIABLE)
                ? b.getBinding(FIELD_ALIAS_BINDING_VARIABLE).getValue().stringValue() : field;
            aliasMap.put(alias, field);
        }

        if (aliasMap.isEmpty()) {
            return "[]";
        } else {
            return this.generateFieldDefinitons(aliasMap, options);
        }
    }

    private String generateFieldDefinitons(Map<String, Object> aliasMap, Options options) {
        String valuesClause = "";
        if (!aliasMap.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("VALUES (?field ?alias ?order){");
            int i = 0;
            for (Entry<String, Object> e: aliasMap.entrySet()) {
                if (e.getValue() instanceof String) {
                    sb.append("(<");
                    sb.append(e.getValue());
                    sb.append(">");
                    sb.append(" \"");
                    sb.append(e.getKey());
                    sb.append("\" ");
                    sb.append(i);
                    sb.append(")");
                }
                i++;
            }
            sb.append("}");
            valuesClause = sb.toString();
        }

        String queryString = makeFieldDefinitionQuery(valuesClause);
        logger.trace("Query for reading field definitions: {}", queryString);
        return new Handlebars.SafeString(StringEscapeUtils.escapeHtml4(
            JsonObjectArrayFromSelectSource.transformTupleQueryResultToJSON(
                queryString, options, Optional.of(repositoryManager.getAssetRepository())
            )
        )).toString();
    }

    private String makeFieldDefinitionQuery(String valuesClause) {
        String jsonDatatype = JsonObjectArrayFromSelectSource.SYNTHETIC_JSON_DATATYPE;
        return String.join("\n",
            "PREFIX field: <http://www.metaphacts.com/ontology/fields#> ",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX sp: <http://spinrdf.org/sp#>",
            "SELECT DISTINCT ?id",
            "(SAMPLE(?label) AS ?label)",
            "(SAMPLE(?description) AS ?description)",
            "(SAMPLE(?minOccurs) AS ?minOccurs)",
            "(SAMPLE(?maxOccurs) AS ?maxOccurs)",
            "(STRDT(",
            "  IF(COUNT(?defaultValue) > 0,",
            "    CONCAT(\"[\\\"\",",
            "      GROUP_CONCAT(?defaultValue; separator=\"\\\", \\\"\"),",
            "      \"\\\"]\"",
            "    ),",
            "    \"[]\"",
            "  ),",
            "  <" + jsonDatatype + ">",
            ") AS ?defaultValues)",
            "(SAMPLE(?domain) AS ?domain)",
            "(SAMPLE(?xsdDatatype) AS ?xsdDatatype)",
            "(SAMPLE(?range) AS ?range)",
            "(SAMPLE(?insertPattern) AS ?insertPattern)",
            "(SAMPLE(?selectPattern) AS ?selectPattern)",
            "(SAMPLE(?askPattern) AS ?askPattern)",
            "(SAMPLE(?autosuggestionPattern) AS ?autosuggestionPattern)",
            "(SAMPLE(?valueSetPattern) AS ?valueSetPattern)",
            "(SAMPLE(?treePatterns) AS ?treePatterns)",
            "WHERE {",
            "<" + FieldDefinitionContainer.IRI_STRING + "> <http://www.w3.org/ns/ldp#contains> ?field.",
            "?field a field:Field.",
            "?field field:insertPattern [ sp:text ?insertPattern].",
            "OPTIONAL{?field field:selectPattern [ sp:text ?selectPattern]}.",
            "OPTIONAL{?field field:valueSetPattern [ sp:text ?valueSetPattern]}.",
            "OPTIONAL{?field field:autosuggestionPattern [ sp:text ?autosuggestionPattern]}.",
            "OPTIONAL{?field field:minOccurs ?minOccurs.}.",
            "OPTIONAL{?field field:domain ?domain.}.",
            "OPTIONAL{?field field:xsdDatatype ?xsdDatatype.}.",
            "OPTIONAL{?field field:range ?range.}.",
            "OPTIONAL{?field field:maxOccurs ?maxOccurs.}.",
            "OPTIONAL { ?field field:defaultValue ?defaultValue . } .",
            "OPTIONAL{?field rdfs:comment ?description.}.",
            "OPTIONAL{?field field:askPattern [ sp:text ?askPattern]}.",
            "OPTIONAL { ?field field:treePatterns ?treePatterns }",
            "?field rdfs:label ?label.",
            valuesClause,
            "BIND(COALESCE(?alias, ?field) as ?id)",
            "}",
            "GROUP BY ?id",
            "ORDER BY ?order ?id"
        );
    }

    public static String FIELD_BINDING_VARIABLE = "field";
    public static String FIELD_ALIAS_BINDING_VARIABLE = "alias";
    public String searchConfigForFieldsFromQuery(String param0, Options options) throws IOException {
        QueryResult result =
            HelperUtil.evaluateSelectQuery(param0, options, logger, repositoryManager.getAssetRepository());
        if (!result.bindingNames.contains(FIELD_BINDING_VARIABLE)) {
            throw new IllegalArgumentException("Binding variable " + FIELD_BINDING_VARIABLE + " does not exist in query result.");
        }

        ImmutableList<Object> fields =
            ImmutableList.copyOf(
                result.bindings.stream().map(b -> b.getBinding(FIELD_BINDING_VARIABLE).getValue().stringValue()).collect(Collectors.toList())
            );
        return generateSearchConfigForFields(fields, options);
    }

    /**
     * Handlebars helper function that generates semantic-search config based on field definitions.
     * Expects varargs list of field IRIs.
     */
    public String searchConfigForFields(String param0, Options options) throws IOException {
        ImmutableList<Object> fields = param0 == null ? ImmutableList.of() : ImmutableList.builder().add(param0).add(options.params).build();
        return generateSearchConfigForFields(fields, options);
    }

    /**
     * Handlebars helper function that generates semantic-search config based on field definitions.
     * Expects varargs list of field IRIs.
     */
    private String generateSearchConfigForFields(ImmutableList<Object> fields, Options options) throws IOException {
        ValueFactory vf = SimpleValueFactory.getInstance();
        String queryString = makeQueryForFieldDefinitions(fields);

        Map<String, SearchRelation> relations = new HashMap<>();
        JsonObjectArrayFromSelectSource.enumerateQueryTuples(queryString, options, Optional.of(repositoryManager.getAssetRepository()), (tuple, last) -> {
            Map<String, String> values = Maps.transformValues(tuple, v -> v.stringValue());
            if (values.get("id") == null) {
                return;
            }
            SearchRelation relation = relationFromTuple(values);
            if (relation.range != null && relation.domain != null) {
                relations.put('<' + relation.id + '>', relation);
            } else {
                throw new RuntimeException("Domain or Range is unknown for the field - " + relation.id);
            }
        });

        Collection<SearchRelation> allRelations = relations.values();
        Set<IRI> categoryIris = Stream.concat(
            allRelations.stream().map(relation -> relation.domain),
            allRelations.stream().map(relation -> relation.range)
        ).map(vf::createIRI).collect(Collectors.toSet());
        Map<IRI, Optional<Literal>> categoryLabels = labelCache.getLabels(categoryIris, this.repositoryManager.getAssetRepository());

        String categoriesQuery = String.join("\n",
            "PREFIX ssp: <http://www.metaphacts.com/ontologies/platform/semantic-search-profile/>",
            "SELECT (ssp:Profile as ?profile) ?category ?label (?label as ?description) " +
                " WHERE {",
            renderValuesClause("?category ?label", categoryIris, category -> ImmutableList.of(
                category,
                vf.createLiteral(LabelCache.resolveLabelWithFallback(
                    categoryLabels.get(category), category))
            )),
            "} ORDER BY ?order"
        );

        String relationsQuery = String.join("\n",
            "PREFIX ssp: <http://www.metaphacts.com/ontologies/platform/semantic-search-profile/>",
            "SELECT (ssp:Profile as ?profile) ?relation ?label (?label as ?description) ?hasDomain ?hasRange WHERE {",
            renderValuesClause("?hasDomain ?relation ?hasRange ?label", relations.values(),
                relation -> ImmutableList.of(
                    vf.createIRI(relation.domain),
                    vf.createIRI(relation.id),
                    vf.createIRI(relation.range),
                    vf.createLiteral(relation.label)
                )
            ),
            "}"
        );

        Map<String, Object> configCategories = new HashMap<>();
        relations.forEach((key, relation) -> {
            String categoryKey = '<' + relation.range + '>';
            if (configCategories.containsKey(categoryKey)) { return; }
            if (relation.rangePattern == null) { return; }
            Map<String, Object> category = new HashMap<>();
            category.put("kind", "resource");
            category.put("queryPattern", relation.rangePattern);
            configCategories.put(categoryKey, ImmutableList.of(category));
        });

        Map<String, Object> configRelations = Maps.transformValues(relations, relation -> ImmutableList.of(
            ImmutableMap.of(
                "kind", relation.kind,
                "queryPattern", relation.queryPattern
            )
        ));

        Map<String, Object> result = ImmutableMap.of(
            "categories", configCategories,
            "relations", configRelations,
            "searchProfile", ImmutableMap.of(
                "categoriesQuery", categoriesQuery,
                "relationsQuery", relationsQuery
            ),
            "selectorMode", "dropdown"
        );

        return new Handlebars.SafeString(StringEscapeUtils.escapeHtml4(
            JsonUtil.toJson(result)
        )).toString();
    }

    private String makeQueryForFieldDefinitions(List<?> definitionIds) {
        ValueFactory vf = SimpleValueFactory.getInstance();
        String valuesClause = definitionIds.size() > 0 ? renderValuesClause(
            "?field", definitionIds,
            param -> ImmutableList.of(vf.createIRI((String)param))
        ) : "";
        String query = makeFieldDefinitionQuery(valuesClause);
        logger.trace("Query for reading field definitions: {}", query);
        return query;
    }

    private static <T> String renderValuesClause(
        String rowSpecification,
        Collection<T> values,
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

    private static class SearchRelation {
        String id;
        String kind;
        String label;
        String domain;
        String range;
        String queryPattern;
        String rangePattern;

        SearchRelation setId(String id) {
            this.id = id;
            return this;
        }

        SearchRelation setKind(String kind) {
            this.kind = kind;
            return this;
        }

        SearchRelation setLabel(String label) {
            this.label = label;
            return this;
        }

        SearchRelation setDomain(String domain) {
            this.domain = domain;
            return this;
        }

        SearchRelation setRange(String range) {
            this.range = range;
            return this;
        }

        SearchRelation setQueryPattern(String queryPattern) {
            this.queryPattern = queryPattern;
            return this;
        }

        SearchRelation setRangePattern(String rangePattern) {
            this.rangePattern = rangePattern;
            return this;
        }
    }

    private SearchRelation relationFromTuple(Map<String, String> tuple) {
        RelationKind kind = RelationKind.fromFieldDatatype(tuple.get("id"), tuple.get("xsdDatatype"));

        String queryPattern;
        String rangePattern = null;
        try {
            queryPattern = transformFieldInsertQueryToRelationPattern(kind, tuple.get("insertPattern"));
            String selectQuery = tuple.get("selectPattern");
            if (selectQuery != null) {
                rangePattern = transformFieldSelectQueryToCategoryPattern(selectQuery);
            }
        } catch (MalformedQueryException ex) {
            String message = String.format(
                "Error transforming queries of field definition <%s>", tuple.get("id"));
            logger.error(message, ex);
            throw new RuntimeException(message, ex);
        }

        return new SearchRelation()
            .setId(tuple.get("id"))
            .setKind(kind.relationKind)
            .setLabel(tuple.get("label"))
            .setDomain(tuple.get("domain"))
            .setRange(kind == RelationKind.Literal ? LITERAL_CATEGORY_IRI : tuple.get("range"))
            .setQueryPattern(queryPattern)
            .setRangePattern(rangePattern);
    }

    private enum RelationKind {
        Resource("resource"),
        Literal("literal");

        public final String relationKind;

        RelationKind(String relationKind) {
            this.relationKind = relationKind;
        }

        public static RelationKind fromFieldDatatype(String fieldId, String xsdDatatype) {
            if (xsdDatatype == null) {
                throw new RuntimeException("Field " + fieldId + " has unknown datatype!");
            } else if (XSD.ANY_URI.equals(xsdDatatype)) {
                return RelationKind.Resource;
            } else {
                return RelationKind.Literal;
            }
        }
    }

    private String transformFieldInsertQueryToRelationPattern(RelationKind kind, String insertQuery) {
        String query = commonQueryPrefixes() + insertQuery;
        List<TupleExpr> relationPatterns = QueryParserUtil.parseUpdate(QueryLanguage.SPARQL, query, null)
            .getUpdateExprs().stream()
            .filter(expr -> expr instanceof Modify)
            .map(expr -> ((Modify)expr).getInsertExpr())
            .map(insert -> {
                TupleExpr cloned = insert.clone();
                cloned.visit(new VarRenameVisitor("value",
                    kind == RelationKind.Resource ? "__value__" : "__literal__"));
                return cloned;
            }).collect(Collectors.toList());
        return renderTupleExpressions(relationPatterns);
    }

    private String transformFieldSelectQueryToCategoryPattern(String selectQuery) {
        String query = commonQueryPrefixes() + selectQuery;
        TupleExpr queryExpr = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, query, null).getTupleExpr();
        queryExpr.visit(new VarRenameVisitor("value", "__value__"));
        return renderTupleExpressions(ImmutableList.of(queryExpr));
    }

    private String commonQueryPrefixes() {
        return namespaceRegistry.getPrefixMap().entrySet().stream()
            .map(entry -> "PREFIX " + entry.getKey() + ": <" + entry.getValue() + ">")
            .collect(Collectors.joining("\n"));
    }

    /** Renames ?(fromVariableName) variables to ?(toVariableName) **/
    private static class VarRenameVisitor extends AbstractQueryModelVisitor<RuntimeException> {
        private final String fromVariableName;
        private final String toVariableName;

        VarRenameVisitor(String fromVariableName, String toVariableName) {
            this.fromVariableName = fromVariableName;
            this.toVariableName = toVariableName;
        }

        @Override
        public void meet(Var node) throws RuntimeException {
            super.meet(node);
            String varName = node.getName();
            if (varName.equals(fromVariableName)) {
                node.setName(toVariableName);
            }
        }
    }

    private static String renderTupleExpressions(List<TupleExpr> expressions) {
        TupleExpr joinedPattern = new NaryJoin(expressions);
        try {
            String rendered = new SparqlTupleExprRenderer().render(joinedPattern);
            return rendered;
        } catch (Exception ex) {
            throw Throwables.propagate(ex);
        }
    }
}
