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

package org.researchspace.repository.sparql.virtuoso;

import java.util.Collection;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.AbstractRepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpDelegatingImplConfig;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.google.common.base.Strings;
import com.google.common.collect.Lists;

/**
 * Implementation config for {@link VirtuosoWrapperRepository}. The only passed
 * parameter is the ID of the delegate repository in the
 * {@link org.researchspace.repository.RepositoryManager}. The delegate
 * repository has to be a Virtuoso SPARQL repository.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class VirtuosoWrapperRepositoryConfig extends AbstractRepositoryImplConfig implements MpDelegatingImplConfig {

    protected String delegateRepositoryId;

    public VirtuosoWrapperRepositoryConfig() {
        super(VirtuosoWrapperRepositoryFactory.REPOSITORY_TYPE);
    }

    @Override
    public void validate() throws RepositoryConfigException {
        super.validate();
        if (Strings.isNullOrEmpty(delegateRepositoryId)) {
            throw new RepositoryConfigException("No delegate repository ID is specified.");
        }
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        if (delegateRepositoryId != null) {
            model.add(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID,
                    SimpleValueFactory.getInstance().createLiteral(delegateRepositoryId));
        }
        return implNode;
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);
        try {
            Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.DELEGATE_REPOSITORY_ID, null))
                    .ifPresent(lit -> setDelegateRepositoryId(lit.stringValue()));
        } catch (ModelException e) {
            throw new SailConfigException(e.getMessage(), e);
        }

    }

    public String getDelegateRepositoryId() {
        return delegateRepositoryId;
    }

    public void setDelegateRepositoryId(String delegateRepositoryId) {
        this.delegateRepositoryId = delegateRepositoryId;
    }

    @Override
    public Collection<String> getDelegateRepositoryIDs() {
        return Lists.newArrayList(this.delegateRepositoryId);
    }
}
