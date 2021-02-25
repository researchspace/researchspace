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

import java.io.File;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.util.Collection;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;
import java.util.Optional;
import java.util.Set;

import org.apache.commons.lang3.StringUtils;
import org.apache.http.client.HttpClient;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.http.client.HttpClientDependent;
import org.eclipse.rdf4j.http.client.SessionManagerDependent;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.DelegatingRepository;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.RepositoryResolverClient;
import org.eclipse.rdf4j.repository.config.DelegatingRepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryRegistry;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sail.config.SailRepositoryConfig;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryFactory;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.eclipse.rdf4j.sail.nativerdf.config.NativeStoreConfig;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.Configuration;
import org.researchspace.data.rdf.container.LDPApiInternalRegistry;
import org.researchspace.repository.memory.MpMemoryRepository;
import org.researchspace.repository.memory.MpMemoryRepositoryImplConfig;
import org.researchspace.repository.sparql.DefaultMpSPARQLRepositoryFactory;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;
import org.researchspace.repository.sparql.MpSharedHttpClientSessionManager;
import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class RepositoryManager implements RepositoryManagerInterface {

    private static final Logger logger = LogManager.getLogger(RepositoryManager.class);

    private Configuration config;
    @SuppressWarnings("unused")
    private CacheManager cacheManager;
    private PlatformStorage platformStorage;
    private LDPApiInternalRegistry ldpCache;

    private final Map<String, Repository> initializedRepositories = Maps.newConcurrentMap();

    private final File repositoryDataFolder;

    public static final String DEFAULT_REPOSITORY_ID = "default";
    public static final String ASSET_REPOSITORY_ID = "assets";
    public static final String TEST_REPOSITORY_ID = "tests";

    private final MpSharedHttpClientSessionManager client;
    private final WeakReference<Thread> hookReference;

    // Removed the common serviceResolver as some repositories might have their own
    // specific resolvers:
    // e.g., to make some repositories accessible via a SERVICE clause and some
    // other ones hidden.

    // private final FederatedServiceResolverImpl serviceResolver;

    private Injector injector;

    private static RepositoryConfig createSPARQLRepositoryConfigForEndpoint(String sparqlRepositoryUrl) {
        RepositoryConfig repConfig = new RepositoryConfig(DEFAULT_REPOSITORY_ID, "Default HTTP SPARQL Repository");
        MpSPARQLRepositoryConfig repImplConfig = new MpSPARQLRepositoryConfig();
        repImplConfig.setQueryEndpointUrl(sparqlRepositoryUrl);
        repImplConfig.setUsingQuads(true);
        repConfig.setRepositoryImplConfig(repImplConfig);
        return repConfig;
    }

    private static RepositoryConfig createMpMemoryRepositoryConfig() {
        RepositoryConfig repConfig = new RepositoryConfig(DEFAULT_REPOSITORY_ID,
                "Default read-only in-memory repository");
        MpMemoryRepositoryImplConfig repImplConfig = new MpMemoryRepositoryImplConfig();
        repConfig.setRepositoryImplConfig(repImplConfig);
        return repConfig;
    }

    @Inject
    public RepositoryManager(Injector injector, Configuration config, CacheManager cacheManager,
            PlatformStorage platformStorage, LDPApiInternalRegistry ldpCache) throws IOException {
        this.injector = injector;
        this.config = config;
        this.cacheManager = cacheManager;
        this.platformStorage = platformStorage;
        this.ldpCache = ldpCache;

        File baseDataFolder = new File(Configuration.getRuntimeDirectory(), "data");
        this.repositoryDataFolder = new File(baseDataFolder, "repositories");
        this.client = new MpSharedHttpClientSessionManager(config);

        init();
        this.hookReference = new WeakReference<>(addShutdownHook(this));
    }

    private void init() throws IOException {
        Map<String, RepositoryConfig> configs = RepositoryConfigUtils
                .readInitialRepositoryConfigsFromStorage(this.platformStorage);

        configs = RepositoryDependencySorter.sortConfigs(configs);

        // initialize default and asset repository first
        initializeDefaultRepositories(configs);

        for (RepositoryConfig config : configs.values()) {
            if (!isInitialized(config.getID())) {
                initializeRepository(config, false);
            }
        }

    }

    public ObjectStorage getDefaultConfigStorage() {
        // TODO: should properly specify default storage to write files
        return platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY);
    }

    /**
     * Sends a simple test query to all available repositories. Moved out of the
     * constructor routine to avoid Guice circular dependency errors caused by
     * repositories that themselves use RepositoryManager. At the moment called
     * explicitly from GuiceServletConfig.
     *
     */
    public void sentTestQueries() {
        for (Entry<String, Repository> entry : initializedRepositories.entrySet()) {

            // @gspinaci Prevent default test query sending for SailRepositories 
            // SailRepositories requires custom queries
            if(!(entry.getValue() instanceof SailRepository)) {
                this.sendTestQuery(entry.getKey(), entry.getValue());
            }
        }
    }

    private Thread addShutdownHook(final RepositoryManager repositoryManager) {
        Thread hook = new Thread() {
            @Override
            public void run() {
                logger.info("Trying to shutdown repository manager.");
                repositoryManager.shutdown(false);
            }
        };
        logger.debug("Registering RepositoryManager shutdown hook");
        Runtime.getRuntime().addShutdownHook(hook);
        return hook;
    }

    private void removeShutdownHook(Thread hook) {
        try {
            if (hook != null) {
                logger.debug("Unregistering RepositoryManager shutdown hook");
                // note that this will fail when it is actually called from the shutdown
                // hook as in that state the hook cannot be unregistered any more
                Runtime.getRuntime().removeShutdownHook(hook);
            }
        } catch (Throwable t) {
            // the exception is expected when called from within the shutdown hook
            logger.warn("Failed to unregister RepositoryManager shutdown hook: {}", t.getMessage());
            logger.debug("Details:", t);
        }
    }

    public Repository getDefault() {
        return this.getRepository(DEFAULT_REPOSITORY_ID);
    }

    public Repository getAssetRepository() {
        return this.getRepository(ASSET_REPOSITORY_ID);
    }

    public Repository getTestRepositry() {
        return this.getRepository(TEST_REPOSITORY_ID);
    }

    /**
     * <b>NEVER CALL THIS METHOD </b> This is for testing purpose only.
     */
    public void setForTests(Repository defaultRepository, Repository assetRepository, Repository testRepository) {
        if (initializedRepositories.containsKey(DEFAULT_REPOSITORY_ID)) {
            initializedRepositories.get(DEFAULT_REPOSITORY_ID).shutDown();
        }
        initializedRepositories.put(DEFAULT_REPOSITORY_ID, defaultRepository);

        if (initializedRepositories.containsKey(ASSET_REPOSITORY_ID)) {
            initializedRepositories.get(ASSET_REPOSITORY_ID).shutDown();
        }
        initializedRepositories.put(ASSET_REPOSITORY_ID, assetRepository);

        if (initializedRepositories.containsKey(TEST_REPOSITORY_ID)) {
            initializedRepositories.get(TEST_REPOSITORY_ID).shutDown();
        }
        initializedRepositories.put(TEST_REPOSITORY_ID, testRepository);

        this.ldpCache.invalidate();
    }

    private boolean isInitialized(String repID) {
        return initializedRepositories.containsKey(repID);
    }

    private boolean isProtected(String repID) {
        return repID.equals(DEFAULT_REPOSITORY_ID) || repID.equals(ASSET_REPOSITORY_ID);
    }

    private File getRepositoryDataFolder() {
        return this.repositoryDataFolder;
    }

    private void initializeDefaultRepositories(Map<String, RepositoryConfig> repositoryConfigs) {
        String sparqlRepositoryUrl = this.config.getEnvironmentConfig().getSparqlEndpoint();
        if (repositoryConfigs.containsKey(DEFAULT_REPOSITORY_ID)) {
            // Do nothing: the repository will be initialized in the standard sequence
            // from a Turtle file
        } else if (!StringUtils.isEmpty(sparqlRepositoryUrl)) {
            logger.info("Initializing HTTP Sparql Repository with URL: {}.", sparqlRepositoryUrl);
            RepositoryConfig repConfig = RepositoryManager.createSPARQLRepositoryConfigForEndpoint(sparqlRepositoryUrl);
            initializeRepository(repConfig, false);
        } else {
            RepositoryConfig repConfig = createMpMemoryRepositoryConfig();
            initializeRepository(repConfig, false);
        }

        this.initializeHelperRepository(repositoryConfigs, ASSET_REPOSITORY_ID);
        this.initializeHelperRepository(repositoryConfigs, TEST_REPOSITORY_ID);
    }

    private void initializeHelperRepository(Map<String, RepositoryConfig> repositoryConfigs, String repoId) {
        if (repositoryConfigs.containsKey(repoId)) {
            // Do nothing: the repository will be initialized in the standard sequence
            // from a Turtle file
        } else {
            logger.info("Creating a default {} repository configuration", repoId);
            final RepositoryConfig repConfig = new RepositoryConfig(repoId, repoId + "repository for platform.");
            repConfig.setRepositoryImplConfig(new SailRepositoryConfig(new NativeStoreConfig()));
            try {
                RepositoryConfigUtils.writeRepositoryConfigAsPrettyTurtleToFile(getDefaultConfigStorage(),
                        ObjectMetadata.empty(), repConfig, false);
            } catch (RepositoryConfigException | IOException e) {
                logger.error("Failed to persist auto-generated, " + "default configuration for {} repository: {}",
                        repoId, e.getMessage());
            }
            initializeRepository(repConfig, false);
        }

    }

    private void sendTestQuery(String id, Repository repository) {
        logger.info("Testing connection for repository \"{}\".", id);
        try (RepositoryConnection con = repository.getConnection()) {
            try (TupleQueryResult tqr = con.prepareTupleQuery("SELECT * WHERE { ?a ?b ?c } LIMIT 1").evaluate()) {
                if (tqr.hasNext()) {
                    Iterations.asList(tqr); // explicitly consume the iteration
                    logger.info("Connection to repository \"{}\" has been established successfully.", id);
                } else {
                    logger.warn(
                            "Connection to repository \"{}\" has been established successfully. However, repository seems to be empty.",
                            id);
                }
            }
        } catch (Exception e) {
            logger.error("Failed to send test query to repository \"{}\": {} . Waiting 10 seconds .... \n", id, e.getMessage());
            try {
                TimeUnit.SECONDS.sleep(10);
            } catch (InterruptedException e1) {
                throw new RuntimeException(e1);
            }
            sendTestQuery(id, repository);
        }
    }

    private synchronized Repository initializeRepository(RepositoryConfig repConfig, boolean allowReplace)
            throws RepositoryException {
        logger.info("Trying to initialize repository with id \"{}\"", repConfig.getID());
        if (!allowReplace && isInitialized(repConfig.getID())) {
            throw new IllegalStateException(
                    String.format("Repository with id \"%s\" is already initialized. ", repConfig.getID()));
        }
        final RepositoryImplConfig repConfigImpl = repConfig.getRepositoryImplConfig();

        if (repConfigImpl.getType().equals(SPARQLRepositoryFactory.REPOSITORY_TYPE)) {
            throw new RepositoryException(
                    "The default RDF4J SPARQL repository " + SPARQLRepositoryFactory.REPOSITORY_TYPE
                            + " is not allowed because it does not support quad mode. Use "
                            + DefaultMpSPARQLRepositoryFactory.REPOSITORY_TYPE + " instead.");
        }

        Repository repository = createRepositoryStack(repConfigImpl);
        // set the data dir to /data/repositories/{repositoryID}
        // this is mainly relevant for native repository
        repository.setDataDir(new File(getRepositoryDataFolder(), repConfig.getID()));

        repository.init();

        if (initializedRepositories.containsKey(repConfig.getID())) {
            initializedRepositories.get(repConfig.getID()).shutDown();
        }

        initializedRepositories.put(repConfig.getID(), repository);
        logger.info("Repository with id \"{}\" successfully initialized", repConfig.getID());

        return repository;
    }

    /**
     * Validate the given {@link RepositoryImplConfig} by opening a
     * {@link RepositoryConnection} and send a dummy query.
     * 
     * @param repImplConfig
     * @param repId
     */
    public void validate(RepositoryImplConfig repImplConfig, String repId) {

        Repository repo = createRepositoryStack(repImplConfig);
        // set the data dir to /data/repositories/{repositoryID}
        // this is mainly relevant for native repository
        repo.setDataDir(new File(getRepositoryDataFolder(), repId));

        repo.init();
        try {

            try (RepositoryConnection conn = repo.getConnection()) {
                TupleQuery tq = conn.prepareTupleQuery("SELECT * WHERE { }");
                try (TupleQueryResult tqr = tq.evaluate()) {
                    // just consume the result
                    Iterations.asList(tqr);
                }
            }

        } finally {
            repo.shutDown();
        }

    }

    protected synchronized Repository createRepositoryStack(RepositoryImplConfig repImplConfig) {
        RepositoryFactory factory = RepositoryRegistry.getInstance().get(repImplConfig.getType()).orElseThrow(
                () -> new RepositoryConfigException("Unsupported repository type: " + repImplConfig.getType()));
        Repository repository = factory.getRepository(repImplConfig);

        injector.injectMembers(repository);

        if (repImplConfig instanceof DelegatingRepositoryImplConfig) {
            RepositoryImplConfig delegateConfig =

                    ((DelegatingRepositoryImplConfig) repImplConfig).getDelegate();
            Repository delegate = createRepositoryStack(delegateConfig);
            try {
                ((DelegatingRepository) repository).setDelegate(delegate);
            } catch (ClassCastException e) {
                throw new RepositoryConfigException(
                        "Delegate specified for repository that is not a DelegatingRepository: " + delegate.getClass(),
                        e);
            }
        }

        if (repository instanceof SailRepository) {
            injector.injectMembers(((SailRepository) repository).getSail());
        }

        if (repository instanceof RepositoryResolverClient) {
            ((RepositoryResolverClient) repository).setRepositoryResolver(this);
        }
        if (repository instanceof SessionManagerDependent) {
            ((SessionManagerDependent) repository).setHttpClientSessionManager(client);
        } else if (repository instanceof HttpClientDependent) {
            ((HttpClientDependent) repository).setHttpClient(getHttpClient());
        }
        return repository;
    }

    public void shutdown() {
        shutdown(true);
    }

    private synchronized void shutdown(boolean unregisterShutdownHook) {
        for (Entry<String, Repository> entry : initializedRepositories.entrySet()) {
            try {
                if (isProtected(entry.getKey())) {
                    continue;
                }
                logger.info("Trying to shutdown repository \"{}\".", entry.getKey());
                entry.getValue().shutDown();
                initializedRepositories.remove(entry.getKey());
            } catch (RepositoryException e) {
                // we will catch and log the exception, so that at least remaining repositories
                // can be shut down
                logger.error("Error while shutting down the repository \"{}\": {}", entry.getKey(), e.getMessage());
            }
        }
        // handle protected repositories separately
        getDefault().shutDown();
        getAssetRepository().shutDown();
        initializedRepositories.clear();

        if (unregisterShutdownHook) {
            // unregister shutdown hook as everything is done
            removeShutdownHook(hookReference.get());
        }
    }

    public synchronized void shutdownRepository(final String repID)
            throws RepositoryException, IllegalArgumentException {
        if (isInitialized(repID)) {
            initializedRepositories.get(repID).shutDown();
            initializedRepositories.remove(repID);
        } else if (isProtected(repID)) {
            throw new IllegalAccessError(String.format("Default repository with ID \"%s\" can not be removed.", repID));
        } else {
            throw new IllegalArgumentException(String.format("Repository with ID \"%s\" does not exist.", repID));
        }
    }

    // TODO: remove unused method?
    public void createNewRepository(Model repositoryConfigModel) throws RepositoryConfigException, IOException {
        RepositoryConfig repConfig = RepositoryConfigUtils.createRepositoryConfig(repositoryConfigModel);
        RepositoryConfigUtils.writeRepositoryConfigAsPrettyTurtleToFile(getDefaultConfigStorage(),
                platformStorage.getDefaultMetadata(), repConfig, false);
    }

    public Map<String, Boolean> getAvailableRepositoryConfigs() throws IOException {
        Map<String, Boolean> map = Maps.newHashMap();

        Set<String> initializedRepositoryKeys = initializedRepositories.keySet();
        Set<String> definedRepositoryKeys = Sets
                .newHashSet(RepositoryConfigUtils.readInitialRepositoryConfigsFromStorage(platformStorage).keySet());
        String sparqlRepositoryUrl = this.config.getEnvironmentConfig().getSparqlEndpoint();
        if (!StringUtils.isEmpty(sparqlRepositoryUrl)) {
            definedRepositoryKeys.add(RepositoryManager.DEFAULT_REPOSITORY_ID);
        }

        // There can exist repositories that were configured, but not initialized (e.g.,
        // those just added manually)
        // There can also exist repositories that are still initialized and active, but
        // for which the config file does not exist (e.g., where the deletion was
        // triggered)
        // We return a union of both.
        for (String repID : Sets.union(initializedRepositoryKeys, definedRepositoryKeys)) {
            map.put(repID, isInitialized(repID) && definedRepositoryKeys.contains(repID));
        }
        return map;
    }

    /**
     * Returns the repository config descriptor object for a given repository ID
     *
     * @param repID The repository ID
     * @return A {@link RepositoryConfig} object
     */
    public RepositoryConfig getRepositoryConfig(String repID)
            throws RepositoryConfigException, IllegalArgumentException, IOException {
        if (RepositoryConfigUtils.repositoryConfigFileExists(platformStorage, repID)) {
            return RepositoryConfigUtils.readRepositoryConfigurationFile(platformStorage, repID);
        } else if (repID.equals(DEFAULT_REPOSITORY_ID) && getDefault() instanceof SPARQLRepository) {
            // The default repository was created using the sparqlRepositoryUrl
            // property from environment.prop
            SPARQLRepository defaultRepository = (SPARQLRepository) getDefault();
            String sparqlRepositoryUrl = defaultRepository.toString(); // returns queryEndpointUrl
            return RepositoryManager.createSPARQLRepositoryConfigForEndpoint(sparqlRepositoryUrl);
        } else if (repID.equals(DEFAULT_REPOSITORY_ID) && getDefault() instanceof MpMemoryRepository) {
            return RepositoryManager.createMpMemoryRepositoryConfig();
        } else {
            throw new IllegalArgumentException(
                    "Repository config for the repository ID '" + repID + "' does not exist (possibly, was deleted).");
        }
    }

    /**
     * @param repID The repository ID for which to retrieve the configuration model
     * @return A turtle string i.e. an RDF model of the repository configuration
     * @throws IOException               If there any problems related to reading
     *                                   the configuration file from e.g. file
     *                                   system
     * @throws RepositoryConfigException If the configuration is invalid.
     * @throws IllegalArgumentException  If the specified repository configuration
     *                                   does not exist
     */
    public String getTurtleConfigStringForRepositoryConfig(String repID)
            throws IOException, IllegalArgumentException, RepositoryConfigException {
        RepositoryConfig repConfig = getRepositoryConfig(repID);
        return RepositoryConfigUtils.convertRepositoryConfigToPrettyTurtleString(repConfig);
    }

    /**
     * @param repID The repository ID for which to retrieve the configuration model
     * @return An RDF model of the repository configuration
     * @throws IOException               If there any problems related to reading
     *                                   the configuration file from e.g. file
     *                                   system
     * @throws RepositoryConfigException If the configuration is invalid.
     * @throws IllegalArgumentException  If the specified repository configuration
     *                                   does not exist
     */
    public Model getModelForRepositoryConfig(String repID)
            throws RepositoryConfigException, IllegalArgumentException, IOException {
        RepositoryConfig repConfig = getRepositoryConfig(repID);
        return RepositoryConfigUtils.exportConfigToModel(repConfig);
    }

    @Override
    public synchronized Repository getRepository(String repID) throws RepositoryException, RepositoryConfigException {
        Optional<Repository> repo = getRepository(Optional.of(repID));
        if (repo.isPresent()) {
            return repo.get();
        } else {
            throw new IllegalArgumentException(String.format("Repository with ID \"%s\" does not exist.", repID));
        }
    }

    public synchronized void deleteRepositoryConfig(String repId) throws Exception {
        if (repId.equals(DEFAULT_REPOSITORY_ID) || repId.equals(ASSET_REPOSITORY_ID)
                || repId.equals(TEST_REPOSITORY_ID)) {
            throw new IllegalArgumentException("Cannot delete one of the pre-defined system repositories: " + repId);
        }

        validateDeletionDependencies(repId);

        if (RepositoryConfigUtils.repositoryConfigFileExists(this.platformStorage, repId)) {
            RepositoryConfigUtils.deleteRepositoryConfigurationIfExists(platformStorage, repId);
        }

        if (this.initializedRepositories.containsKey(repId)) {
            this.initializedRepositories.get(repId).shutDown();
            this.initializedRepositories.remove(repId);
            this.cacheManager.invalidateAll();
            this.ldpCache.invalidate();
        }
    }

    protected void validateDeletionDependencies(String repId) throws Exception {
        Map<String, RepositoryConfig> allConfigs = RepositoryConfigUtils
                .readInitialRepositoryConfigsFromStorage(this.platformStorage);
        Map<String, RepositoryConfig> updatedConfigs = Maps.newHashMap();
        updatedConfigs.put(repId, this.getRepositoryConfig(repId));
        Map<String, RepositoryConfig> configsToRefresh = collectRelevantRepositoryConfigs(updatedConfigs, allConfigs);
        if (configsToRefresh.size() > 1) {
            Set<String> keys = Sets.newHashSet(configsToRefresh.keySet());
            keys.remove(repId);
            throw new Exception("Cannot delete the repository " + repId
                    + " because there are other repositories dependent on it: " + keys.toString());
        }
    }

    public synchronized Optional<Repository> getRepository(Optional<String> repID)
            throws RepositoryException, RepositoryConfigException {
        return repID.filter(initializedRepositories::containsKey).map(initializedRepositories::get);
    }

    public String getRepositoryID(Repository repository) {
        for (Entry<String, Repository> rep : initializedRepositories.entrySet()) {
            if (rep.getValue().equals(repository)) {
                return rep.getKey();
            }
        }
        throw new IllegalArgumentException(
                String.format("Repository \"%s\" is not known to the repository manager.", repository));
    }

    public MpSharedHttpClientSessionManager getClientSessionManager() {
        return this.client;
    }

    @Override
    public HttpClient getHttpClient() {
        return client.getHttpClient();
    }

    @Override
    public void setHttpClient(HttpClient client) {
        this.client.setHttpClient(client);
    }

    public synchronized void reinitializeRepositories(Collection<String> ids) throws Exception {
        Map<String, RepositoryConfig> allConfigs = RepositoryConfigUtils
                .readInitialRepositoryConfigsFromStorage(this.platformStorage);
        Map<String, RepositoryConfig> updatedConfigs = Maps.newHashMap();
        for (String id : ids) {
            RepositoryConfig config = this.getRepositoryConfig(id);
            updatedConfigs.put(id, config);
        }

        Map<String, RepositoryConfig> configsToRefresh = collectRelevantRepositoryConfigs(updatedConfigs, allConfigs);
        logger.trace("Reinitializing repositories: " + configsToRefresh.keySet().toString());
        Map<String, RepositoryConfig> allConfigsSorted = RepositoryDependencySorter.sortConfigs(allConfigs);
        for (String key : allConfigsSorted.keySet()) {
            if (configsToRefresh.containsKey(key)) {
                logger.trace("Reinitializing repository: " + key);
                this.initializeRepository(configsToRefresh.get(key), true);
            }
        }
        this.cacheManager.invalidateAll();
        this.ldpCache.invalidate();
    }

    private Map<String, RepositoryConfig> collectRelevantRepositoryConfigs(Map<String, RepositoryConfig> updatedConfigs,
            Map<String, RepositoryConfig> allConfigs) throws IOException {
        Map<String, RepositoryConfig> configs = Maps.newHashMap(updatedConfigs);
        // Now we go through all initialized repositories and select all those
        // which depend on the ones from the input ids list
        // taking into account transitivity
        Map<String, RepositoryConfig> others = Maps.newHashMap(allConfigs);

        boolean exhausted = false;
        while (!exhausted) {
            exhausted = true;
            for (String id : configs.keySet()) {
                others.remove(id);
            }
            for (Entry<String, RepositoryConfig> entry : others.entrySet()) {
                if (configs.containsKey(entry.getKey())) {
                    continue;
                }
                RepositoryImplConfig implConfig = entry.getValue().getRepositoryImplConfig();
                Collection<String> delegates = Lists.newArrayList();
                if (implConfig instanceof MpDelegatingImplConfig) {
                    delegates = ((MpDelegatingImplConfig) implConfig).getDelegateRepositoryIDs();
                } else if (implConfig instanceof SailRepositoryConfig) {
                    SailImplConfig sailConfig = ((SailRepositoryConfig) implConfig).getSailImplConfig();
                    if (sailConfig instanceof MpDelegatingImplConfig) {
                        delegates = ((MpDelegatingImplConfig) sailConfig).getDelegateRepositoryIDs();
                    }
                }
                for (String delegate : delegates) {
                    if (configs.containsKey(delegate)) {
                        configs.put(entry.getKey(), entry.getValue());
                        exhausted = false;
                        break;
                    }
                }
            }
        }

        return configs;
    }

    /**
     * For JUnit test purposes only
     * 
     * @return
     */
    public Set<String> getInitializedRepositoryIds() {
        return Sets.newHashSet(this.initializedRepositories.keySet());
    }

}
