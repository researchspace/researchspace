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

package org.researchspace.sail.rest;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.sail.config.AbstractSailImplConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * Abstract {@link SailImplConfig} implementation for the REST API services.
 * Holds one generic parameter: service URL.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public abstract class AbstractServiceWrappingSailConfig extends AbstractSailImplConfig {

    private String url;
    private IRI serviceID;
    private Integer requestRateLimit;
    private String userAgent;

    public AbstractServiceWrappingSailConfig() {

    }

    public AbstractServiceWrappingSailConfig(String type) {
        super(type);
    }

    @Override
    public void validate() throws SailConfigException {
        super.validate();
        if (StringUtils.isEmpty(url)) {
            throw new SailConfigException("REST service URL is not provided");
        }
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        var vf = SimpleValueFactory.getInstance();
        if (!StringUtils.isEmpty(url)) {
            model.add(implNode, MpRepositoryVocabulary.SERVICE_URL, vf.createLiteral(url));
        }

        if (getServiceID() != null) {
            model.add(implNode, MpRepositoryVocabulary.IMPLEMENTS_SERVICE, getServiceID());
        }

        if (getRequestRateLimit() != null) {
            model.add(implNode, MpRepositoryVocabulary.REQUEST_RATE_LIMIT, vf.createLiteral(getRequestRateLimit()));
        }

        if (getUserAgent() != null) {
            model.add(implNode, MpRepositoryVocabulary.USER_AGENT, vf.createLiteral(getUserAgent()));
        }
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.SERVICE_URL, null))
                .ifPresent(lit -> setUrl(lit.stringValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.REQUEST_RATE_LIMIT, null))
                .ifPresent(lit -> setRequestRateLimit(lit.intValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USER_AGENT, null))
                .ifPresent(lit -> setUserAgent(lit.stringValue()));
        Models.objectIRI(model.filter(implNode, MpRepositoryVocabulary.IMPLEMENTS_SERVICE, null))
                .ifPresent(iri -> setServiceID(iri));
    }

    public String getUrl() {
        return url;
    }

    protected void setUrl(String url) {
        this.url = url;
    }

    public IRI getServiceID() {
        return serviceID;
    }

    protected void setServiceID(IRI serviceID) {
        this.serviceID = serviceID;
    }

    public Integer getRequestRateLimit() {
        return requestRateLimit;
    }

    protected void setRequestRateLimit(int requestRateLimit) {
        this.requestRateLimit = requestRateLimit;
    }

    public String getUserAgent() {
        return userAgent;
    }

    protected void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
}