/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.federation.repository;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.sail.config.AbstractSailImplConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.federation.config.FederationConfig;

import com.google.common.collect.Lists;
import com.metaphacts.repository.MpDelegatingImplConfig;
import com.metaphacts.repository.MpRepositoryVocabulary;

/**
 * Config for instances of {@link MpFederation}.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpFederationConfig extends AbstractSailImplConfig implements MpDelegatingImplConfig {
    
    /**
     * Sub-config describing one federation member.
     * Contains the IRI, by which the federation service is referred to in the SPARQL query 
     * and the delegate repository ID, by which it is referred in the {@link RepositoryManager}
     * 
     */
    public static class MpFederationMemberConfig implements MpDelegatingImplConfig {
        
        private String delegateRepositoryId ;
        private IRI referenceIri ;
        
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
                model.add(implNode, MpRepositoryVocabulary.SERVICE_REFERENCE,
                        referenceIri);
            }
            return implNode;
        }

        public void parse(Model model, Resource implNode) throws SailConfigException {
            try {
                Models.objectLiteral(model.filter(
                        implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID, null)).ifPresent(
                            lit -> setDelegateRepositoryId(lit.stringValue()));
                Models.objectIRI(model.filter(
                        implNode, MpRepositoryVocabulary.SERVICE_REFERENCE, null)).ifPresent(
                            iri -> setReferenceIri(iri));
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
    
    private List<MpFederationMemberConfig> memberConfigs = Lists.newArrayList();
    private String defaultMember = null;
    
    private boolean useAsyncParallelJoin = true;
    private boolean useCompetingJoin = true;
    private boolean useBoundJoin = true;
    private boolean enableQueryHints = true;

    
    public MpFederationConfig() {
        super(MpFederationFactory.SAIL_TYPE);
    }

    @Override
    public Collection<String> getDelegateRepositoryIDs() {
        Set<String> res = memberConfigs
                                .stream()
                                .map(repoConfig -> repoConfig.getDelegateRepositoryId())
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
            model.add(res, FederationConfig.MEMBER, node);
        }
        if (this.getDefaultMember() != null) {
            model.add(
                    res, 
                    MpRepositoryVocabulary.DEFAULT_MEMBER, 
                    SimpleValueFactory.getInstance().createLiteral(this.defaultMember));
        }
        if (!this.isUseAsyncParallelJoin()) {
            model.add(
                    res, 
                    MpRepositoryVocabulary.USE_ASYNCHRONOUS_PARALLEL_JOIN, 
                    SimpleValueFactory.getInstance().createLiteral(this.isUseAsyncParallelJoin()));
        }
        if (!this.isUseBoundJoin()) {
            model.add(
                    res, 
                    MpRepositoryVocabulary.USE_BOUND_JOIN, 
                    SimpleValueFactory.getInstance().createLiteral(this.isUseBoundJoin()));
        }
        if (!this.isUseCompetingJoin()) {
            model.add(
                    res, 
                    MpRepositoryVocabulary.USE_COMPETING_JOIN, 
                    SimpleValueFactory.getInstance().createLiteral(this.isUseCompetingJoin()));
        }
        if (!this.enableQueryHints) {
            model.add(
                    res, 
                    MpRepositoryVocabulary.ENABLE_QUERY_HINTS, 
                    SimpleValueFactory.getInstance().createLiteral(this.enableQueryHints));
        }
        return res;
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);
        Models.objectLiteral(model.filter(
                implNode, MpRepositoryVocabulary.DEFAULT_MEMBER, null)).ifPresent(
                    lit -> setDefaultMember(lit.stringValue()));
        
        Models.objectResources(model.filter(
                implNode, FederationConfig.MEMBER, null)).forEach(node -> {
                    MpFederationMemberConfig conf = new MpFederationMemberConfig();
                    conf.parse(model, node);
                    memberConfigs.add(conf);
                });
        
        Models.objectLiteral(model.filter(
                implNode, MpRepositoryVocabulary.USE_ASYNCHRONOUS_PARALLEL_JOIN, null)).ifPresent(
                    lit -> setUseAsyncParallelJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(
                implNode, MpRepositoryVocabulary.USE_BOUND_JOIN, null)).ifPresent(
                    lit -> setUseBoundJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(
                implNode, MpRepositoryVocabulary.USE_COMPETING_JOIN, null)).ifPresent(
                    lit -> setUseCompetingJoin(lit.booleanValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.ENABLE_QUERY_HINTS, null))
                .ifPresent(lit -> setEnableQueryHints(lit.booleanValue()));
    }
    
    public Map<IRI, String> getRepositoryIDMappings() {
        return memberConfigs.stream().collect(
                Collectors.toMap(
                    memberConfig -> memberConfig.getReferenceIri(), 
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
}