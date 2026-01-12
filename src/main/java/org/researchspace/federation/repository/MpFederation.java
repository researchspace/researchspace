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

import java.util.ArrayList;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.federated.FedX;
import org.eclipse.rdf4j.federated.FedXConfig;
import org.eclipse.rdf4j.federated.endpoint.Endpoint;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.federation.repository.evaluation.QueryHintAwareFederationEvaluationStrategyFactory;

import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * Implementation of the custom federation SAIL. Repositories registered in
 * {@link RepositoryManager} can be referenced as federation members.
 * Configuration properties are defined by {@link MpFederationConfig}, instances
 * are created by {@link MpFederationFactory}.
 * 
 * Adapted to extend FedX for RDF4J 5.x compatibility.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpFederation extends FedX {

    private static final Logger logger = LogManager.getLogger(MpFederation.class);

    protected Map<IRI, String> repositoryIDMappings;

    protected final String defaultRepositoryId;

    @Inject
    protected Provider<RepositoryManager> repositoryManagerProvider;

    private boolean enableQueryHints = true;

    public MpFederation(String defaultRepositoryId, Map<IRI, String> repositoryIDMappings, FedXConfig config) {
        super(new ArrayList<>());
        this.defaultRepositoryId = defaultRepositoryId;
        this.repositoryIDMappings = repositoryIDMappings;
        this.setFederationEvaluationStrategy(new QueryHintAwareFederationEvaluationStrategyFactory());
    }

    public boolean isEnableQueryHints() {
        return enableQueryHints;
    }

    public void setEnableQueryHints(boolean enableQueryHints) {
        this.enableQueryHints = enableQueryHints;
    }

    public void addFederationMember(Endpoint endpoint) {
        this.addMember(endpoint);
    }
}