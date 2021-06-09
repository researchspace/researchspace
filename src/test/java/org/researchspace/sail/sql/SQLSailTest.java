package org.researchspace.sail.sql;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import java.util.List;

import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.junit.BeforeClass;
import org.junit.Test;
import org.researchspace.sparql.SparqlTestUtils;

public class SQLSailTest {

    private static Repository sqlRepo;

    @BeforeClass
    public static void setup() throws Exception {
        sqlRepo = SQLSailTestUtils.createSQLSailRepo(
                "/org/researchspace/apps/default/config/services/artworks-search.ttl", "jdbc:mysql://localhost:3306", "root",
                "GSpinac100@1");
    }

    @Test
    public void testSQLSail() throws Exception {

        String query = SparqlTestUtils.loadClasspathResourceAsUtf8String(SQLSailTest.class, "query.sq");
        List<BindingSet> results = Repositories.tupleQuery(sqlRepo, query, r -> QueryResults.asList(r));

        assertNotNull(results);

    }
}
