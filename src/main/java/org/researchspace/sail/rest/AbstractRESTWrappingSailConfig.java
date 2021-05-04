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

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;

public class AbstractRESTWrappingSailConfig extends AbstractServiceWrappingSailConfig {

    private Integer requestRateLimit;
    private String userAgent;

    public AbstractRESTWrappingSailConfig() {
    }

    public AbstractRESTWrappingSailConfig(String type) {
        super(type);
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        var vf = SimpleValueFactory.getInstance();

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
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.REQUEST_RATE_LIMIT, null))
                .ifPresent(lit -> setRequestRateLimit(lit.intValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USER_AGENT, null))
                .ifPresent(lit -> setUserAgent(lit.stringValue()));
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
