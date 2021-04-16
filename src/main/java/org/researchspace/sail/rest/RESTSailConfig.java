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

import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import com.beust.jcommander.internal.Maps;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.Literal;
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

public class RESTSailConfig extends AbstractRESTWrappingSailConfig {

    private String httpMethod;
    private String inputFormat;
    private String mediaType;
    private Map<String, String> httpHeaders;

    public RESTSailConfig() {
        super(RESTSailFactory.SAIL_TYPE);
        httpHeaders = Maps.newHashMap();
    }

    @Override
    public void parse(Model model, Resource implNode) throws SailConfigException {
        super.parse(model, implNode);

        // Get HTTP method from the model
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.HTTP_METHOD, null))
                .ifPresent(lit -> setHttpMethod(lit.stringValue()));

        // Get input format
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.INPUT_FORMAT, null))
                .ifPresent(lit -> setInputFormat(lit.stringValue()));

        // Get media_type
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.MEDIA_TYPE, null))
                .ifPresent(lit -> setMediaType(lit.stringValue()));

        // Get each httpheader
        Models.objectResources(model.filter(implNode, MpRepositoryVocabulary.HTTP_HEADER, null))
        .forEach(header -> {
            Optional<Literal> name = Models.objectLiteral(model.filter(header, MpRepositoryVocabulary.NAME, null));
            Optional<Literal> value = Models.objectLiteral(model.filter(header, MpRepositoryVocabulary.VALUE, null));

            if(name.isPresent() && value.isPresent())
                httpHeaders.put(name.get().stringValue(), value.get().stringValue());
        });
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);

        // Store the HTTP method in the model
        if (!StringUtils.isEmpty(getHttpMethod())) 
            model.add(implNode, MpRepositoryVocabulary.HTTP_METHOD,
                    SimpleValueFactory.getInstance().createLiteral(getHttpMethod()));
        
        if (!StringUtils.isEmpty(getInputFormat())) 
            model.add(implNode, MpRepositoryVocabulary.INPUT_FORMAT,
                    SimpleValueFactory.getInstance().createLiteral(getInputFormat()));
        
        if (!StringUtils.isEmpty(getMediaType())) 
            model.add(implNode, MpRepositoryVocabulary.MEDIA_TYPE,
                    SimpleValueFactory.getInstance().createLiteral(getMediaType()));

        if(!Objects.isNull(httpHeaders) && httpHeaders.size()>0) {
            for (Map.Entry<String, String> header : httpHeaders.entrySet()) {
                BNode root = SimpleValueFactory.getInstance().createBNode();

                model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, root);
                model.add(root, MpRepositoryVocabulary.NAME, SimpleValueFactory.getInstance().createLiteral(header.getKey()));
                model.add(root, MpRepositoryVocabulary.VALUE, SimpleValueFactory.getInstance().createLiteral(header.getValue()));
            }
        }
        
        return implNode;
    }

    public String getHttpMethod() {
        return this.httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getInputFormat() {
        return this.inputFormat;
    }

    public void setInputFormat(String inputFormat) {
        this.inputFormat = inputFormat;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public Map<String, String> getHttpHeaders() {
        return this.httpHeaders;
    }
}