package org.researchspace.sail.rest;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.repository.MpRepositoryVocabulary;

public class RESTSailTestUtils {

    /**
     * 
     * @param serviceDescriptorLocation - e.g
     *                                  /org/researchspace/apps/default/config/services/osm-nominatim-search.ttl
     * @param port                      - port from wiremock
     * @return repository repository that implements given service descriptor
     */
    public static Repository createRestSailRepo(String serviceDescriptorLocation, int port, String url,
            String httpMethod) {
        return createRestSailRepo(serviceDescriptorLocation, port, url, httpMethod, null);
    }

    public static Repository createRestSailRepo(String serviceDescriptorLocation, int port, String url,
            String httpMethod, String mediaType) {
        try {
            Model model = Rio.parse(OsmSailTest.class.getResourceAsStream(serviceDescriptorLocation), "",
                    RDFFormat.TURTLE);
            IRI rootNode = Models.subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();
            ServiceDescriptor serviceDescriptor = new ServiceDescriptor();
            serviceDescriptor.parse(model, rootNode);
            RESTSailConfig sailConfig = new RESTSailConfig();

            sailConfig.setHttpMethod(httpMethod);
            if (mediaType != null) {
                sailConfig.setMediaType(mediaType);
            }

            // construct service url based on the dynamic port from wiremock
            sailConfig.setUrl("http://localhost:" + port + url);

            RESTSailFactory factory = new RESTSailFactory();
            RESTSail sail = (RESTSail) factory.getSail(sailConfig);
            sail.setServiceDescriptor(serviceDescriptor);
            return new SailRepository(sail);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
