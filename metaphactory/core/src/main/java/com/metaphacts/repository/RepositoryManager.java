/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.repository;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.client.HttpClient;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.http.client.HttpClientDependent;
import org.eclipse.rdf4j.http.client.SessionManagerDependent;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolverClient;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.FederatedServiceResolverImpl;
import org.eclipse.rdf4j.query.algebra.evaluation.federation.RepositoryFederatedService;
import org.eclipse.rdf4j.repository.DelegatingRepository;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.config.DelegatingRepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryRegistry;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sail.config.RepositoryResolverClient;
import org.eclipse.rdf4j.repository.sail.config.SailRepositoryConfig;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.eclipse.rdf4j.sail.nativerdf.config.NativeStoreConfig;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.google.inject.Inject;
import com.google.inject.Injector;
import com.metaphacts.cache.CacheManager;
import com.metaphacts.config.Configuration;
import com.metaphacts.repository.sparql.MetaphactorySharedHttpClientSessionManager;
import com.metaphacts.repository.sparql.MpSPARQLRepositoryConfig;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class RepositoryManager implements RepositoryManagerInterface {

    private static final Logger logger = LogManager.getLogger(RepositoryManager.class);
    
    private Configuration config;
    @SuppressWarnings("unused")
    private CacheManager cacheManager;
    
    private final Map<String, Repository> initializedRepositories = Maps.newConcurrentMap();
    
    private final File repositoryConfigFolder;
    private final File repositoryDataFolder;
    
    public static final String DEFAULT_REPOSITORY_ID = "default";
    public static final String ASSET_REPOSITORY_ID = "assets";
    
    private final MetaphactorySharedHttpClientSessionManager client;

    // Removed the common serviceResolver as some repositories might have their own specific resolvers:
    // e.g., to make some repositories accessible via a SERVICE clause and some other ones hidden. 
    
    // private final FederatedServiceResolverImpl serviceResolver;
    
    private Injector injector;
    
    @Inject
    public RepositoryManager(Injector injector, Configuration config, CacheManager cacheManager) throws IOException {
        this.injector = injector;
        this.config=config;
        this.cacheManager = cacheManager;
        final File baseConfigFolder = new File(Configuration.getConfigBasePath());
        this.repositoryConfigFolder= new File(baseConfigFolder,"repositories");
        if(!this.repositoryConfigFolder.exists()){
            FileUtils.forceMkdir(this.repositoryConfigFolder);
        }
        final File baseDataFolder = new File(config.getRuntimeDirectory(), "data");
        this.repositoryDataFolder = new File(baseDataFolder, "repositories");
        this.client = new MetaphactorySharedHttpClientSessionManager(config);
        init();
        addShutdownHook(this);
    }
    
    private void init(){
        Map<String, RepositoryConfig> configs = RepositoryConfigUtils.readInitialRepositoryConfigsFromFileSystem(
                this.repositoryConfigFolder
        );
        
        configs = RepositoryDependencySorter.sortConfigs(configs);
        
        // initialize default and asset repository first
        initializeDefaultRepositories(configs);
        
        for(RepositoryConfig config : configs.values()){
            if (!isInitialized(config.getID())) {
                initializeRepository(config);
            }
        }
        
    }
    
    /**
     * Sends a simple test query to all available repositories. 
     * Moved out of the constructor routine to avoid Guice circular dependency errors  
     * caused by repositories that themselves use RepositoryManager. 
     * At the moment called explicitly from GuiceServletConfig. 
     * 
     */
    public void sentTestQueries() {
        for (Entry<String, Repository> entry : initializedRepositories.entrySet()) {
            this.sendTestQuery(entry.getKey(), entry.getValue());
        }
    }
    
    private void addShutdownHook(final RepositoryManager repositoryManager) {
        Runtime.getRuntime().addShutdownHook(new Thread() {
            public void run() {
                logger.info("Trying to shutdown repository manager.");
                repositoryManager.shutdown();
            }
        });
    }
    
    public Repository getDefault(){
        return this.getRepository(DEFAULT_REPOSITORY_ID);
    }

    public Repository getAssetRepository(){
        return this.getRepository(ASSET_REPOSITORY_ID);
    }

    /**
     * <b>NEVER CALL THIS METHOD </b>
     *  This is for testing purpose only.
     */
    public void setForTests(Repository defaultRepository, Repository assetRepository) {
       if(initializedRepositories.containsKey(DEFAULT_REPOSITORY_ID)){
           initializedRepositories.get(DEFAULT_REPOSITORY_ID).shutDown();
       }
        initializedRepositories.put(DEFAULT_REPOSITORY_ID, defaultRepository);

        if (initializedRepositories.containsKey(ASSET_REPOSITORY_ID)) {
            initializedRepositories.get(ASSET_REPOSITORY_ID).shutDown();
        }
        initializedRepositories.put(ASSET_REPOSITORY_ID, assetRepository);
    }
    
    private boolean isInitialized(String repID){
        return initializedRepositories.containsKey(repID);
    }

    private boolean isProtected(String repID){
        return repID.equals(DEFAULT_REPOSITORY_ID) || repID.equals(ASSET_REPOSITORY_ID);
    }
    
    private File getRepositoryDataFolder(){
        return this.repositoryDataFolder;
    }
    
    private void initializeDefaultRepositories(Map<String, RepositoryConfig> repositoryConfigs){
        String sparqlRepositoryUrl = this.config.getEnvironmentConfig().getSparqlEndpoint();
        if(!StringUtils.isEmpty(sparqlRepositoryUrl)){
            logger.info("Initializing HTTP Sparql Repository with URL: {}.", sparqlRepositoryUrl);
            RepositoryConfig repConfig = new RepositoryConfig(DEFAULT_REPOSITORY_ID, "Default HTTP SPARQL Repository");
            MpSPARQLRepositoryConfig repImplConfig = new MpSPARQLRepositoryConfig();
            repImplConfig.setQueryEndpointUrl(sparqlRepositoryUrl);
            repImplConfig.setUsingQuads(true);
            repConfig.setRepositoryImplConfig(repImplConfig);
            initializeRepository(repConfig);
        }else if (repositoryConfigs.containsKey(DEFAULT_REPOSITORY_ID)){
            // Do nothing: the repository will be initialized in the standard sequence
            // from a Turtle file
        }else{
            String msg = "Default HTTP Sparql Repository has not been initialized since it was null. "
                    + "Please set the property \"sparqlEndpoint\" in your environment.prop configuration file "
                    + "to point to your SPARQL endpoint or specify a repository by creating a configuraiton file /config/repositories/default.ttl.";
            logger.error(msg);
        }
        
        if(repositoryConfigs.containsKey(ASSET_REPOSITORY_ID)){
            // Do nothing: the repository will be initialized in the standard sequence
            // from a Turtle file
        }else{
            logger.info("Creating a default assets repository configuration");
            final RepositoryConfig repConfig = new RepositoryConfig(
                    ASSET_REPOSITORY_ID , 
                    "Asset repository for platform or user specific artefacts."
            );
            repConfig.setRepositoryImplConfig(
                    new SailRepositoryConfig(
                            new NativeStoreConfig()
                    )
            );
            try {
                RepositoryConfigUtils.writeRepositoryConfigAsPrettyTurtleToFile(this.repositoryConfigFolder, repConfig, false);
            } catch (RepositoryConfigException | IOException e) {
                logger.error("Failed to persist auto-generated, default configuration for asset repository: {}", e.getMessage());
            }
            initializeRepository(repConfig);
        }
        
    }
    
    private void sendTestQuery(String id, Repository repository){
        logger.info("Testing connection for repository \"{}\".", id);
        try(RepositoryConnection con = repository.getConnection()){
            try(TupleQueryResult tqr = con.prepareTupleQuery("SELECT * WHERE { GRAPH ?g { ?a ?b ?c} } LIMIT 1").evaluate()){
                if (tqr.hasNext()) {
                    logger.info(
                            "Connection to repository \"{}\" has been established successfully.",
                            id);
                } else {
                    logger.warn(
                            "Connection to repository \"{}\" has been established successfully. However, repository seems to be empty.",
                            id);
                }
            }
        }catch(Exception e){
            logger.error(
                    "Failed to send test query to repository \"{}\": {} \n"
                  + "If you are using the ZIP distribution, the reason might be that the blazegraph container is not yet initialized i.e. in this case you may ignore this warning. ",
                    id, e.getMessage());
        }
    }
    
    private synchronized Repository initializeRepository(
            RepositoryConfig repConfig) throws RepositoryException {
        logger.info("Trying to initialize repository with id \"{}\"",repConfig.getID());
        if (isInitialized(repConfig.getID())) {
            throw new IllegalStateException(
                    String.format( 
                            "Repository with id \"%s\" is already initialized. ",
                            repConfig.getID() ) );
        }
        final RepositoryImplConfig repConfigImpl = repConfig.getRepositoryImplConfig();
        Repository repository = createRepositoryStack(repConfigImpl);
        // set the data dir to /data/repositories/{repositoryID}
        // this is mainly relevant for native repository
        repository.setDataDir(new File(getRepositoryDataFolder(),repConfig.getID()));
        
        repository.initialize();
        initializedRepositories.put(repConfig.getID(), repository);
        logger.info("Repository with id \"{}\" successfully initialized",repConfig.getID());
        
        return repository;
    }
    
    protected synchronized Repository createRepositoryStack(RepositoryImplConfig repImplConfig) {
        RepositoryFactory factory = RepositoryRegistry
                .getInstance()
                .get(
                        repImplConfig.getType())
                            .orElseThrow(
                                () -> new RepositoryConfigException(
                                        "Unsupported repository type: " 
                                                + repImplConfig.getType()));
        Repository repository = factory.getRepository(repImplConfig);
        
        injector.injectMembers(repository);
        
        if (repImplConfig instanceof DelegatingRepositoryImplConfig) {
            RepositoryImplConfig delegateConfig = 

                    ((DelegatingRepositoryImplConfig)repImplConfig).getDelegate();
            Repository delegate = createRepositoryStack(delegateConfig);
            try {
                ((DelegatingRepository)repository).setDelegate(delegate);
            } catch (ClassCastException e) {
                throw new RepositoryConfigException(
                        "Delegate specified for repository that is not a DelegatingRepository: "
                                + delegate.getClass(),
                        e);
            }
        }
        
        if (repository instanceof SailRepository) {
            injector.injectMembers(((SailRepository)repository).getSail());
        }
        
        if (repository instanceof RepositoryResolverClient) {
            ((RepositoryResolverClient)repository).setRepositoryResolver(this);
        }
        if (repository instanceof SessionManagerDependent) {
            ((SessionManagerDependent)repository).setHttpClientSessionManager(client);
        } else if (repository instanceof HttpClientDependent) {
            ((HttpClientDependent)repository).setHttpClient(getHttpClient());
        }
        return repository;
    }
    
    public synchronized void shutdown(){
        for(Entry<String, Repository> entry : initializedRepositories.entrySet()){
           try{
               if(isProtected(entry.getKey())){
                   continue;
               }
               logger.info("Trying to shutdown repository \"{}\".", entry.getKey());
               entry.getValue().shutDown();
               initializedRepositories.remove(entry.getKey());
           }catch(RepositoryException e){
               // we will catch and log the exception, so that at least remaining repositories can be shut down
               logger.error("Error while shutting down the repository \"{}\": {}", entry.getKey(), e.getMessage());
           }
        }
        // handle protected repositories separately 
        getDefault().shutDown();
        getAssetRepository().shutDown();
        initializedRepositories.clear();
    } 
    
    public synchronized void shutdownRepository(final String repID) throws RepositoryException, IllegalArgumentException{
        if(isInitialized(repID)){
            initializedRepositories.get(repID).shutDown();
            initializedRepositories.remove(repID);
        }else if(isProtected(repID)){
            throw new IllegalAccessError(
                    String.format("Default repository with ID \"%s\" can not be removed.", repID)
            );
        }else{
            throw new IllegalArgumentException(
                    String.format("Repository with ID \"%s\" does not exist.", repID)
            );
        }
    }
    
    public void createNewRepository(Model repositoryConfigModel) throws RepositoryConfigException, IOException{
        RepositoryConfig repConfig = RepositoryConfigUtils.createRepositoryConfig(repositoryConfigModel);
        RepositoryConfigUtils.writeRepositoryConfigAsPrettyTurtleToFile(this.repositoryConfigFolder, repConfig, false);
    }
    
    public Map<String,Boolean> getAvailableRepositoryConfigs(){
        Map <String, Boolean> map = Maps.newHashMap();
        
        for( String repID : Sets.union(initializedRepositories.keySet(), RepositoryConfigUtils.readInitialRepositoryConfigsFromFileSystem(this.repositoryConfigFolder).keySet())){
            map.put(repID, isInitialized(repID));
        }
        return map;
    }
    
    /**
     * @param repID The repository ID for which to retrieve the configuration model
     * @return A turtle string i.e. an RDF model of the repository configuration
     * @throws IOException If there any problems related to reading the configuration file from e.g. file system
     * @throws RepositoryConfigException If the configuration is invalid.
     * @throws IllegalArgumentException If the specified repository configuration does not exist
     */
    public String getTurtleConfigStringForRepositoryConfig(String repID) throws IOException, IllegalArgumentException, RepositoryConfigException{
        final RepositoryConfig repConfig = RepositoryConfigUtils.readRepositoryConfigurationFile(this.repositoryConfigFolder, repID);
        return RepositoryConfigUtils.convertRepositoryConfigToPrettyTurtleString(repConfig);
    }
    
    @Override
    public synchronized Repository getRepository(String repID) throws RepositoryException, RepositoryConfigException {
        Optional<Repository> repo = getRepository(Optional.of(repID));
        if (repo.isPresent()) {
            return repo.get();
        } else {
            throw new IllegalArgumentException(
                String.format("Repository with ID \"%s\" does not exist.", repID)
            );
        }
    }
    
    public synchronized Optional<Repository> getRepository(Optional<String> repID) throws RepositoryException, RepositoryConfigException {
        return repID.filter(initializedRepositories::containsKey).map(initializedRepositories::get);
    }
    
    public String getRepositoryID(Repository repository){
        for( Entry<String, Repository> rep : initializedRepositories.entrySet()){
            if(rep.getValue().equals(repository)){
                return rep.getKey();
            }
        }
        throw new IllegalArgumentException(
                String.format("Repository \"%s\" is not known to the repository manager.", repository)
        ); 
    }
    
    public MetaphactorySharedHttpClientSessionManager getClientSessionManager() {
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
    
}