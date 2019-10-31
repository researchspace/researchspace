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

package com.metaphacts.dataquality.shacl.generators;

import java.util.AbstractMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.algebra.evaluation.impl.BindingAssigner;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;
import org.eclipse.rdf4j.repository.RepositoryConnection;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.metaphacts.api.dto.query.Query;
import com.metaphacts.api.dto.querytemplate.QueryArgument;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.rest.client.QueryCatalogAPIClientImpl;
import com.metaphacts.api.rest.client.QueryTemplateCatalogAPIClientImpl;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.data.rdf.container.LDPApiInternalRegistry;
import com.metaphacts.data.rdf.container.LocalLDPAPIClient;
import com.metaphacts.data.rdf.container.QueryTemplateContainer;
import com.metaphacts.dataquality.ModelBasedLdpApiClientImpl;
import com.metaphacts.dataquality.ShaclUtils;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.sparql.renderer.MpSparqlQueryRenderer;
import com.metaphacts.vocabulary.MPQA;
import com.metaphacts.vocabulary.SHACL;

class ShaclPatternInstantiator {

    private static final Logger logger = LogManager
            .getLogger(ShaclPatternInstantiator.class);
    protected static final ValueFactory VF = SimpleValueFactory.getInstance();

    protected final LDPApiInternalRegistry ldpRegistry;

    public ShaclPatternInstantiator(LDPApiInternalRegistry ldpRegistry) {
        this.ldpRegistry = ldpRegistry;
    }

    public Model generate(RepositoryConnection conn, Model parentModel, TestGenerator generator)
            throws Exception {
        LDPApiInternal assetsApi = this.ldpRegistry.api(RepositoryManager.ASSET_REPOSITORY_ID);
        LocalLDPAPIClient ldpApiClient = new LocalLDPAPIClient(assetsApi,
                QueryTemplateContainer.IRI);

        String query = generator.getQuery();

        Set<IRI> referencedPatterns = generator.getPatternIds();

        TupleQuery tupleQuery = conn.prepareTupleQuery(query);

        List<BindingSet> bindingSets = Iterations.asList(tupleQuery.evaluate());

        Model resModel = new TreeModel();

        if (bindingSets.isEmpty()) {
            return resModel;
        }

        for (IRI patternIRI : referencedPatterns) {
            Map<Resource, Model> instantiations = instantiatePattern(parentModel, ldpApiClient,
                    patternIRI, bindingSets, generator);
            for (Entry<Resource, Model> entry : instantiations.entrySet()) {
                resModel.addAll(entry.getValue());
            }
        }

        return resModel;
    }

    protected Map<Resource, Model> instantiatePattern(Model parentModel,
            LocalLDPAPIClient ldpApiClient, IRI patternIRI, List<BindingSet> bindingSets, TestGenerator generator)
            throws Exception {
        Map<Resource, Model> resMap = Maps.newHashMap();
        if (bindingSets.isEmpty()) {
            return resMap;
        }

        Set<String> bindingNames = bindingSets.iterator().next().getBindingNames();
        Model patternModel = ShaclUtils.extractSubTreeBySubject(parentModel, patternIRI);

        ShaclUtils.expandWithReferencedQueryTemplates(patternModel, ldpApiClient);
        validateForParametersExistence(patternModel, patternIRI, bindingNames);

        for (BindingSet bs : bindingSets) {

            Entry<Resource, Model> entry = instantiatePatternFromBindingSet(patternModel,
                    patternIRI, bs, generator);
            resMap.put(entry.getKey(), entry.getValue());
        }

        return resMap;
    }

    protected Entry<Resource, Model> instantiatePatternFromBindingSet(Model patternModel,
            IRI patternIRI, BindingSet bs, TestGenerator generator) throws Exception {
        Model instanceModel = new TreeModel(patternModel);
        ShaclUtils.renameBNodes(instanceModel);
        replaceParametersInStatements(instanceModel, bs);
        replaceParametersInStringConstants(instanceModel, bs);
        replaceParametersInExplicitQueries(instanceModel, bs);
        replaceParametersInQueryTemplates(instanceModel, bs);
        Resource newId = replacePatternId(instanceModel, patternIRI);
        instanceModel.add(VF.createStatement(newId, MPQA.createdFromPattern, patternIRI));
        instanceModel.add(VF.createStatement(newId, MPQA.createdByGenerator, generator.getId()));

        return new AbstractMap.SimpleEntry<Resource, Model>(newId, instanceModel);
    }

