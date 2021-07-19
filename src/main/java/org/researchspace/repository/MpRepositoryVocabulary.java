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

package org.researchspace.repository;

import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.researchspace.rest.filters.UserAgentFilter;

import com.google.common.collect.Sets;

/**
 * Singleton class holding the static constants for the repository
 * manager-specific vocabulary.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpRepositoryVocabulary {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    /**
     * Namespace for the generic repository-related configuration properties.
     */
    public static final String NAMESPACE = "http://www.researchspace.org/resource/system/repository#";

    /**
     * Default namespace for the instance URIs of federation members.
     */
    public static final String FEDERATION_MEMBER_NAMESPACE = "http://www.researchspace.org/resource/system/repository/federation#";

    /**
     * Namespace for the common configuration properties of custom services.
     */
    public static final String FEDERATION_NAMESPACE = "http://www.researchspace.org/resource/system/ephedra#";

    /**
     * For each federation member declared in the federation descriptor,
     * delegateRepositoryID points to its repository ID.
     */
    public static final IRI DELEGATE_REPOSITORY_ID = VF.createIRI(FEDERATION_NAMESPACE, "delegateRepositoryID");
    /**
     * For each federation member declared in the federation descriptor,
     * serviceReference holds a URI by which the federation member will be accessed
     * in SPARQL queries.
     */
    public static final IRI SERVICE_REFERENCE = VF.createIRI(FEDERATION_NAMESPACE, "serviceReference");
    /**
     * In REST service wrapper configs serviceURL holds the URL by which the service
     * is accessible
     */
    public static final IRI SERVICE_URL = VF.createIRI(FEDERATION_NAMESPACE, "serviceURL");

    /**
     * In REST service wrapper configs requestRateLimit holds number of requests
     * that can be issued to the target resource per second. By default is
     * unlimited.
     */
    public static final IRI REQUEST_RATE_LIMIT = VF.createIRI(FEDERATION_NAMESPACE, "requestRateLimit");

    /**
     * User-Agent that should be used in REST calls from REST service wrapper.
     * Otherwise default one is used, @see {@link UserAgentFilter}.
     */
    public static final IRI USER_AGENT = VF.createIRI(FEDERATION_NAMESPACE, "userAgent");

    /**
     * A datatype property that points to the repository ID which would be treated
     * as the default federation member.
     */
    public static final IRI DEFAULT_MEMBER = VF.createIRI(FEDERATION_NAMESPACE, "defaultMember");

    public static final IRI USERNAME = VF.createIRI(NAMESPACE, "username");
    public static final IRI PASSWORD = VF.createIRI(NAMESPACE, "password");
    public static final IRI AUTHENTICATION_TOKEN = VF.createIRI(NAMESPACE, "authenticationToken");
    public static final IRI REALM = VF.createIRI(NAMESPACE, "realm");
    public static final IRI QUAD_MODE = VF.createIRI(NAMESPACE, "quadMode");
    public static final IRI WRITABLE = VF.createIRI(NAMESPACE, "writable");

    public static final IRI USE_ASYNCHRONOUS_PARALLEL_JOIN = VF.createIRI(FEDERATION_NAMESPACE,
            "useAsynchronousParallelJoin");
    public static final IRI USE_COMPETING_JOIN = VF.createIRI(FEDERATION_NAMESPACE, "useCompetingJoin");
    public static final IRI USE_BOUND_JOIN = VF.createIRI(FEDERATION_NAMESPACE, "useBoundJoin");
    public static final IRI JSON_PATH = VF.createIRI(FEDERATION_NAMESPACE, "jsonPath");
    public static final IRI INPUT_JSON_PATH = VF.createIRI(FEDERATION_NAMESPACE, "inputJsonPath");
    public static final IRI HTTP_METHOD = VF.createIRI(FEDERATION_NAMESPACE, "httpMethod");
    public static final IRI HTTP_HEADER = VF.createIRI(FEDERATION_NAMESPACE, "httpHeader");
    public static final IRI NAME = VF.createIRI(FEDERATION_NAMESPACE, "name");
    public static final IRI VALUE = VF.createIRI(FEDERATION_NAMESPACE, "value");
    public static final IRI INPUT_FORMAT = VF.createIRI(FEDERATION_NAMESPACE, "inputFormat");
    public static final IRI MEDIA_TYPE = VF.createIRI(FEDERATION_NAMESPACE, "mediaType");

    public static final IRI IMPLEMENTS_SERVICE = VF.createIRI(FEDERATION_NAMESPACE, "implementsService");

    public static final IRI HAS_SPARQL_PATTERN = VF.createIRI(FEDERATION_NAMESPACE, "hasSPARQLPattern");

    public static final IRI SERVICE_TYPE = VF.createIRI(FEDERATION_NAMESPACE, "Service");
    public static final IRI EXECUTE_FIRST = VF.createIRI(FEDERATION_NAMESPACE, "executeFirst");
    public static final IRI EXECUTE_LAST = VF.createIRI(FEDERATION_NAMESPACE, "executeLast");
    public static final IRI DISABLE_JOIN_REORDERING = VF.createIRI(FEDERATION_NAMESPACE, "disableJoinReordering");
    public static final IRI ENABLE_QUERY_HINTS = VF.createIRI(FEDERATION_NAMESPACE, "enableQueryHints");
    public static final IRI PRIOR = VF.createIRI(FEDERATION_NAMESPACE, "Prior");
    public static final IRI QUERY = VF.createIRI(FEDERATION_NAMESPACE, "Query");

    // REST authorization
    public static final IRI AUTHORIZATION_KEY = VF.createIRI(FEDERATION_NAMESPACE, "authKey");
    public static final IRI AUTHORIZATION_VALUE = VF.createIRI(FEDERATION_NAMESPACE, "authValue");
    public static final IRI AUTHORIZATION_LOCATION = VF.createIRI(FEDERATION_NAMESPACE, "authLocation");

    public static final Set<IRI> queryHints = Sets.newHashSet(EXECUTE_FIRST, EXECUTE_LAST, DISABLE_JOIN_REORDERING);

    private MpRepositoryVocabulary() {

    }

}