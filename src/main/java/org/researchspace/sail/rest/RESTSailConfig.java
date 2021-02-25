/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class RESTSailConfig extends AbstractServiceWrappingSailConfig {

    private String httpMethod;

    public RESTSailConfig() {
        super(RESTSailFactory.SAIL_TYPE);
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);

        // Get the HTTP method from the model
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.HTTP_METHOD, null))
                .ifPresent(lit -> setHttpMethod(lit.stringValue()));
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);

        // Store the HTTP method in the model
        if (!StringUtils.isEmpty(getHttpMethod())) {
            model.add(implNode, MpRepositoryVocabulary.HTTP_METHOD,
                    SimpleValueFactory.getInstance().createLiteral(getHttpMethod()));
        }
        return implNode;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }
    
}