    protected Resource replacePatternId(Model shapeModel, IRI patternIRI) {
        IRI shapeType = Models.getPropertyIRI(shapeModel, patternIRI, MPQA.shapeType).get(); 
        List<Statement> toRemove = Lists.newArrayList(shapeModel.filter(patternIRI, null, null));
        IRI newId = VF.createIRI("urn:uuid:" + UUID.randomUUID());
        List<Statement> toAdd = toRemove.stream()
                .filter(stmt -> !stmt.getPredicate().equals(RDF.TYPE)
                        && !stmt.getPredicate().equals(MPQA.shapeType))
                .map(stmt -> VF.createStatement(newId, stmt.getPredicate(), stmt.getObject()))
                .collect(Collectors.toList());
        toAdd.add(VF.createStatement(newId, RDF.TYPE, shapeType));
        shapeModel.removeAll(toRemove);
        shapeModel.addAll(toAdd);
        return newId;
    }

    protected void replaceParametersInStatements(Model shapeModel, BindingSet bs) {
        List<Statement> parameterFilterStmts = Lists
                .newArrayList(shapeModel.filter(null, MPQA.parameter, null));
        Map<Resource, String> nodesToReplaceMap = parameterFilterStmts.stream().collect(Collectors
                .toMap(stmt -> stmt.getSubject(), stmt -> stmt.getObject().stringValue()));
        shapeModel.removeAll(parameterFilterStmts);

        List<Statement> stmts = shapeModel.stream()
                .filter(stmt -> nodesToReplaceMap.containsKey(stmt.getObject()))
                .collect(Collectors.toList());
        List<Statement> toAdd = Lists.newArrayList();
        for (Statement stmt : stmts) {
            String varName = nodesToReplaceMap.get(stmt.getObject());
            Value val = bs.getValue(varName);
            Statement stmt2 = VF.createStatement(stmt.getSubject(), stmt.getPredicate(), val);
            toAdd.add(stmt2);
        }

        shapeModel.removeAll(stmts);
        shapeModel.addAll(toAdd);
    }

    protected void replaceParametersInStringConstants(Model shapeModel, BindingSet bs) {

        List<Statement> toReplace = shapeModel.stream()
                .filter(stmt -> (stmt.getObject() instanceof Literal)
                        && stringContainsVariablePlaceholder(stmt.getObject(), bs))
                .collect(Collectors.toList());

        List<Statement> toAdd = toReplace.stream()
                .map(stmt -> VF.createStatement(stmt.getSubject(), stmt.getPredicate(),
                        replaceAllVariablesInStringLiteral((Literal) stmt.getObject(), bs)))
                .collect(Collectors.toList());

        shapeModel.removeAll(toReplace);
        shapeModel.addAll(toAdd);
    }

    protected boolean stringContainsVariablePlaceholder(Value val, BindingSet bs) {
        return bs.getBindingNames().stream().map(name -> "{@" + name + "}")
                .anyMatch(name -> val.stringValue().contains(name));
    }

    /**
     * Inexact simple checker on whether a query string mentions a variable with one of the binding
     * names. Can return true even if the variable is not present (but there is a variable which
     * includes a binding name as a substring).
     * 
     * @param queryString
     * @param bs
     * @return
     */
    protected boolean queryStringMaybeContainsVariable(String queryString, BindingSet bs) {
        return bs.getBindingNames().stream().anyMatch(
                name -> queryString.contains("?" + name) || queryString.contains("$" + name));
    }

    protected Value replaceAllVariablesInStringLiteral(Literal val, BindingSet bs) {
        String strValue = val.stringValue();
        Optional<String> lang = val.getLanguage();

        for (String bindingName : bs.getBindingNames()) {
            String replacePattern = "{@" + bindingName + "}";
            strValue = strValue.replace(replacePattern, bs.getValue(bindingName).stringValue());
        }

        if (lang.isPresent()) {
            return VF.createLiteral(strValue, lang.get());
        } else {
            return VF.createLiteral(strValue);
        }
    }

