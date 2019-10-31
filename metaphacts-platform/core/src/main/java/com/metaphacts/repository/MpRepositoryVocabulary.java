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

package com.metaphacts.repository;

import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.google.common.collect.Sets;

/**
 * Singleton class holding the static constants for the repository manager-specific vocabulary.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpRepositoryVocabulary {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    /**
     * Namespace for the generic repository-related configuration properties.
     */
    public static final String NAMESPACE = "http://www.metaphacts.com/ontologies/platform/repository#";

    /**
     * Default namespace for the instance URIs of federation members.
     */
    public static final String FEDERATION_MEMBER_NAMESPACE = "http://www.metaphacts.com/ontologies/platform/repository/federation#";

    /**
     * Namespace for the common configuration properties of custom services.
     */
    public static final String FEDERATION_NAMESPACE = "http://www.metaphacts.com/ontologies/platform/ephedra#";

    /**
     * For each federation member declared in the federation descriptor, delegateRepositoryID points
     * to its repository ID.
     */
    public static final IRI DELEGATE_REPOSITORY_ID = VF.createIRI(FEDERATION_NAMESPACE,
            "delegateRepositoryID");
    /**
     * For each federation member declared in the federation descriptor, serviceReference holds a
     * URI by which the federation member will be accessed in SPARQL queries.
     */
    public static final IRI SERVICE_REFERENCE = VF.createIRI(FEDERATION_NAMESPACE, "serviceReference");
    /**
     * In REST service wrapper configs serviceURL holds the URL by which the service is accessible
     */
    public static final IRI SERVICE_URL = VF.createIRI(FEDERATION_NAMESPACE, "serviceURL");
    /**
     * A datatype property that points to the repository ID which would be treated as the default
     * federation member.
     */
    public static final IRI DEFAULT_MEMBER = VF.createIRI(FEDERATION_NAMESPACE, "defaultMember");
    
    public static final IRI USERNAME = VF.createIRI(NAMESPACE, "username");
    public static final IRI PASSWORD = VF.createIRI(NAMESPACE, "password");
    public static final IRI AUTHENTICATION_TOKEN = VF.createIRI(NAMESPACE, "authenticationToken");
    public static final IRI REALM = VF.createIRI(NAMESPACE, "realm");
    public static final IRI QUAD_MODE = VF.createIRI(NAMESPACE, "quadMode");
    public static final IRI USE_ASYNCHRONOUS_PARALLEL_JOIN = VF.createIRI(FEDERATION_NAMESPACE,
            "useAsynchronousParallelJoin");
    public static final IRI USE_COMPETING_JOIN = VF.createIRI(FEDERATION_NAMESPACE, "useCompetingJoin");
    public static final IRI USE_BOUND_JOIN = VF.createIRI(FEDERATION_NAMESPACE, "useBoundJoin");
    public static final IRI JSON_PATH = VF.createIRI(FEDERATION_NAMESPACE, "jsonPath");
    public static final IRI HTTP_METHOD = VF.createIRI(FEDERATION_NAMESPACE, "httpMethod");
    public static final IRI HTTP_HEADER = VF.createIRI(FEDERATION_NAMESPACE, "httpHeader");
    public static final IRI NAME = VF.createIRI(FEDERATION_NAMESPACE, "name");
    public static final IRI VALUE = VF.createIRI(FEDERATION_NAMESPACE, "value");
    public static final IRI INPUT_FORMAT = VF.createIRI(FEDERATION_NAMESPACE, "inputFormat");
    
    public static final IRI IMPLEMENTS_SERVICE = VF
            .createIRI(FEDERATION_NAMESPACE, "implementsService");
    
    public static final IRI HAS_SPARQL_PATTERN = VF
            .createIRI(FEDERATION_NAMESPACE, "hasSPARQLPattern");
    
    public static final IRI SERVICE_TYPE = VF.createIRI(FEDERATION_NAMESPACE, "Service");
    public static final IRI EXECUTE_FIRST = VF.createIRI(FEDERATION_NAMESPACE, "executeFirst");
    public static final IRI EXECUTE_LAST = VF.createIRI(FEDERATION_NAMESPACE, "executeLast");
    public static final IRI DISABLE_JOIN_REORDERING = VF.createIRI(FEDERATION_NAMESPACE, "disableJoinReordering");
    public static final IRI ENABLE_QUERY_HINTS = VF.createIRI(FEDERATION_NAMESPACE, "enableQueryHints");
    public static final IRI PRIOR = VF.createIRI(FEDERATION_NAMESPACE, "Prior");
    public static final IRI QUERY = VF.createIRI(FEDERATION_NAMESPACE, "Query");

    public static final Set<IRI> queryHints = Sets.newHashSet(EXECUTE_FIRST, EXECUTE_LAST, DISABLE_JOIN_REORDERING);

    private MpRepositoryVocabulary() {

    }

}