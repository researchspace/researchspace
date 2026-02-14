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

package org.researchspace.federation.repository;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.federated.FedXConfig;
import org.eclipse.rdf4j.federated.repository.FedXRepositoryConfig;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.util.Values;
import org.eclipse.rdf4j.sail.config.AbstractSailImplConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;

import org.researchspace.repository.MpDelegatingImplConfig;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.google.common.collect.Lists;

/**
 * Config for instances of {@link MpFederation}.
 * 
 * <p>Supports FedX configuration properties using the standard {@code fedx:config} block.
 * Legacy {@code ephedra:config} is also supported for backwards compatibility.</p>
 * 
 * <pre>
 * sail:sailImpl [
 *   sail:sailType "researchspace:Federation" ;
 *   mph:defaultMember "default" ;
 *   fedx:config [
 *     fedx:enforceMaxQueryTime 120 ;
 *     fedx:joinWorkerThreads 20 ;
 *     fedx:debugQueryPlan false
 *   ]
 * ]
 * </pre>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpFederationConfig extends AbstractSailImplConfig implements MpDelegatingImplConfig {

    /**
     * Legacy IRI for the config block within ephedra namespace (deprecated, use fedx:config)
     */
    private static final IRI LEGACY_CONFIG = SimpleValueFactory.getInstance()
            .createIRI(MpRepositoryVocabulary.FEDERATION_NAMESPACE, "config");

    /**
     * Sub-config describing one federation member. Contains the IRI, by which the
     * federation service is referred to in the SPARQL query and the delegate
     * repository ID, by which it is referred in the {@link RepositoryManager}
     * 
     */
    public static class MpFederationMemberConfig implements MpDelegatingImplConfig {

        private String delegateRepositoryId;
        private IRI referenceIri;

        public String getDelegateRepositoryId() {
            return delegateRepositoryId;
        }

        public void setDelegateRepositoryId(String repositoryId) {
            this.delegateRepositoryId = repositoryId;
        }

        public IRI getReferenceIri() {
            return referenceIri;
        }

        public void setReferenceIri(IRI referenceIri) {
            this.referenceIri = referenceIri;
        }

        public void validate() throws SailConfigException {
            if (StringUtils.isEmpty(delegateRepositoryId)) {
                throw new SailConfigException("Delegate repository ID is not provided");
            }
        }

        public Resource export(Model model) {
            BNode implNode = vf.createBNode();
            if (delegateRepositoryId != null) {
                model.add(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID,
                        SimpleValueFactory.getInstance().createLiteral(delegateRepositoryId));
            }
            if (referenceIri != null) {
                model.add(implNode, MpRepositoryVocabulary.SERVICE_REFERENCE, referenceIri);
            }
            return implNode;
        }

        public void parse(Model model, Resource implNode) throws SailConfigException {
            try {
                Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID, null))
                        .ifPresent(lit -> setDelegateRepositoryId(lit.stringValue()));
                Models.objectIRI(model.filter(implNode, MpRepositoryVocabulary.SERVICE_REFERENCE, null))
                        .ifPresent(iri -> setReferenceIri(iri));
            } catch (ModelException e) {
                throw new SailConfigException(e.getMessage(), e);
            }
        }

        @Override
        public Collection<String> getDelegateRepositoryIDs() {
            return Lists.newArrayList(delegateRepositoryId);
        }

    }

    private static final ValueFactory vf = SimpleValueFactory.getInstance();
    
    /** Default query timeout: 120 seconds (2 minutes) */
    public static final int DEFAULT_QUERY_TIMEOUT = 120;
    
    /** Default prefetch size for REST services: 5 parallel HTTP calls */
    public static final int DEFAULT_REST_SERVICE_PREFETCH_SIZE = 5;

    private List<MpFederationMemberConfig> memberConfigs = Lists.newArrayList();
    private String defaultMember = null;

    // Legacy config options (kept for backwards compatibility)
    private boolean useAsyncParallelJoin = true;
    private boolean useCompetingJoin = true;
    private boolean useBoundJoin = true;
    private boolean enableQueryHints = true;
    
    // FedX configuration - stores all FedX-specific settings
    private FedXConfig fedXConfig;
    
    // REST service prefetch size for bounded parallelism
    private int restServicePrefetchSize = DEFAULT_REST_SERVICE_PREFETCH_SIZE;

    public MpFederationConfig() {
        super(MpFederationFactory.SAIL_TYPE);
        // Initialize with default FedXConfig, setting our default timeout
        this.fedXConfig = new FedXConfig().withEnforceMaxQueryTime(DEFAULT_QUERY_TIMEOUT);
    }

    @Override
    public Collection<String> getDelegateRepositoryIDs() {
        Set<String> res = memberConfigs.stream().map(repoConfig -> repoConfig.getDelegateRepositoryId())
                .collect(Collectors.toSet());
        res.add(this.defaultMember);
        return res;
    }

    public String getDefaultMember() {
        return defaultMember;
    }

    public void setDefaultMember(String defaultMember) {
        this.defaultMember = defaultMember;
    }

    @Override
    public void validate() throws SailConfigException {
        if (memberConfigs.isEmpty()) {
            throw new SailConfigException("No federation members were configured.");
        }
        if (this.defaultMember == null) {
            throw new SailConfigException("Default member was not defined.");
        }
        for (MpFederationMemberConfig config : memberConfigs) {
            config.validate();
        }
    }

    @Override
    public Resource export(Model model) {
        Resource res = super.export(model);
        for (MpFederationMemberConfig config : memberConfigs) {
            Resource node = config.export(model);
            model.add(res, MpRepositoryVocabulary.FEDERATION_MEMBER, node);
        }
        if (this.getDefaultMember() != null) {
            model.add(res, MpRepositoryVocabulary.DEFAULT_MEMBER,
                    SimpleValueFactory.getInstance().createLiteral(this.defaultMember));
        }
        if (!this.isUseAsyncParallelJoin()) {
            model.add(res, MpRepositoryVocabulary.USE_ASYNCHRONOUS_PARALLEL_JOIN,
                    SimpleValueFactory.getInstance().createLiteral(this.isUseAsyncParallelJoin()));
        }
        if (!this.isUseBoundJoin()) {
            model.add(res, MpRepositoryVocabulary.USE_BOUND_JOIN,
                    SimpleValueFactory.getInstance().createLiteral(this.isUseBoundJoin()));
        }
        if (!this.isUseCompetingJoin()) {
            model.add(res, MpRepositoryVocabulary.USE_COMPETING_JOIN,
                    SimpleValueFactory.getInstance().createLiteral(this.isUseCompetingJoin()));
        }
        if (!this.enableQueryHints) {
            model.add(res, MpRepositoryVocabulary.ENABLE_QUERY_HINTS,
                    SimpleValueFactory.getInstance().createLiteral(this.enableQueryHints));
        }
        
        // Export FedX config if present
        if (fedXConfig != null) {
            exportFedXConfig(model, res);
        }
        
        return res;
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.DEFAULT_MEMBER, null))
                .ifPresent(lit -> setDefaultMember(lit.stringValue()));

        Models.objectResources(model.filter(implNode, MpRepositoryVocabulary.FEDERATION_MEMBER, null)).forEach(node -> {
            MpFederationMemberConfig conf = new MpFederationMemberConfig();
            conf.parse(model, node);
            memberConfigs.add(conf);
        });
        Models.objectResources(model.filter(implNode, MpRepositoryVocabulary.LEGACY_FEDERATION_MEMBER, null)).forEach(node -> {
            MpFederationMemberConfig conf = new MpFederationMemberConfig();
            conf.parse(model, node);
            memberConfigs.add(conf);
        });

        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USE_ASYNCHRONOUS_PARALLEL_JOIN, null))
                .ifPresent(lit -> setUseAsyncParallelJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USE_BOUND_JOIN, null))
                .ifPresent(lit -> setUseBoundJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USE_COMPETING_JOIN, null))
                .ifPresent(lit -> setUseCompetingJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.ENABLE_QUERY_HINTS, null))
                .ifPresent(lit -> setEnableQueryHints(lit.booleanValue()));
        
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.REST_SERVICE_PREFETCH_SIZE, null))
                .ifPresent(lit -> setRestServicePrefetchSize(lit.intValue()));
                
        // Parse FedX config using delegation to FedXRepositoryConfig
        parseFedXConfig(model, implNode);
    }
    
    /**
     * Parse FedX configuration from the model by delegating to FedXRepositoryConfig.
     * Supports both standard fedx:config and legacy ephedra:config.
     * 
     * <p>We use a helper class that extends FedXRepositoryConfig to reuse its 
     * protected parsing logic, rather than duplicating the code.</p>
     */
    private void parseFedXConfig(Model model, Resource implNode) {
        // Initialize with default timeout
        if (fedXConfig == null) {
            fedXConfig = new FedXConfig().withEnforceMaxQueryTime(DEFAULT_QUERY_TIMEOUT);
        }
        
        // Try standard fedx:config first
        boolean foundConfig = Models.objectResource(model.getStatements(implNode, FedXRepositoryConfig.FEDX_CONFIG, null))
                .isPresent();
        
        // Check for legacy ephedra:config
        if (!foundConfig) {
            foundConfig = Models.objectResource(model.getStatements(implNode, LEGACY_CONFIG, null)).isPresent();
            
            // If legacy config found, remap it to fedx:config for the helper to parse
            if (foundConfig) {
                Model modifiedModel = new org.eclipse.rdf4j.model.impl.TreeModel(model);
                Resource legacyConfNode = Models.objectResource(model.getStatements(implNode, LEGACY_CONFIG, null)).get();
                modifiedModel.add(implNode, FedXRepositoryConfig.FEDX_CONFIG, legacyConfNode);
                model = modifiedModel;
            }
        }
        
        if (foundConfig) {
            // Use helper to delegate parsing to FedXRepositoryConfig
            FedXConfigParserHelper helper = new FedXConfigParserHelper();
            helper.setConfig(fedXConfig);  // Pass our config so it gets populated
            helper.parseFedXConfig(model, implNode);
            fedXConfig = helper.getConfig();  // Get back the populated config
        }
    }
    
    /**
     * Helper class to access FedXRepositoryConfig's protected parseFedXConfig method.
     * This avoids duplicating the FedX config parsing logic.
     */
    private static class FedXConfigParserHelper extends FedXRepositoryConfig {
        @Override
        public void parseFedXConfig(Model m, Resource implNode) {
            super.parseFedXConfig(m, implNode);
        }
    }
    
    /**
     * Export FedX configuration to the model.
     */
    private void exportFedXConfig(Model model, Resource implNode) {
        BNode confNode = Values.bnode();

        model.add(confNode, FedXRepositoryConfig.CONFIG_JOIN_WORKER_THREADS, 
                vf.createLiteral(fedXConfig.getJoinWorkerThreads()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_UNION_WORKER_THREADS, 
                vf.createLiteral(fedXConfig.getUnionWorkerThreads()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_LEFT_JOIN_WORKER_THREADS, 
                vf.createLiteral(fedXConfig.getLeftJoinWorkerThreads()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_BOUND_JOIN_BLOCK_SIZE, 
                vf.createLiteral(fedXConfig.getBoundJoinBlockSize()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_ENFORCE_MAX_QUERY_TIME, 
                vf.createLiteral(fedXConfig.getEnforceMaxQueryTime()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_ENABLE_SERVICE_AS_BOUND_JOIN,
                vf.createLiteral(fedXConfig.getEnableServiceAsBoundJoin()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_ENABLE_OPTIONAL_AS_BIND_JOIN,
                vf.createLiteral(fedXConfig.isEnableOptionalAsBindJoin()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_ENABLE_MONITORING, 
                vf.createLiteral(fedXConfig.isEnableMonitoring()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_LOG_QUERY_PLAN, 
                vf.createLiteral(fedXConfig.isLogQueryPlan()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_LOG_QUERIES, 
                vf.createLiteral(fedXConfig.isLogQueries()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_DEBUG_QUERY_PLAN, 
                vf.createLiteral(fedXConfig.isDebugQueryPlan()));
        model.add(confNode, FedXRepositoryConfig.CONFIG_INCLUDE_INFERRED_DEFAULT, 
                vf.createLiteral(fedXConfig.getIncludeInferredDefault()));

        if (fedXConfig.getSourceSelectionCacheSpec() != null) {
            model.add(confNode, FedXRepositoryConfig.CONFIG_SOURCE_SELECTION_CACHE_SPEC,
                    vf.createLiteral(fedXConfig.getSourceSelectionCacheSpec()));
        }

        model.add(confNode, FedXRepositoryConfig.CONFIG_CONSUMING_ITERATION_MAX, 
                vf.createLiteral(fedXConfig.getConsumingIterationMax()));

        model.add(implNode, FedXRepositoryConfig.FEDX_CONFIG, confNode);
    }

    public Map<IRI, String> getRepositoryIDMappings() {
        return memberConfigs.stream().collect(Collectors.toMap(memberConfig -> memberConfig.getReferenceIri(),
                memberConfig -> memberConfig.getDelegateRepositoryId()));
    }

    public boolean isUseAsyncParallelJoin() {
        return useAsyncParallelJoin;
    }

    public void setUseAsyncParallelJoin(boolean useAsyncParallelJoin) {
        this.useAsyncParallelJoin = useAsyncParallelJoin;
    }

    public boolean isUseCompetingJoin() {
        return useCompetingJoin;
    }

    public void setUseCompetingJoin(boolean useCompetingJoin) {
        this.useCompetingJoin = useCompetingJoin;
    }

    public boolean isUseBoundJoin() {
        return useBoundJoin;
    }

    public void setUseBoundJoin(boolean useBoundJoin) {
        this.useBoundJoin = useBoundJoin;
    }

    public boolean isEnableQueryHints() {
        return enableQueryHints;
    }

    public void setEnableQueryHints(boolean enableQueryHints) {
        this.enableQueryHints = enableQueryHints;
    }
    
    /**
     * Get the FedX configuration. This is used by MpFederationFactory to configure
     * the underlying FedX instance.
     * 
     * @return the FedX configuration, never null
     */
    public FedXConfig getFedXConfig() {
        return fedXConfig;
    }
    
    /**
     * Set the FedX configuration.
     * 
     * @param config the FedX configuration
     */
    public void setFedXConfig(FedXConfig config) {
        this.fedXConfig = config;
    }
    
    /**
     * Get the prefetch size for REST services.
     * This controls how many HTTP calls are made in parallel when evaluating REST services.
     * Higher values improve performance but may make slightly more calls than strictly needed.
     * 
     * @return the prefetch size, default is {@link #DEFAULT_REST_SERVICE_PREFETCH_SIZE}
     */
    public int getRestServicePrefetchSize() {
        return restServicePrefetchSize;
    }
    
    /**
     * Set the prefetch size for REST services.
     * 
     * @param prefetchSize the number of parallel HTTP calls (minimum 1)
     */
    public void setRestServicePrefetchSize(int prefetchSize) {
        this.restServicePrefetchSize = Math.max(1, prefetchSize);
    }
}