    protected void validateForParametersExistence(Model patternModel, IRI patternIRI,
            Set<String> boundParameters) throws Exception {
        Optional<IRI> optShapeType = Models.getPropertyIRI(patternModel, patternIRI,
                MPQA.shapeType);
        if (!optShapeType.isPresent()) {
            throw new IllegalStateException("The pattern <" + patternIRI.stringValue()
                    + "> does not define the target shapeType");
        }

        patternModel.filter(null, MPQA.parameter, null).stream().map(stmt -> stmt.getObject())
                .filter(val -> (val instanceof Literal)).map(val -> val.stringValue())
                .forEach(varName -> {
                    if (!boundParameters.contains(varName)) {
                        throw new IllegalStateException(
                                "Required parameter " + varName + " is not bound");
                    }
                });

        List<QueryTemplate<?>> queryTemplates = ShaclUtils.retrieveQueryTemplates(patternModel);
        for (QueryTemplate<?> queryTemplate : queryTemplates) {
            queryTemplate.getArguments().stream().filter(arg -> arg.isRequired())
                    .map(arg -> arg.getPredicate()).forEach(varName -> {
                        if (!boundParameters.contains(varName)) {
                            throw new IllegalStateException(
                                    "Required parameter " + varName + " is not bound");
                        }
                    });
        }
    }

    protected QueryTemplate<? extends Query<?>> createFromModel(Model model, Resource id)
            throws Exception {
        ModelBasedLdpApiClientImpl pseudoClient = new ModelBasedLdpApiClientImpl(model);
        QueryCatalogAPIClientImpl queryCatalogClient = new QueryCatalogAPIClientImpl(pseudoClient);
        QueryTemplateCatalogAPIClientImpl queryTemplateCatalogClient = new QueryTemplateCatalogAPIClientImpl(
                pseudoClient, queryCatalogClient);
        return queryTemplateCatalogClient.getQueryTemplate(id);
    }

    protected void replaceParametersInQueryTemplates(Model shapeModel, BindingSet bs)
            throws Exception {
        List<QueryTemplate<?>> queryTemplates = ShaclUtils.retrieveQueryTemplates(shapeModel);

        List<Statement> toRemove = Lists.newArrayList();
        List<Statement> toAdd = Lists.newArrayList();

        for (QueryTemplate<?> queryTemplate : queryTemplates) {
            MapBindingSet bsFiltered = new MapBindingSet();
            // We pre-process the list of bindings:
            // - to avoid replacing variables that are not template parameters
            // - to replace with the default value if the input binding set does not have the
            // binding
            for (QueryArgument arg : queryTemplate.getArguments()) {
                if (bs.hasBinding(arg.getPredicate())) {
                    bsFiltered.addBinding(bs.getBinding(arg.getPredicate()));
                } else if (arg.getDefaultValue().isPresent()) {
                    bsFiltered.addBinding(arg.getPredicate(), arg.getDefaultValue().get());
                }
            }

            Query<?> query = queryTemplate.getQuery();
            String queryString = query.getQueryString();

            String modifiedString = replaceParametersInQuery(bsFiltered, queryString);
            Literal instantiatedQuery = VF.createLiteral(modifiedString);
            Model linkedStmts = shapeModel.filter(null, MPQA.hasSPINQueryTemplate,
                    queryTemplate.getId());
            linkedStmts.stream().map(stmt -> stmt.getSubject());
            toAdd.addAll(linkedStmts.stream().map(stmt -> stmt.getSubject())
                    .map(subj -> VF.createStatement(subj, SHACL.select, instantiatedQuery))
                    .collect(Collectors.toList()));
            toRemove.addAll(
                    ShaclUtils.extractSubTreeBySubject(shapeModel, queryTemplate.getId()));
            toRemove.addAll(linkedStmts);
        }
        shapeModel.removeAll(toRemove);
        shapeModel.addAll(toAdd);
    }

    protected void replaceParametersInExplicitQueries(Model shapeModel, BindingSet bs)
            throws Exception {

        List<Statement> toReplace = shapeModel.stream()
                .filter(stmt -> stmt.getPredicate().equals(SHACL.select)
                        && queryStringMaybeContainsVariable(stmt.getObject().stringValue(), bs))
                .collect(Collectors.toList());

        List<Statement> toAdd = Lists.newArrayList();
        for (Statement old : toReplace) {
            String replaced = replaceParametersInQuery(bs, old.getObject().stringValue());
            toAdd.add(VF.createStatement(old.getSubject(), old.getPredicate(),
                    VF.createLiteral(replaced)));
        }
        shapeModel.removeAll(toReplace);
        shapeModel.addAll(toAdd);
    }

    protected String replaceParametersInQuery(BindingSet bs, String queryBody) throws Exception {
        SPARQLParser parser = new SPARQLParser();
        ParsedQuery parsedQuery = parser.parseQuery(queryBody, null);
        new BindingAssigner().optimize(parsedQuery.getTupleExpr(), null, bs);

        MpSparqlQueryRenderer renderer = new MpSparqlQueryRenderer();

        return renderer.render(parsedQuery);
    }
}
