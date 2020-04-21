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

package org.researchspace.repository.sparql;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public abstract class SPARQLAuthenticatingRepositoryConfig extends MpSPARQLRepositoryConfig {

    protected static final ValueFactory vf = SimpleValueFactory.getInstance();

    private String username;

    private String password;

    public SPARQLAuthenticatingRepositoryConfig(String type) {
        setType(type);
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public void validate() throws RepositoryConfigException {
        super.validate();
        if (requiresUsername() && StringUtils.isEmpty(getUsername())) {
            throw new RepositoryConfigException("No username specified for SPARQL authenticating repository.");
        }
        if (requiresPassword() && StringUtils.isEmpty(getPassword())) {
            throw new RepositoryConfigException("No password specified for SPARQL authenticating repository.");
        }
    }

    @Override
    public Resource export(Model m) {
        Resource implNode = super.export(m);

        if (getUsername() != null) {
            m.add(implNode, MpRepositoryVocabulary.USERNAME, vf.createLiteral(getUsername()));
        }
        if (getPassword() != null) {
            m.add(implNode, MpRepositoryVocabulary.PASSWORD, vf.createLiteral(getPassword()));
        }

        return implNode;
    }

    @Override
    public void parse(Model m, Resource implNode) throws RepositoryConfigException {
        super.parse(m, implNode);

        try {
            Models.objectLiteral(m.filter(implNode, MpRepositoryVocabulary.USERNAME, null))
                    .ifPresent(iri -> setUsername(iri.stringValue()));
            Models.objectLiteral(m.filter(implNode, MpRepositoryVocabulary.PASSWORD, null))
                    .ifPresent(iri -> setPassword(iri.stringValue()));
        } catch (ModelException e) {
            throw new RepositoryConfigException(e.getMessage(), e);
        }
    }

    /**
     * Specifies whether the username is required (used by validation). Sub-classes
     * may override this method to indicate that the username is optional, e.g. for
     * other types of authentication.
     * 
     * @return <code>true</code> if the username is required, <code>false</code>
     *         otherwise
     */
    protected boolean requiresUsername() {
        return true;
    }

    /**
     * Specifies whether the password is required (used by validation). Sub-classes
     * may override this method to indicate that the password is optional, e.g. for
     * other types of authentication.
     * 
     * @return <code>true</code> if the password is required, <code>false</code>
     *         otherwise
     */
    protected boolean requiresPassword() {
        return true;
    }

}