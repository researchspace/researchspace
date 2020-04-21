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

package org.researchspace.data.rdf.container;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Date;

import javax.inject.Inject;

import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryResult;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.junit.After;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.data.rdf.container.LDPApiInternal;
import org.researchspace.data.rdf.container.LDPAssetsLoader;
import org.researchspace.data.rdf.container.LDPAssetsLoader.LDPModelComparator.StatementKey;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;
import org.researchspace.vocabulary.PROV;

import com.google.inject.Injector;

public class LDPAssetsLoaderTest extends AbstractIntegrationTest {

    private static ValueFactory VF = SimpleValueFactory.getInstance();

    @Inject
    private Injector injector;

    @Inject
    private PlatformStorage platformStorage;

    public LDPAssetsLoaderTest() {

    }

    @After
    public void tearDown() throws Exception {
        repositoryRule.delete();
    }

    @Test
    public void testLoadIntoEmpty() throws Exception {
        Model totalModel = Rio.parse(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"), "",
                RDFFormat.TRIG);
        LDPAssetsLoader loader = new LDPAssetsLoader();
        injector.injectMembers(loader);
        Assert.assertEquals(repositoryRule.getAssetRepository(), loader.repositoryManager.getAssetRepository());
        Assert.assertTrue(loader.repositoryManager.getAssetRepository().isInitialized());
        IRI contextIri = VF.createIRI("http://localhost:10214/container/queryContainer/test-query/context");
        IRI resourceIri = VF.createIRI("http://localhost:10214/container/queryContainer/test-query");
        Model model = totalModel.filter(null, null, null, contextIri);
        writeModelToStorage(resourceIri, model);
        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            loader.load();
            Model model2 = new LinkedHashModel(Iterations.asList(con.getStatements(null, null, null, contextIri)));
            Assert.assertTrue(Models.isomorphic(model, model2));
        }
    }

    @Test
    public void testLoadIntoExisting() throws Exception {

        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"), "", RDFFormat.TRIG);

            Model totalModel = Rio.parse(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"),
                    "", RDFFormat.TRIG);

            LDPAssetsLoader.selectContentToLoad("assets", totalModel, con);
        }

    }

    @Test
    public void testLoadIntoExistingOtherDates() throws Exception {

        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"), "", RDFFormat.TRIG);

            Model totalModel = Rio.parse(
                    LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions-other-dates.trig"), "",
                    RDFFormat.TRIG);

            LDPAssetsLoader.selectContentToLoad("assets", totalModel, con);
        }

    }

    @Test
    public void testStatementKey() throws Exception {

        StatementKey st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(
                VF.createStatement(VF.createIRI("http://example1"), PROV.generatedAtTime,
                        VF.createLiteral("2019-07-25T14:59:37", XMLSchema.DATETIME), null));
        StatementKey st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(
                VF.createStatement(VF.createIRI("http://example1"), PROV.generatedAtTime,
                        VF.createLiteral("2019-07-25T14:59:37", XMLSchema.DATETIME), null));
        Assert.assertTrue(st1.equals(st2));

        st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createLiteral("2019-07-25T14:59:37", XMLSchema.DATETIME), null));
        st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createLiteral("2019-07-25T14:59:37", XMLSchema.DATETIME), null));
        Assert.assertTrue(st1.equals(st2));

        st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(
                VF.createStatement(VF.createBNode(), PROV.generatedAtTime, VF.createBNode(), null));
        st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(
                VF.createStatement(VF.createBNode(), PROV.generatedAtTime, VF.createBNode(), null));
        Assert.assertTrue(st1.equals(st2));

        st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createBNode(), VF.createIRI("http://example1/context")));
        st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(
                VF.createStatement(VF.createBNode(), PROV.generatedAtTime, VF.createBNode(), null));
        Assert.assertFalse(st1.equals(st2));

        st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createBNode(), VF.createIRI("http://example1/context")));
        st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createBNode(), VF.createIRI("http://example1/context")));
        Assert.assertTrue(st1.equals(st2));

        st1 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createBNode(),
                PROV.generatedAtTime, VF.createBNode(), VF.createIRI("http://example1/context")));
        st2 = new LDPAssetsLoader.LDPModelComparator.StatementKey(VF.createStatement(VF.createIRI("http://example1"),
                PROV.generatedAtTime, VF.createBNode(), VF.createIRI("http://example1/context")));
        Assert.assertFalse(st1.equals(st2));

    }

    @Test
    public void testCompareWithoutDates() throws Exception {

        Model modelExisting = new LinkedHashModel();
        modelExisting.add(VF.createIRI("http://example1"), PROV.generatedAtTime, VF.createLiteral(new Date()));
        Model modelLoaded = new LinkedHashModel();
        modelLoaded.add(VF.createIRI("http://example1"), PROV.generatedAtTime,
                VF.createLiteral("2019-07-25T14:59:37", XMLSchema.DATETIME));
        // dataTimes are being ignored during comparison, since database may store
        // double numbers differently
        Assert.assertTrue(LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded));

        modelLoaded.add(VF.createIRI("http://example1"), RDF.TYPE, FOAF.PERSON);
        Assert.assertFalse(LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded));

        modelExisting.add(VF.createIRI("http://example1"), RDF.TYPE, FOAF.PERSON);
        Assert.assertTrue(LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded));

        // doubles are being ignored during comparison, since database may store double
        // numbers differently
        modelExisting.add(VF.createIRI("http://example1"), FOAF.AGE, VF.createLiteral(5.0));
        Assert.assertTrue(LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded));

        modelExisting.add(VF.createIRI("http://example1"), FOAF.AGE, VF.createLiteral(5));
        Assert.assertFalse(LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded));

    }

    @Test
    public void testLoadIconsistent() throws Exception {
        try (RepositoryConnection con = repositoryRule.getAssetRepository().getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream("testQueryContainerPermissions.trig"), "", RDFFormat.TRIG);
        }
        LDPAssetsLoader loader = new LDPAssetsLoader();
        injector.injectMembers(loader);
        IRI contextIri = VF.createIRI("http://localhost:10214/container/queryContainer/test-query/context");
        IRI resourceIri = VF.createIRI("http://localhost:10214/container/queryContainer/test-query");
        Model model = copyContextToModel(contextIri, repositoryRule.getAssetRepository());
        model.add(resourceIri, RDFS.COMMENT, VF.createLiteral("blahblah"), contextIri);
        writeModelToStorage(resourceIri, model);
        try {
            loader.load();
            Assert.fail("Loaded the asset from storage despite being inconsistent with the assets repository");
        } catch (IllegalStateException e) {
            Assert.assertTrue(e.getMessage().startsWith("Inconsistent state of the LDP assets storage"));
        }
    }

    @Test(timeout = 5000) // 5 sec timeout
    public void testComparisonTimeout() throws Exception {
        Model testModel1 = getRandomSortedModelFromFile("testDiagram.trig");
        Model testModel2 = getRandomSortedModelFromFile("testDiagram.trig");

        Assert.assertTrue(LDPAssetsLoader.LDPModelComparator.compare(testModel2, testModel1));
    }

    @Test
    public void testSuccessfulComparison() throws Exception {
        IRI person1 = VF.createIRI("http://localhost:10214/person1");
        IRI person2 = VF.createIRI("http://localhost:10214/person2");
        IRI person3 = VF.createIRI("http://localhost:10214/person3");
        BNode anonymous1 = VF.createBNode("anonymous1");
        BNode anonymous2 = VF.createBNode("anonymous2");
        BNode anonymous3 = VF.createBNode("anonymous3");
        IRI knows = VF.createIRI("http://xmlns.com/foaf/0.1/knows");

        Model model1 = new LinkedHashModel();
        model1.add(person1, knows, person2);
        model1.add(person1, knows, person3);
        model1.add(person1, knows, anonymous1);
        model1.add(anonymous1, knows, anonymous2);
        model1.add(anonymous1, knows, anonymous3);
        model1.add(anonymous2, knows, person2);
        model1.add(anonymous3, knows, person3);

        Model model2 = new LinkedHashModel();
        model2.add(person1, knows, person2);
        model2.add(person1, knows, person3);
        model2.add(person1, knows, anonymous1);
        model2.add(anonymous1, knows, anonymous2);
        model2.add(anonymous1, knows, anonymous3);
        model2.add(anonymous2, knows, person2);
        model2.add(anonymous3, knows, person3);

        Assert.assertTrue(LDPAssetsLoader.LDPModelComparator.compare(model1, model2));
    }

    @Test
    public void testResourceIsNotDateTimeOrDouble() {
        Assert.assertTrue(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(null));
        Assert.assertTrue(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createIRI("http://a")));
        Assert.assertFalse(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createLiteral(5.0003)));
        Assert.assertFalse(
                LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createLiteral("5.00000000E", XMLSchema.DOUBLE)));
        Assert.assertFalse(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createLiteral(new Date())));
        Assert.assertTrue(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createLiteral(5)));
        Assert.assertTrue(LDPAssetsLoader.resourceIsNotDateTimeOrDouble(VF.createLiteral("test")));
    }

    @Test
    public void testFailureComparison() throws Exception {
        IRI person1 = VF.createIRI("http://localhost:10214/person1");
        IRI person2 = VF.createIRI("http://localhost:10214/person2");
        IRI person3 = VF.createIRI("http://localhost:10214/person3");
        BNode anonymous1 = VF.createBNode("anonymous1");
        BNode anonymous2 = VF.createBNode("anonymous2");
        BNode anonymous3 = VF.createBNode("anonymous3");
        IRI knows = VF.createIRI("http://xmlns.com/foaf/0.1/knows");

        Model model1 = new LinkedHashModel();
        model1.add(person1, knows, person2);
        model1.add(person1, knows, person3);
        model1.add(person1, knows, anonymous1);
        model1.add(anonymous1, knows, anonymous2);
        model1.add(anonymous1, knows, anonymous3);
        model1.add(anonymous2, knows, person2);
        model1.add(anonymous3, knows, person3);

        Model model2 = new LinkedHashModel();
        model2.add(person1, knows, person2);
        model2.add(person1, knows, person3);
        model2.add(person1, knows, anonymous1);
        model2.add(anonymous2, knows, person2);
        model2.add(anonymous3, knows, person3);

        Assert.assertFalse(LDPAssetsLoader.LDPModelComparator.compare(model1, model2));
    }

    private Model getRandomSortedModelFromFile(String fileId) {
        Repository db = new SailRepository(new MemoryStore());
        db.initialize();

        ArrayList<Statement> arrayList = new ArrayList();
        try (RepositoryConnection con = db.getConnection()) {
            con.add(LDPApiInternal.class.getResourceAsStream(fileId), "", RDFFormat.TRIG);
            RepositoryResult<Statement> result = con.getStatements(null, null, null);
            while (result.hasNext()) {
                arrayList.add(result.next());
            }
        } catch (Exception e) {
            Assert.fail(e.getMessage() + ":" + e.getStackTrace());
        }

        for (int i = 0; i < arrayList.size(); i++) {
            int index1 = new Long(Math.round(Math.random() * (arrayList.size() - 1))).intValue();
            int index2 = new Long(Math.round(Math.random() * (arrayList.size() - 1))).intValue();
            Statement st = arrayList.get(index1);
            arrayList.set(index1, arrayList.get(index2));
            arrayList.set(index2, st);
        }
        db.shutDown();
        return new LinkedHashModel(arrayList);
    }

    private Model copyContextToModel(IRI contextIri, Repository repository) {
        try (RepositoryConnection con = repository.getConnection()) {
            Model model = new LinkedHashModel();
            model.addAll(Iterations.asList(con.getStatements(null, null, null, contextIri)));
            return model;
        }
    }

    private void writeModelToStorage(IRI pointer, Model model) throws Exception {
        StoragePath objectId = ObjectKind.LDP.resolve(RepositoryManager.ASSET_REPOSITORY_ID)
                .resolve(StoragePath.encodeIri(pointer)).addExtension(".trig");
        ByteArrayOutputStream outStream = new ByteArrayOutputStream();

        Rio.write(model, outStream, RDFFormat.TRIG);
        byte[] bytes = outStream.toByteArray();

        ByteArrayInputStream content = new ByteArrayInputStream(bytes);
        platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY).appendObject(objectId,
                new ObjectMetadata(), content, bytes.length);
    }

}
