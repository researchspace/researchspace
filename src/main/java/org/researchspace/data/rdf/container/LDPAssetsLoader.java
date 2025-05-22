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

package org.researchspace.data.rdf.container;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.inject.Singleton;

import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryResult;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.config.Configuration;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.kp.KnowledgePatternGenerator;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StoragePath;
import org.researchspace.services.storage.api.PlatformStorage.FindResult;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.PROV;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

/**
 * A singleton responsible for loading LDP assets saved in storages into the
 * corresponding repositories at startup
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
@Singleton
public class LDPAssetsLoader {

    private static final Logger logger = LogManager.getLogger(LDPAssetsLoader.class);
    private static final long MAX_BNODE_COMPARING_NUMBER = 10;

    @Inject
    RepositoryManager repositoryManager;

    @Inject
    private PlatformStorage platformStorage;
    
    @Inject
    private Configuration configuration;

    @Inject
    private KnowledgePatternGenerator pg;

    public LDPAssetsLoader() {

    }
    
    private String getRepositoryIdFromObjectId(StoragePath path) {
        StoragePath repositoryPrefix = path.getParent();
        if (!ObjectKind.LDP.equals(repositoryPrefix.getParent())) {
            throw new IllegalArgumentException("All LDP assets must be stored under the path "
                    + ObjectKind.LDP.toString() + "/{repositoryId}/{resourceIri}.trig; "
                    + "This object does not follow this pattern: " + path);
        }
        return repositoryPrefix.getLastComponent();
    }

    private boolean isLoadableFromStorage(String repositoryId) {
        return configuration.getGlobalConfig().getRepositoriesLDPLoad().contains(repositoryId);
    }

    private boolean isForceLoadFromStorage(String storageId) {
        return configuration.getGlobalConfig().getForceLDPLoadFromStorages().contains(storageId);
    }
    
    public void load() throws StorageException, IOException, UnknownConfigurationException, Exception {
        Map<StoragePath, FindResult> mapResults = platformStorage.findAll(ObjectKind.LDP);
        Map<String, Map<String, Map<StoragePath, FindResult>>> mapResultsByRepositoryIdAndStorageId = Maps.newHashMap();
        logger.info("Loading LDP assets...");

        Integer loadDefaultConfig = -2;
        List<String> defaultRepositoriesList = Arrays.asList("configurations", "system", "ontologies", "authorities");

        String checkIfDefaultRepoHasData =                                 
                    "SELECT * WHERE {?s ?p ?o .} limit 1";

        if (hasDefaultAlreadyLoaded(checkIfDefaultRepoHasData)) {
            /* repository has data and the loadDefaultConfig flag needs to be setup */ 
            /* show a message and ask for it to be setup */
            if ((loadDefaultConfig=configuration.getGlobalConfig().getLoadDefaultConfig()) == -1) {
                logger.fatal(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"); 
                logger.fatal(">>>> loadDefaultConfig needs to be set to 0 or 1 in your runtime-data/config/global.prop <<<");
                logger.fatal(">>>> More details in the release-notes.md                                                <<<");               
                logger.fatal(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"); 
                
                //throw new UnknownConfigurationException();
            }
        }
        else {
            if ((loadDefaultConfig=configuration.getGlobalConfig().getLoadDefaultConfig()) != 0)
                loadDefaultConfig = 1;
        }      
        
        // Distribute the results by target repository and source storage
        for (Entry<StoragePath, FindResult> entry : mapResults.entrySet()) {
            String repositoryId = getRepositoryIdFromObjectId(entry.getKey());
            Map<String, Map<StoragePath, FindResult>> currentRepositoryMap = mapResultsByRepositoryIdAndStorageId
                    .get(repositoryId);
            if (currentRepositoryMap == null) {
                currentRepositoryMap = Maps.newHashMap();
                mapResultsByRepositoryIdAndStorageId.put(repositoryId, currentRepositoryMap);
            }

            String storageId = entry.getValue().getAppId();
            Map<StoragePath, FindResult> currentStorageMap = currentRepositoryMap.get(storageId);
            if (currentStorageMap == null) {
                currentStorageMap = Maps.newHashMap();
                currentRepositoryMap.put(storageId, currentStorageMap);
            }

            currentStorageMap.put(entry.getKey(), entry.getValue());
        }
    
        // Load each batch separately into the corresponding repository
        for (Entry<String, Map<String, Map<StoragePath, FindResult>>> entry : mapResultsByRepositoryIdAndStorageId
                .entrySet()) {
            if (isLoadableFromStorage(entry.getKey()) || defaultRepositoriesList.contains(entry.getKey())) {
                boolean isWritable = repositoryManager.getRepository(entry.getKey()).isWritable();
                if (isWritable) {                                                  
                    if (!defaultRepositoriesList.contains(entry.getKey())){
                        /* Load non-default repositories */
                        loadAllToRepository(entry.getKey(), entry.getValue());
                    } else if (loadDefaultConfig == 1) {
                        if (entry.getKey().equals("configurations")) {                            
                            loadAllToRepository(entry.getKey(), entry.getValue());    
                        } 
                        else if (entry.getKey().equals("authorities")) {
                            loadAllToRepository(entry.getKey(), entry.getValue());    
                        }
                        else if (entry.getKey().equals("system")) {
                            loadAllToRepository(entry.getKey(), entry.getValue());
                        }
                        else if (entry.getKey().equals("ontologies")) {
                            String checkIfOntologiesExist = 
                                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +                    
                                    "SELECT * WHERE {" +
                                                "?ontology a owl:Ontology . " +
                                    "} LIMIT 1";
                            if (!hasDefaultAlreadyLoaded(checkIfOntologiesExist)) {
                                loadAllToRepository(entry.getKey(), entry.getValue());
                                checkIfKPsExistForPreloadedOntologiesAndLoad();
                            }
                        }
                    }
                }
                else {
                    logger.warn("Skipping loading of LDP assets into the " + entry.getKey()
                            + " repository, because it is not writable!");
                }
                
            } else {
                if (!defaultRepositoriesList.contains(entry.getKey())){
                    logger.info("Skipping loading LDP assets into the \"" + entry.getKey()
                                + "\" repository: the repository is not listed in "
                                + "\"repositoriesLDPLoad\" property in \"global.prop\"");
                } else {
                    logger.info("Skipping loading LDP assets into the \"" + entry.getKey()
                                + "\" repository: the repository is loaded only when "
                                + "loadDefaultConfig is set to 1 in \"global.prop\"");
                }
            }
        }
        logger.info("All LDP assets loading finished");

        
    }
    
    private boolean hasDefaultAlreadyLoaded(String query) throws Exception {
        List<BindingSet> results = Repositories.tupleQuery(
            repositoryManager.getDefault(), 
            query, 
            iteration -> {
                try {
                    return QueryResults.asList(iteration);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }
        );
        logger.info("results");logger.info(!results.isEmpty());
        return !results.isEmpty();
    }
    
    private void checkIfKPsExistForPreloadedOntologiesAndLoad() {
        //generate KPs if they don't already exist
        String checkIfKPsExistForPreloadedOntologies = "" +
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "SELECT ?ontology (count(?prop) as ?propCount) (count(?kp) as ?kpCount) {" +
                                "?ontology a owl:Ontology . " +
                                "BIND((IF((STRENDS(STR(?ontology),\"/\")),STR(?ontology),CONCAT(STR(?ontology),\"/\"))) as ?ontologyURI)" +
                                "BIND(IRI(CONCAT(STR(?ontologyURI),\"context\")) as ?ontologyContext)" +
                                "{" +
                                "graph ?ontologyContext {" +
                                "  ?prop a ?owlType . " +
                                "  FILTER (?owlType IN (owl:DatatypeProperty,owl:ObjectProperty)) " +    
                                "  FILTER(CONTAINS(STR(?prop),REPLACE(STR(?ontologyContext),\"/context\",\"\"))) " +
                                "}" +
                                "}" +
                                "UNION { " +
                                "  ?kp a <http://www.researchspace.org/resource/system/fields/Field> ." +
                                "  ?kp a ?owlType ." +
                                "  VALUES ?owlType {owl:ObjectProperty owl:DatatypeProperty owl:AnnotationProperty rdf:Property}" +
                            "}" +
                            "}" + 
                            "group by ?ontology";
        
        Repository defaultRepository = repositoryManager.getDefault();
            
        // connection and to run the sparql query
        logger.trace(checkIfKPsExistForPreloadedOntologies);
        try (RepositoryConnection con = defaultRepository.getConnection()) {
            try (TupleQueryResult tqr = con.prepareTupleQuery(checkIfKPsExistForPreloadedOntologies).evaluate()) {
                while (tqr.hasNext()) {
                    BindingSet bs = tqr.next();

                    int kpCountValue = Integer.parseInt(bs.getBinding("kpCount").getValue().stringValue());
                    int propCountValue = Integer.parseInt(bs.getBinding("propCount").getValue().stringValue());

                    /* Generate KPs only once when ontologies are loaded for the first time */
                    if (propCountValue != kpCountValue) {
                        //generate KPs for the current ontology       
                        IRI ontologyIri = SimpleValueFactory.getInstance().createIRI(bs.getBinding("ontology").getValue().stringValue()); 
                        logger.trace("start generating knowledge patterns for ");
                        logger.trace(ontologyIri);               
                        pg.generateKnowledgePatternsFromOntology(ontologyIri);                        
                    }                                    
                }
            }
        } catch (Exception e) {
            logger.error("Failed to run knowledge patterns generator.... \n");
            logger.error(e.getMessage());           
        }
    }

    private void loadAllToRepository(String repositoryId, Map<String, Map<StoragePath, FindResult>> mapResults)
            throws IOException {
        Repository repository = repositoryManager.getRepository(repositoryId);

        for (Entry<String, Map<StoragePath, FindResult>> storageEntry : mapResults.entrySet()) {
            LinkedHashModel loadedAssetsModel = new LinkedHashModel();
            logger.info("Loading " + storageEntry.getValue().size() + " LDP assets into the \"" + repositoryId + "\" repository");
                        
            for (Entry<StoragePath, FindResult> entry : storageEntry.getValue().entrySet()) {
                StoragePath path = entry.getKey(); 
                boolean hasKnownFormat = (path.hasExtension(".trig") || path.hasExtension(".nq")
                        || path.hasExtension(".trix"));
                if (!hasKnownFormat) {
                    continue;
                }
                Optional<RDFFormat> optFormat = Rio.getParserFormatForFileName(path.getLastComponent());
                if (!optFormat.isPresent()) {
                    logger.error("Unknown assets format: " + path.getLastComponent());
                    continue;
                }
                RDFFormat format = optFormat.get();
                if (!format.equals(RDFFormat.NQUADS) && !format.equals(RDFFormat.TRIG)
                        && !format.equals(RDFFormat.TRIX)) {
                    logger.error(
                            "Unsupported assets format " + format.toString() + " for the object " + entry.getKey());
                }
                ObjectRecord record = entry.getValue().getRecord();
                try (InputStream in = record.getLocation().readContent()) {
                    Model model = Rio.parse(in, "", format);             
                    loadedAssetsModel.addAll(model);                   
                } catch (IOException | RDFParseException e) {
                    logger.error("Failed to parse LDP asset: " + record.getPath() + ". Details: " + e.getMessage());
                    throw e; // just propagate
                }
            }
            logger.info("Read " + mapResults.size() + " assets. Loading into the repository...");

            try (RepositoryConnection conn = repository.getConnection()) {

                if (this.isForceLoadFromStorage(storageEntry.getKey())) {
                    Set<Resource> contextsToLoad = loadedAssetsModel.contexts();
                    conn.clear(contextsToLoad.toArray(new Resource[contextsToLoad.size()]));
                    contextsToLoad.forEach(res -> logger.info(res.stringValue()));
                        
                    LDPImplManager.getLDPImplementation(
                                    FieldDefinitionContainer.IRI,
                                    Sets.newIdentityHashSet(),
                                    new MpRepositoryProvider(repositoryManager, RepositoryManager.ASSET_REPOSITORY_ID)
                                    );
                    conn.add(loadedAssetsModel);     
                    
                } else {
                    
                    // We only load the contexts, which are not present in the assets repository
                    // If present with different content, an error is thrown.
                    List<Resource> toLoad = selectContentToLoad(repositoryId, loadedAssetsModel, conn);
                    
                    // From selected toLoad determine if any should be overwritten by default
                    for (Resource ctx : toLoad) {                       
                        // Process each resource as needed
                        if (repositoryId.equals("system")) {  
                            logger.info("Reload system knowledge pattern: "+ctx.stringValue());  
                            conn.clear(ctx);                           
                        }
                        else if (repositoryId.equals("authorities")) {                                                    
                            List<PlatformStorage.FindResult> overrides = getOverrides(ctx, repositoryId);
                            if (overrides.size() == 1) {
                                if (overrides.get(0).getAppId().equals("default")) {
                                    logger.info("Reload default authority document from: "+ctx.stringValue()); 
                                    conn.clear(ctx);
                                }
                            } else if (overrides.size() > 1) {
                                // do not load from default
                            }
                        }
                        else if (repositoryId.equals("configurations")) {  
                            List<PlatformStorage.FindResult> overrides = getOverrides(ctx, repositoryId);  
                            if (overrides.size() == 1) {
                                if (overrides.get(0).getAppId().equals("default")) {
                                    logger.info("Reload default configuration from: "+ctx.stringValue()); 
                                    conn.clear(ctx);
                                }
                            } else if (overrides.size() > 1) {
                                // do not load from default
                            }                                       
                            
                        }
                    }
                    
                    ldpContainersConsistencyCheck(repositoryId, loadedAssetsModel, conn);
                    for (Resource ctx : toLoad) {
                        logger.trace("Loading LDP asset context: " + ctx.stringValue());
                        Model currentAsset = loadedAssetsModel.filter(null, null, null, ctx);                   
                        conn.add(currentAsset);
                    }
                }
            }
        }
        logger.info("Loading finished.");
    }

    /**
        * Check if the loaded data references includes some not available containers.
        * Those containers we would need to add to the assets repository.
        * 
        * @param repositoryId
        * @param loadedAssetsModel
        * @param conn
        */
    private void ldpContainersConsistencyCheck(String repositoryId, Model loadedAssetsModel, RepositoryConnection conn)
            throws IllegalStateException {
        // Select all containers mentioned in the loaded data
        Set<IRI> mentioned = loadedAssetsModel.filter(null, LDP.contains, null).stream().map(stmt -> stmt.getSubject())
                .filter(subj -> subj instanceof IRI).map(subj -> (IRI) subj).collect(Collectors.toSet());
        // Select all containers already defined in the loaded data
        Set<Resource> defined = loadedAssetsModel.filter(null, RDF.TYPE, LDP.Container).stream()
                .map(stmt -> stmt.getSubject()).collect(Collectors.toSet());
        // get resources that mention an unknown container
        mentioned.removeAll(defined);
        // check containers that are defined in the repository
        mentioned = mentioned.stream()
                .filter(containerIri -> !conn.hasStatement(containerIri, RDF.TYPE, LDP.Container, false))
                .collect(Collectors.toSet());
        Set<IRI> types = Sets.newHashSet();
        // check standard containers defined in the platform
        Set<IRI> knownContainers = mentioned.stream()
                .filter(containerIri -> LDPImplManager.isKnownContainer(containerIri)).collect(Collectors.toSet());
        mentioned.removeAll(knownContainers);

        if (!mentioned.isEmpty()) {
            String msg = "Loaded LDP data references unknown containers: " + mentioned.toString();
            logger.error(msg);
            throw new IllegalStateException(msg);
        }

        // for the standard containers mentioned in the loaded data:
        // initialize them and add to the assets repository
        knownContainers.stream().forEach(containerIri -> LDPImplManager.getLDPImplementation(containerIri, types,
                new MpRepositoryProvider(this.repositoryManager, repositoryId)));
    }

    /**
        * Check whether the content of loaded assets data is consistent with the
        * content of the assets repository, i.e., if the same named graph is contained
        * in both the loaded data and the assets repository, their content must be
        * equivalent.
        * 
        * @param repositoryId
        * @param loadedAssetsModel
        * @param conn
        * @throws IllegalStateException
        */
    // static package private for testing
    static List<Resource> selectContentToLoad(String repositoryId, Model loadedAssetsModel, RepositoryConnection conn)
            throws IllegalStateException {
        Set<Resource> contextsLoaded = loadedAssetsModel.contexts();
        LinkedHashModel modelExisting;
        Set<Resource> inconsistentContexts = Sets.newHashSet();
        List<Resource> toLoad = Lists.newArrayList();
        for (Resource ctx : contextsLoaded) {
            Model modelLoaded = loadedAssetsModel.filter(null, null, null, ctx);//from local storage + jnl
            modelExisting = new LinkedHashModel();
            try (RepositoryResult<Statement> res = conn.getStatements(null, null, null, ctx)) { 
                while (res.hasNext()) {
                    modelExisting.add(res.next());
                }
            }
            /* Allow all repositories to be loaded for the first time */
            if (modelExisting.isEmpty()) {
                toLoad.add(ctx);
            } 
            else {
                if (!LDPAssetsLoader.compareModelsWithoutDates(modelExisting, modelLoaded)) {
                    if (repositoryId.equals("system")) {  
                        toLoad.add(ctx);
                    }
                    else if (repositoryId.equals("authorities")) {                         
                        toLoad.add(ctx);
                    }
                    else if (repositoryId.equals("configurations")) {  
                        toLoad.add(ctx);
                    } 
                    inconsistentContexts.add(ctx);
                                        
                } 
                
                
            } 
        } 
    

        if (!inconsistentContexts.isEmpty() && ! repositoryId.equals("system") && !(repositoryId.equals("authorities")) 
                && !(repositoryId.equals("configurations"))) {            
            String msg = "Inconsistent state of the LDP assets storage: the content of named graphs "
                    + inconsistentContexts.toString() + " in the \"" + repositoryId
                    + "\" repository does not correspond to the content loaded from storage; To reconcile the two remove either the one from the database or the one from the storage being loaded";
            logger.error(msg);
            throw new IllegalStateException(msg);
        }
        logger.info("Selected to load: " + toLoad.size());
        return toLoad;
    }

    private List<PlatformStorage.FindResult> getOverrides(Resource ctx, String repositoryId) {
        ValueFactory VF = SimpleValueFactory.getInstance();
        StoragePath objectId = ObjectKind.LDP.resolve(repositoryId)
                                .resolve(StoragePath.encodeIri(VF.createIRI(ctx.stringValue()))).addExtension(".trig");
        List<PlatformStorage.FindResult> overrides = null;
        try {
            overrides = platformStorage.findOverrides(objectId);
            logger.info("Found overrides: "+overrides.size());

            for (PlatformStorage.FindResult override : overrides) {
                ObjectRecord record = override.getRecord();
                logger.info("Location: "+record.getPath()+" from "+override.getAppId().toString());                    
            }
        } catch(StorageException e) {
            return null;
        }
        return overrides;
    }

    /**
     * Compares two graph models on isomorphism ignoring any stmts with the
     * {@link PROV#generatedAtTime} predicate. The issue is that database like, for
     * example, blazegraph serialize the dateTime values by normalizing the timezone
     * difference to integer dot notation, whereas rdf4j serializes them 1:1 i.e.
     * using the default timezone in the literal creation (c.f. ID-1224).
     * 
     * @param model1
     * @param model2
     * @return true if the models are equal
     */
    static boolean compareModelsWithoutDates(Model model1, Model model2) {

        // Here we create copies of the incoming models and remove statements
        // with dateTime or double literals in the object information
        // as well as the context information. Background is that date/double literal
        // handling
        // in Blazegraph is different from RDF4J serializations (e.g. timezone, floating
        // numbers),
        // Moreover the context matching does not work when the source of the assets is
        // a
        // blazegraph repository.

        Model model1WithoutDate = new LinkedHashModel();
        model1.stream().filter(st -> resourceIsNotDateTimeOrDouble(st.getObject())).map(st -> SimpleValueFactory
                .getInstance().createStatement(st.getSubject(), st.getPredicate(), st.getObject()))
                .forEach(st -> model1WithoutDate.add(st));

       
        Model model2WithoutDate = new LinkedHashModel();
        model2.stream().filter(st -> resourceIsNotDateTimeOrDouble(st.getObject())).map(st -> SimpleValueFactory
                .getInstance().createStatement(st.getSubject(), st.getPredicate(), st.getObject()))
                .forEach(st -> model2WithoutDate.add(st));

        // we call here our custom isomorphism comparator due to the performance issues
        // with the
        // rdf4j implementation (ID-1130 and
        // https://github.com/eclipse/rdf4j/issues/1441)
        /* 
        if (!LDPModelComparator.compare(model1WithoutDate, model2WithoutDate)) {
            for (Statement stmt : model1WithoutDate) {
                logger.info(stmt.getSubject() + " " + stmt.getPredicate()+ " " + stmt.getObject());
            }
            logger.info("------------------------------------------------------------------------");
            for (Statement stmt : model2WithoutDate) {
                logger.info(stmt.getSubject() + " " + stmt.getPredicate()+ " " + stmt.getObject());
            }
        }*/
        return LDPModelComparator.compare(model1WithoutDate, model2WithoutDate);

    }

    /**
     * Returns true if the provided {@link Value} is a {@link Literal} AND is not of
     * datatype {@link XMLSchema#DATETIME} or {@link XMLSchema#DOUBLE}
     * 
     * @param value
     * @return
     */
    static boolean resourceIsNotDateTimeOrDouble(Value value) {
        List<IRI> blacklist = Lists.newArrayList(XMLSchema.DATETIME, XMLSchema.DOUBLE);
        if (value != null && value instanceof Literal) {
            Literal lit = (Literal) value;
            return !blacklist.contains(lit.getDatatype());
        }
        return true;
    }

    /**
     * Fixes ID-1130, where the platform hangs during startup, i.e. when comparing
     * LDP models from assets repositories and apps.
     * 
     * The following shell-class uses parts of the original
     * {@link Models#isomorphic(Iterable, Iterable)} function , but provides an
     * improved comparison function. The efficiency is achieved by improving the
     * blank nodes comparison part of the algorithm. Here we hash blank nodes and
     * compare the number of hash statements. If the number of hashes are equal then
     * the blank parts are equal (this heuristic can be obviously improved in
     * future). The other parts of the graph are still compared the same way as
     * before used by the Model.isomorphic function.
     */
    public static class LDPModelComparator {
        // Entry point
        public static boolean compare(Model model1, Model model2) {
            if (model1.size() != model2.size()) { logger.info("different sizes");
                return false;
            }

            FragmentedModel fragmentedModel1 = fragmentModel(model1);
            FragmentedModel fragmentedModel2 = fragmentModel(model2);

            if (fragmentedModel1.blankStatements.size() != fragmentedModel2.blankStatements.size()) {logger.info("different blank sizes");
                return false;
            }

            boolean dangerousNumberOfBlankNodes = fragmentedModel1.blankStatements.size() > MAX_BNODE_COMPARING_NUMBER
                    || fragmentedModel2.blankStatements.size() > MAX_BNODE_COMPARING_NUMBER;

            if (dangerousNumberOfBlankNodes) {
                return Models.isomorphic(fragmentedModel1.basicStatements, fragmentedModel2.basicStatements)
                        && isomorphicBlankNodes(fragmentedModel1.blankStatements, fragmentedModel2.blankStatements);
            } else {
                return Models.isomorphic(model1, model2);
            }
        }

        // Break model into parts (blank nodes and ordinary nodes)
        private static FragmentedModel fragmentModel(Model model) {
            List<Statement> blankStatements = new ArrayList<>(model.size());
            List<Statement> basicStatements = new ArrayList<Statement>(model.size());

            for (Statement st : model) {
                if (isBlank(st.getSubject()) || isBlank(st.getObject()) || isBlank(st.getContext())) {
                    blankStatements.add(st);
                } else {
                    basicStatements.add(st);
                }
            }

            return new FragmentedModel(basicStatements, blankStatements);
        }

        // Improved part of the algorithm
        private static boolean isomorphicBlankNodes(List<Statement> model1, List<Statement> model2) {
            Map<StatementKey, Long> model1Stat = prepareStatistic(model1);
            Map<StatementKey, Long> model2Stat = prepareStatistic(model2);

            for (StatementKey key : model1Stat.keySet()) {
                if (model1Stat.get(key) != model2Stat.get(key)) {
                    return false;
                }
            }
            return true;
        }

        // Count hashed statements
        private static Map<StatementKey, Long> prepareStatistic(List<Statement> model) {
            Map<StatementKey, Long> statistic = new HashMap<>();
            for (Statement st : model) {
                StatementKey key = new StatementKey(st);
                statistic.putIfAbsent(key, 0L);
                statistic.computeIfPresent(key, (curKey, value) -> value + 1);
            }
            return statistic;
        }

        // Copy-past from original isomorphic algorithm
        private static boolean isBlank(Value value) {
            if (value instanceof IRI) {
                return value.stringValue().indexOf("/.well-known/genid/") > 0;
            } else {
                return value instanceof BNode;
            }
        }

        private static class FragmentedModel {
            public List<Statement> blankStatements;
            public List<Statement> basicStatements;

            public FragmentedModel(List<Statement> basicStatements, List<Statement> blankStatements) {
                this.basicStatements = basicStatements;
                this.blankStatements = blankStatements;
            }
        }

        // Hash class
        /* package private for testing */
        static class StatementKey {
            public Statement statement;

            public StatementKey(Statement statement) {
                this.statement = statement;
            }

            @Override
            public boolean equals(Object o) {
                if (this == o)
                    return true;
                if (o == null)
                    return false;
                StatementKey that = (StatementKey) o;

                Resource subject1 = this.statement.getSubject();
                Resource subject2 = that.statement.getSubject();
                Resource predicate1 = this.statement.getPredicate();
                Resource predicate2 = that.statement.getPredicate();
                Value object1 = this.statement.getObject();
                Value object2 = that.statement.getObject();
                Resource context1 = this.statement.getContext();
                Resource context2 = that.statement.getContext();

                return equalsIgnoreBlanks(subject1, subject2) && equalsIgnoreBlanks(predicate1, predicate2)
                        && equalsIgnoreBlanks(object1, object2) && equalsIgnoreBlanks(context1, context2);

            }

            private boolean equalsIgnoreBlanks(Value a, Value b) {
                return Objects.equals(a, b) || (isBlank(a) && isBlank(b));
            }

            @Override
            public int hashCode() {
                Resource subject = this.statement.getSubject();
                Resource predicate = this.statement.getPredicate();
                Value object = this.statement.getObject();
                Resource context = this.statement.getContext();

                return Objects.hash(isBlank(subject) ? null : subject, isBlank(predicate) ? null : predicate,
                        isBlank(object) ? null : object, context);
            }

            @Override
            public String toString() {
                return this.statement.toString();
            }
        }
    }
}
