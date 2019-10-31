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

package com.metaphacts.querycatalog;

import java.io.IOException;
import java.io.OutputStream;
import java.util.*;

import javax.annotation.Nullable;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;

import com.metaphacts.security.Permissions;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.permission.WildcardPermission;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.Operation;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResultHandler;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriter;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriterRegistry;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterRegistry;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.RDFWriterRegistry;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.metaphacts.api.dto.query.AskQuery;
import com.metaphacts.api.dto.query.ConstructQuery;
import com.metaphacts.api.dto.query.SelectQuery;
import com.metaphacts.api.dto.query.UpdateQuery;
import com.metaphacts.api.dto.querytemplate.AskQueryTemplate;
import com.metaphacts.api.dto.querytemplate.ConstructQueryTemplate;
import com.metaphacts.api.dto.querytemplate.QueryArgument;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.dto.querytemplate.SelectQueryTemplate;
import com.metaphacts.api.dto.querytemplate.UpdateQueryTemplate;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.api.sparql.SparqlUtil;
import com.metaphacts.cache.QueryTemplateCache;
import com.metaphacts.repository.RepositoryManager;

/**
 * An implementation of a service that executes a {@link SelectQueryTemplate} 
 * published in a query catalog. 
 * In order to be callable via REST, the query template must be exposed using a 
 * properties file stored in <i>config/qaas</i> folder.
 * Each file has a name <i>{SERVICE_ID}.prop</i> and contains 
 * the following properties:
 * <ul>
 *      <li><b>iri</b>(mandatory): the IRI of the SPIN SELECT query template 
 *          stored in the query catalog.</li>
 *      <li><b>aclPermission</b>(optional): the Shiro permission string 
 *          to check whether the service can be executed. By default, the query 
 *          is executable by all users.</li>
 *      <li><b>publisher</b>(optional): the IRI of the user who exposed 
 *          the service.</li>
 *      <li><b>responseformat</b>(optional): the default MIME type to serialize 
 *          query results. It is used if no Accept headers were provided with the HTTP request. 
 *          Supported values: application/json, text/csv, and text/xml.
 *          Default: application/json.</li>
 *      <li><b>repository</b>(optional): id of the repository over which 
 *          the query will be executed. 
 *          Default: {@link RepositoryManager#DEFAULT_REPOSITORY_ID}.</li>
 *      <li><b>disabled</b>(optional): a boolean value determining whether the service
 *          is currently suppressed and is not accessible via the API. 
 *          Default: false.</li>
 * </ul>  
 * 
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public final class QueryCatalogRESTService {
    protected static ValueFactory VF = SimpleValueFactory.getInstance();

    private PropertiesConfiguration configuration;
    private final QueryTemplateCache queryTemplateCache;
    private final String id;
    private final RepositoryManager repositoryManager;
    private final Map<String, String> standardPrefixes;

    protected static Value interpretInputParameter(
            QueryArgument arg, String val) {
        if (arg == null) {
            throw new IllegalArgumentException(
                    "Query argument not provided for value " + val);
        }
        if (val == null) {
            throw new IllegalArgumentException(
                    "Parameter value for the argument " 
                            + arg.getPredicate() + " is null");
        }
        
        if (arg.getValueType() == null) {
            return VF.createLiteral(val);
        } else if (arg.getValueType().equals(RDFS.RESOURCE) 
                        || arg.getValueType().equals(XMLSchema.ANYURI)) {
            return VF.createIRI(val);
        } else {
            return VF.createLiteral(val, arg.getValueType());
        } 
    }

    /**
     * Default constructor.
     * 
     * @param id The identifier of the REST service 
     *              (properties file name without the ".prop" extension)
     * @param configuration configuration bound to the properties file.
     * @param queryTemplateCache A wrapper over the LDP API
     *              retrieving {@link SelectQueryTemplate} objects.
     * @param repositoryManager reference to the system repository manager.
     */
    public QueryCatalogRESTService(
        String id,
        PropertiesConfiguration configuration,
        QueryTemplateCache queryTemplateCache,
        RepositoryManager repositoryManager,
        Map<String, String> standardPrefixes
    ) {
        this.id = id;
        this.configuration = configuration;
        this.queryTemplateCache = queryTemplateCache;
        this.repositoryManager = repositoryManager;
        this.standardPrefixes = standardPrefixes;
    }

    public String getId() {
        return id;
    }

    public synchronized void setConfiguration(PropertiesConfiguration configuration) {
        this.configuration = configuration;
    }
    
    public synchronized Map<QaasField, String> getConfigurationProperties() {
        Map<QaasField, String> properties = new HashMap<>();
        Iterator<String> keys = configuration.getKeys();
        while (keys.hasNext()) {
            String key = keys.next();
            QaasField field = QaasField.byConfigKey.get(key);
            if (field != null) {
                properties.put(field, configuration.getString(key));
            }
        }
        return properties;
    }

    public synchronized PropertiesConfiguration cloneConfiguration() {
        return (PropertiesConfiguration)configuration.clone();
    }

    public synchronized String get(QaasField field) {
        return configuration.getString(field.configKey, field.defaultValue);
    }
    
    /**
     * Gets the IRI of the query template stored in the query catalog.
     */
    public IRI getIri() {
        String strIri = get(QaasField.IRI);
        if (strIri == null) {
            throw new IllegalStateException("The IRI of the query from the catalog is not defined");
        }
        return VF.createIRI(strIri);
    }

    public String getRepositoryId() {
        return get(QaasField.REPOSITORY);
    }

    public String getAclPermission() {
        return get(QaasField.ACL);
    }
    
    /**
     * Gets the IRI of the user who exposed the query template. 
     */
    public IRI getPublisher() {
        String publisher = get(QaasField.PUBLISHER);
        return publisher == null ? null : VF.createIRI(publisher);
    }
    
    public MediaType getDefaultFormat() {
        String propValue = get(QaasField.RESPONSE_FORMAT);
        return (propValue == null) ? null : MediaType.valueOf(propValue);
    }
    
    public boolean isDisabled() {
        return Boolean.parseBoolean(get(QaasField.DISABLED));
    }
    
    public QueryTemplate<?> getQueryTemplate() throws Exception {
        return this.queryTemplateCache.getQueryTemplate(this.getIri());
    }
    
    
    /**
     * Runs the query with provided {@code arguments} over {@code connection}
     * and writes the results into {@code output}.
     * 
     * @param arguments a {@link MultivaluedMap} of arguments, which get 
     *          interpreted according to the datatypes defined in the query template.
     * @param output an {@link OutputStream} to write the query results into.
     * @param mimeType an {@link Optional} containing the desired mime type. 
     *          If empty or not suitable, the one returned by {@link #getDefaultFormat()} 
     *          will be used.
     */
    public void invoke(
        MultivaluedMap<String, String> arguments,
        OutputStream output,
        Optional<MediaType> mimeType
    ) throws Exception {
        if (!checkPermission()) {
            throw new SecurityException("Access not permitted");
        }
        if (isDisabled()) {
            throw new SecurityException("This service is currently disabled");
        }
        QueryTemplate<?> queryTemplate = this.getQueryTemplate();
        
        List<MediaType> acceptedMediaTypes = Lists.newArrayList();
        if (mimeType.isPresent()) {
            acceptedMediaTypes.add(mimeType.get());
        }
        
        String repositoryId = this.getRepositoryId();
        Repository targetRepo = this.repositoryManager.getRepository(repositoryId);
        
        try (RepositoryConnection connection = targetRepo.getConnection()) {
            invokeInternal(queryTemplate, connection, arguments, output, acceptedMediaTypes);
        } 
    }
    
    /**
     * Returns the specific media type for returned results 
     * given the provided list of accepted media types.
     * 
     * @param acceptedMediaTypes list of accepted media types
     * @return
     * @throws Exception
     */
    public Optional<MediaType> determineMediaType(List<MediaType> acceptedMediaTypes) throws Exception {
        if (!checkPermission()) {
            throw new SecurityException("Access not permitted");
        }
        if (isDisabled()) {
            throw new SecurityException("This service is currently disabled");
        }
        
        QueryTemplate<?> queryTemplate = this.getQueryTemplate();
        
        List<MediaType> allAcceptedMediaTypes = 
                this.determineAcceptedMediaTypes(acceptedMediaTypes, queryTemplate);
        
        if (!allAcceptedMediaTypes.isEmpty()) {
            return Optional.of(allAcceptedMediaTypes.iterator().next());
        } else {
            return Optional.empty();
        }
    }
   
    private void invokeInternal(
            QueryTemplate<?> queryTemplate, 
            RepositoryConnection connection,
            MultivaluedMap<String, String> arguments, 
            OutputStream output,
            List<MediaType> acceptedMediaTypes) throws IOException {
        if (queryTemplate instanceof SelectQueryTemplate) {
            invokeSelectQuery((SelectQueryTemplate)queryTemplate, 
                                connection, arguments, output, acceptedMediaTypes);
        } else if (queryTemplate instanceof ConstructQueryTemplate) {
            invokeConstructQuery((ConstructQueryTemplate)queryTemplate,
                    connection, arguments, output, acceptedMediaTypes);
        } else if (queryTemplate instanceof AskQueryTemplate) {
            invokeAskQuery((AskQueryTemplate)queryTemplate,
                    connection, arguments, output, acceptedMediaTypes);
        } else if (queryTemplate instanceof UpdateQueryTemplate) {
            invokeUpdateQuery((UpdateQueryTemplate)queryTemplate,
                    connection, arguments, output);
        } else {
            throw new IllegalArgumentException(
                    "Unsupported type of query in the query catalog REST API.");
        }
    }
    
    
    private void invokeSelectQuery(
            SelectQueryTemplate queryTemplate, 
            RepositoryConnection connection,
            MultivaluedMap<String, String> arguments, 
            OutputStream output,
            List<MediaType> acceptedMediaTypes) {
        SelectQuery query = queryTemplate.getQuery();
        TupleQuery tq = SparqlOperationBuilder.
                <TupleQuery>create(query.getQueryString(), TupleQuery.class)
                .setNamespaces(this.standardPrefixes)
                .build(connection);
        bindArguments(tq, queryTemplate, arguments);
        TupleQueryResultHandler handler 
                = SparqlUtil.getTupleQueryResultWriterForAcceptedMediaTypes(
                                                    output, 
                                                    acceptedMediaTypes, 
                                                    TupleQueryResultFormat.JSON);
        tq.evaluate(handler);
    }
    
    private void invokeConstructQuery(
            ConstructQueryTemplate queryTemplate, 
            RepositoryConnection connection,
            MultivaluedMap<String, String> arguments, 
            OutputStream output,
            List<MediaType> acceptedMediaTypes) {
        ConstructQuery query = queryTemplate.getQuery();
        GraphQuery gq = SparqlOperationBuilder
                .<GraphQuery>create(query.getQueryString(), GraphQuery.class)
                .setNamespaces(this.standardPrefixes).build(connection);
        bindArguments(gq, queryTemplate, arguments);
        RDFWriter handler = SparqlUtil.getRDFWriterForAcceptedMediaTypes(
                                            output, 
                                            acceptedMediaTypes, 
                                            RDFFormat.TURTLE);
        gq.evaluate(handler);
    }
    
    private void invokeAskQuery(
            AskQueryTemplate queryTemplate, 
            RepositoryConnection connection,
            MultivaluedMap<String, String> arguments, 
            OutputStream output,
            List<MediaType> acceptedMediaTypes) {
        AskQuery query = queryTemplate.getQuery();
        BooleanQuery bq = SparqlOperationBuilder
                .<BooleanQuery>create(query.getQueryString(), BooleanQuery.class)
                .setNamespaces(this.standardPrefixes)
                .build(connection);
        bindArguments(bq, queryTemplate, arguments);
        BooleanQueryResultWriter handler = SparqlUtil.getBooleanQueryResultWriterForAcceptedMediaTypes(
                                            output, 
                                            acceptedMediaTypes, 
                                            BooleanQueryResultFormat.JSON);
        handler.handleBoolean(bq.evaluate());
    }
    
    
    private void invokeUpdateQuery(
            UpdateQueryTemplate queryTemplate, 
            RepositoryConnection connection,
            MultivaluedMap<String, String> arguments, 
            OutputStream output) throws IOException {
        UpdateQuery query = queryTemplate.getQuery();
        Update uq = SparqlOperationBuilder.
                <Update>create(query.getQueryString(), Update.class)
                .setNamespaces(this.standardPrefixes)
                .build(connection);
        bindArguments(uq, queryTemplate, arguments);
        uq.execute();
        output.close();
    }
    
    private void bindArguments(
            Operation operation, 
            QueryTemplate<?> queryTemplate, 
            MultivaluedMap<String, String> arguments) {
        for (QueryArgument arg: queryTemplate.getArguments()) {
            if (arguments.containsKey(arg.getPredicate())) {
                List<String> vals = arguments.get(arg.getPredicate());
                Value val = interpretInputParameter(
                        arg, vals.get(0));
                operation.setBinding(arg.getPredicate(), val);
            } else if (arg.getDefaultValue().isPresent()) {
                operation.setBinding(arg.getPredicate(), arg.getDefaultValue().get());
            } else if (arg.isRequired()) {
                throw new IllegalArgumentException(
                        "No value given for a non-optional argument " + arg.getPredicate());
            }
        }
    }
    
    private List<MediaType> determineAcceptedMediaTypes(
            List<MediaType> acceptedMediaTypes, 
            QueryTemplate<?> queryTemplate) {
        List<MediaType> allMediaTypes = Lists.newArrayList(acceptedMediaTypes);
        MediaType configuredDefault = this.getDefaultFormat();
        if (configuredDefault != null) {
            allMediaTypes.add(this.getDefaultFormat());
        }
        
        Set<String> mimeTypesForQueryType = Sets.newHashSet();
        switch (SparqlUtil.getOperationType(queryTemplate)) {
            case SELECT:
                allMediaTypes.add(MediaType.valueOf(
                        TupleQueryResultFormat.JSON.getDefaultMIMEType()));
                mimeTypesForQueryType.addAll(SparqlUtil.getRegisteredMimeTypesForQueryType(
                        TupleQueryResultWriterRegistry.getInstance()));
                break;
            case CONSTRUCT:
                allMediaTypes.add(MediaType.valueOf(RDFFormat.TURTLE.getDefaultMIMEType()));
                mimeTypesForQueryType.addAll(SparqlUtil.getRegisteredMimeTypesForQueryType(
                        RDFWriterRegistry.getInstance()));
                break;
            case ASK:
                allMediaTypes.add(MediaType.valueOf(
                        BooleanQueryResultFormat.JSON.getDefaultMIMEType()));
                mimeTypesForQueryType.addAll(SparqlUtil.getRegisteredMimeTypesForQueryType(
                        BooleanQueryResultWriterRegistry.getInstance()));
                break;
            default:
        }
        
        List<MediaType> validMediaTypes = Lists.newArrayList();
        
        for (MediaType mediaType : allMediaTypes) {
            if (mimeTypesForQueryType.contains(mediaType.toString())) {
                validMediaTypes.add(mediaType);
            }
        }
        
        return validMediaTypes;
    }
    
    private boolean checkPermission() {
        String permission = getAclPermission();
        return SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission));
    }
}
