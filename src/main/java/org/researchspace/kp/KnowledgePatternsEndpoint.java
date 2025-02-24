/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

package org.researchspace.kp;


import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.MediaType;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.researchspace.cache.LabelCache;

import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinition;
import org.researchspace.services.fields.FieldDefinitionManager;

/**
 * @author Artem Kozlov <artem@rem.sh>
 */
@Path("kp")
@Singleton
public class KnowledgePatternsEndpoint {

    @Inject
    private KnowledgePatternGenerator pg;

    @Inject
    private KnowledgeMapConfigGenerator cg;

    @Inject
    private FieldDefinitionManager fieldDefinitionManager;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private LabelCache labelCache;


    @GET
    public Response test() {
        return Response.ok("it works").build();
    }

    @POST
    @Path("/generateKps")
    public Response generateKps(@QueryParam("ontologyIri") IRI ontologyIri) {
        try {
            pg.generateKnowledgePatternsFromOntology(ontologyIri);
            return Response.ok().build();
        } catch(IOException exception) {
            return Response.noContent().build();
        }
    }

    @GET
    @Path("/getGeneratedKpsAndResponse")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getGeneratedKps(@QueryParam("ontologyIri") IRI ontologyIri) {
        try {
            int numberOfKPsGenerated = pg.generateKnowledgePatternsFromOntology(ontologyIri);

            Map<String, Object> json = new HashMap<String, Object>();;
            json.put("kp_count", numberOfKPsGenerated);
            return Response.ok().entity(json).build();
        } catch(IOException exception) {
            return Response.noContent().build();
        }
    }


    @GET
    @Path("/generateKmConfig")
    public Response generateKmConfig() {
        return Response.ok(cg.generateKmConfig())
            .header("content-disposition", "attachment; filename = authoring-config.html")
            .build();
    }

    @GET
    @Path("/getAllKps")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllKps() {
        Map<IRI, FieldDefinition> fields = fieldDefinitionManager.queryAllFieldDefinitions();
    	Map<IRI, Optional<Literal>> labels = labelCache.getLabels(fields.keySet(), repositoryManager.getAssetRepository(), null);
    	 
        Map<String, Object> jsonDefinitions = new HashMap<String, Object>();
        for (Map.Entry<IRI, FieldDefinition> entry : fields.entrySet()) {
            FieldDefinition field = entry.getValue();
            Map<String, Object> json = fieldDefinitionManager.jsonFromField(field);
            json.put("id", entry.getKey().stringValue());
            String fieldLabel = LabelCache.resolveLabelWithFallback(labels.get(field.getIri()), field.getIri());
            json.put("label", fieldLabel);
            jsonDefinitions.put(field.getIri().stringValue(), json);
        }
    	
    	return Response.ok().entity(jsonDefinitions).build();
    }

}
