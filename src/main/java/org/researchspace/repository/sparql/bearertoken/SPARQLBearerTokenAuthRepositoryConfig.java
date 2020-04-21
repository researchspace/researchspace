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

package org.researchspace.repository.sparql.bearertoken;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.repository.sparql.MpSPARQLRepositoryConfig;

public class SPARQLBearerTokenAuthRepositoryConfig extends MpSPARQLRepositoryConfig {

    private String authenticationToken;

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        model.add(implNode, MpRepositoryVocabulary.AUTHENTICATION_TOKEN, vf.createLiteral(getAuthenticationToken()));
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws RepositoryConfigException {
        super.parse(model, implNode);
        try {
            Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.AUTHENTICATION_TOKEN, null))
                    .ifPresent(lit -> setAuthenticationToken(lit.stringValue()));
        } catch (ModelException e) {
            throw new SailConfigException(e.getMessage(), e);
        }
    }

    @Override
    public void validate() throws RepositoryConfigException {
        super.validate();
        if (getAuthenticationToken() == null) {
            throw new RepositoryConfigException("No authentication token specified for a data.world SPARQL repository");
        }
    }

    public String getAuthenticationToken() {
        return authenticationToken;
    }

    public void setAuthenticationToken(String authenticationToken) {
        this.authenticationToken = authenticationToken;
    }
}
