package org.researchspace.sail.sql;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.researchspace.sail.rest.OsmSailTest;
import org.researchspace.sail.rest.sql.MpJDBCDriverManager;
import org.researchspace.sail.rest.sql.SQLSail;
import org.researchspace.sail.rest.sql.SQLSailConfig;
import org.researchspace.sail.rest.sql.SQLSailFactory;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.repository.MpRepositoryVocabulary;

import java.sql.DriverManager;

public class SQLSailTestUtils {

    static MpJDBCDriverManager jdbcDriverManager;

    private static void handleJDBCDrivers(String url) {

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");

            jdbcDriverManager = new MpJDBCDriverManager();
            jdbcDriverManager.registerDriver(DriverManager.getDriver(url));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }


    public static Repository createSQLSailRepo(String serviceDescriptorLocation, String url, String user,
            String password) {

        try {

            handleJDBCDrivers(url);

            Model model = Rio.parse(OsmSailTest.class.getResourceAsStream(serviceDescriptorLocation), "",
                    RDFFormat.TURTLE);

            IRI rootNode = Models.subjectIRI(model.filter(null, RDF.TYPE, MpRepositoryVocabulary.SERVICE_TYPE)).get();
            ServiceDescriptor serviceDescriptor = new ServiceDescriptor();
            serviceDescriptor.parse(model, rootNode);

            SQLSailConfig sailConfig = new SQLSailConfig();

            sailConfig.setDriverManager(jdbcDriverManager);

            SQLSailFactory factory = new SQLSailFactory();

            SQLSail sail = (SQLSail) factory.getSail(sailConfig);
            sail.setServiceDescriptor(serviceDescriptor);

            return new SailRepository(sail);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
