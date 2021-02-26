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

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * Repository config to configure various parameters of the SPARQL repository
 * that are not available in {@link SPARQLRepositoryConfig} (e.g., enabling quad
 * mode).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpSPARQLRepositoryConfig extends SPARQLRepositoryConfig {

    protected static final ValueFactory vf = SimpleValueFactory.getInstance();

    private boolean usingQuads = true;
    private boolean writable = true;

    public MpSPARQLRepositoryConfig() {
        super();
        setType(DefaultMpSPARQLRepositoryFactory.REPOSITORY_TYPE);
    }

    public MpSPARQLRepositoryConfig(String queryEndpointUrl) {
        this();
        setQueryEndpointUrl(queryEndpointUrl);
    }

    public MpSPARQLRepositoryConfig(String queryEndpointUrl, String updateEndpointUrl) {
        super(queryEndpointUrl, updateEndpointUrl);
    }

    public boolean isUsingQuads() {
        return usingQuads;
    }

    public void setUsingQuads(boolean usingQuads) {
        this.usingQuads = usingQuads;
    }

    public boolean isWritable() {
        return writable;
    }

    public void setWritable(boolean writable) {
        this.writable = writable;
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        model.add(implNode, MpRepositoryVocabulary.QUAD_MODE, vf.createLiteral(usingQuads));
        model.add(implNode, MpRepositoryVocabulary.WRITABLE, vf.createLiteral(writable));
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws RepositoryConfigException {
        super.parse(model, implNode);

        try {
            Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.QUAD_MODE, null))
                    .ifPresent(lit -> setUsingQuads(lit.booleanValue()));
            Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.WRITABLE, null))
                    .ifPresent(lit -> setWritable(lit.booleanValue()));
        } catch (ModelException e) {
            throw new SailConfigException(e.getMessage(), e);
        }
    }

}