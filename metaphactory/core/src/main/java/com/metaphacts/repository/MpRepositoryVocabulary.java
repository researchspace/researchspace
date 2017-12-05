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

package com.metaphacts.repository;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

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
    public static final String SERVICE_NAMESPACE = "http://www.metaphacts.com/ontologies/platform/repository/service#";

    /**
     * For each federation member declared in the federation descriptor, delegateRepositoryID points
     * to its repository ID.
     */
    public static final IRI DELEGATE_REPOSITORY_ID = VF.createIRI(NAMESPACE,
            "delegateRepositoryID");
    /**
     * For each federation member declared in the federation descriptor, serviceReference holds a
     * URI by which the federation member will be accessed in SPARQL queries.
     */
    public static final IRI SERVICE_REFERENCE = VF.createIRI(NAMESPACE, "serviceReference");
    /**
     * In REST service wrapper configs serviceURL holds the URL by which the service is accessible
     * via HTTP.
     */
    public static final IRI SERVICE_URL = VF.createIRI(SERVICE_NAMESPACE, "serviceURL");
    /**
     * A datatype property that points to the repository ID which would be treated as the default
     * federation member.
     */
    public static final IRI DEFAULT_MEMBER = VF.createIRI(NAMESPACE, "defaultMember");
    public static final IRI USERNAME = VF.createIRI(NAMESPACE, "username");
    public static final IRI PASSWORD = VF.createIRI(NAMESPACE, "password");
    public static final IRI REALM = VF.createIRI(NAMESPACE, "realm");
    public static final IRI QUAD_MODE = VF.createIRI(NAMESPACE, "quadMode");

    private MpRepositoryVocabulary() {

    }

}