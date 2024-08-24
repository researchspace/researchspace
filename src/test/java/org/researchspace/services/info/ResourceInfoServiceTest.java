package org.researchspace.services.info;

import static org.junit.Assert.assertEquals;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import javax.inject.Inject;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.cache.CacheManager;
import org.researchspace.cache.LabelCache;
import org.researchspace.junit.AbstractRepositoryBackedIntegrationTest;
import org.researchspace.junit.PlatformStorageRule;
import org.researchspace.junit.RepositoryRule;
import org.researchspace.junit.TestPlatformStorage;
import org.researchspace.repository.RepositoryConfigUtils;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.fields.FieldDefinitionManager;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.SizedStream;
import org.researchspace.services.storage.api.StoragePath;

import com.hp.hpl.jena.query.Query;

public class ResourceInfoServiceTest extends AbstractRepositoryBackedIntegrationTest {

    @Inject
    private CacheManager cacheManager;

    @Inject
    private LabelCache labelCache;

    @Inject
    @Rule
    public PlatformStorageRule storage;

    private ResourceInfoService resourceInfoService;

    @After
    public void tearDown() {
        this.repositoryRule.getRepository().getConnection().clear();

        this.repositoryRule.getAssetRepository().getConnection().clear();
        this.repositoryRule.getAssetRepository().shutDown();
        this.repositoryRule.getRepository().shutDown();
    }

    @Before
    public void setup() throws Exception {
        cacheManager.deregisterAllCaches();

        writeProfileToStorage("artwork",
                getClass().getResource("/org/researchspace/services/info/artwork.json").openStream());

        RepositoryManager repositoryManager = this.repositoryRule.getRepositoryManager();
        try (RepositoryConnection con = this.repositoryRule.getAssetRepository().getConnection()) {
            con.add(getClass().getResource("/org/researchspace/services/info/fieldDefinitionContainer.trig")
                    .openStream(), "", RDFFormat.TRIG);
        }

        try (RepositoryConnection con = this.repositoryRule.getRepository().getConnection()) {
            con.add(getClass().getResource("/org/researchspace/services/info/data.ttl").openStream(), "",
                    RDFFormat.TURTLE);
        }

        FieldDefinitionManager fieldDefinitionManager = new FieldDefinitionManager(repositoryManager, cacheManager);
        this.resourceInfoService = new ResourceInfoService(fieldDefinitionManager,
                this.repositoryRule.getRepositoryManager(), this.labelCache, cacheManager, this.storage.getPlatformStorage()
                );
    }

    private void writeProfileToStorage(String profileName, InputStream content) throws IOException {
        StoragePath path = ResourceInfoService.INFO_PROFILES.resolve(profileName + ".json");
        try (SizedStream bufferedContent = SizedStream.bufferAndMeasure(content)) {
            storage.getObjectStorage().appendObject(path, storage.getPlatformStorage().getDefaultMetadata(),
                    bufferedContent.getStream(), bufferedContent.getLength());
        }
    }

    @Test
    public void testProfile() {
        // isue with stale resources, fuck
        repositoryRule.getRepository().getConnection().prepareTupleQuery("PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>\n" + "PREFIX crmdig: <http://www.ics.forth.gr/isl/CRMdig/> SELECT DISTINCT ?config_node ?field ?value ?subject WHERE { $subject crm:P138i_has_representation/crm:P128i_is_carried_by ?value .  VALUES ?subject {<https://artresearch.net/resource/midas/work/08162969> } BIND(4 AS ?config_node) BIND(<https://artresearch.net/resource/fieldDefinition/photo_with_image> AS ?field) }").evaluate().stream().forEach(System.out::println);

        String res = this.resourceInfoService.getResourceInfo(
                SimpleValueFactory.getInstance().createIRI("https://artresearch.net/resource/midas/work/08162969"),
                "artwork", "default", "en");

        System.out.println(res);
    }

}
