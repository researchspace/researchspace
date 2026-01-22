/**
 * ResearchSpace
 * SPDX-FileCopyrightText: 2024, PHAROS: The International Consortium of Photo Archives
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.rest.endpoint;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.services.info.ResourceInfoService;

@Path("resource-info")
public class ResourceInfoEndpoint {
    private static final Logger logger = LogManager.getLogger(ResourceInfoEndpoint.class);

    @Inject
    private ResourceInfoService resourceInfoService;

    @GET()
    @Produces(MediaType.APPLICATION_JSON)
    public String getResourceInfo(@QueryParam("iri") IRI iri, @QueryParam("profile") String profile,
            @QueryParam("repository") String repository, @QueryParam("preferredLanguage") String preferredLanguage) {
        return this.resourceInfoService.getResourceInfo(iri, profile, repository, preferredLanguage);
    }
}
