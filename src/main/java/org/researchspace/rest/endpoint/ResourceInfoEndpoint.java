/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
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
package org.researchspace.rest.endpoint;

import java.util.List;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.researchspace.services.info.ResourceInfoService;

@Path("resource-info")
public class ResourceInfoEndpoint {
    private static final Logger logger = LogManager.getLogger(ResourceInfoEndpoint.class);

    @Inject
    private ResourceInfoService resourceInfoService;

    private SimpleValueFactory vf = SimpleValueFactory.getInstance();

    @GET()
    @Produces(MediaType.APPLICATION_JSON)
    public String getResourceInfo(@QueryParam("iri") IRI iri, @QueryParam("profile") String profile,
            @QueryParam("repository") String repository, @QueryParam("preferredLanguage") String preferredLanguage) {
        return this.resourceInfoService.getResourceInfo(iri, profile, repository, preferredLanguage);
    }

    @GET
    @Path("clear-cache")
    public void clearCache() {
        //this.resourceInfoService.clearCache();
    }
}
