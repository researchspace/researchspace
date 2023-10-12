package org.researchspace.kp;


import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.model.IRI;

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

    @GET
    public Response test() {
        return Response.ok("it works").build();
    }

    @POST
    @Path("/generateKps")
    public Response generateKps(@QueryParam("ontologyIri") IRI ontologyIri) {
        pg.generateKnowledgePatternsFromOntology(ontologyIri);
        return Response.ok().build();
    }

    @GET
    @Path("/generateKmConfig")
    public Response generateKmConfig() {
        return Response.ok(cg.generateKmConfig())
            .header("content-disposition", "attachment; filename = authoring-config.html")
            .build();
    }
}
