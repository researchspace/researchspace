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

import javax.ws.rs.core.MediaType;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.beust.jcommander.internal.Maps;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class RESTSailConfig extends AbstractServiceWrappingSailConfig {

    public enum AUTH_LOCATION {
        PARAMETER, HEADER
    }

    public class RestAuthorization {
        private String type;
        private String key;
        private String value;
        private AUTH_LOCATION location;

        public AUTH_LOCATION getLocation() {
            return location;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }

        public void setLocation(String location) {
            this.location = AUTH_LOCATION.valueOf(location.toUpperCase());
        }
    }

    public static final String JSON = "JSON";

    private String httpMethod;

    /**
     * ContentType HTTP header
     */
    private String inputFormat;

    /**
     * Accept HTTP header
     */
    private String mediaType = MediaType.APPLICATION_JSON;

    /**
     * Additional HTTP headers
     */
    private Map<String, String> httpHeaders;

    /**
     * request per second
     */
    private Integer requestRateLimit;

    private String userAgent;

    private RestAuthorization auth;

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
                .ifPresentOrElse(lit -> setInputFormat(lit.stringValue()), () -> setInputFormat(JSON));

        // Get media_type
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.MEDIA_TYPE, null)).ifPresentOrElse(
                lit -> setMediaType(lit.stringValue()), () -> setMediaType(MediaType.APPLICATION_JSON));

        // Get each httpheader
        Models.objectResources(model.filter(implNode, MpRepositoryVocabulary.HTTP_HEADER, null)).forEach(header -> {
            Optional<Literal> name = Models.objectLiteral(model.filter(header, MpRepositoryVocabulary.NAME, null));
            Optional<Literal> value = Models.objectLiteral(model.filter(header, MpRepositoryVocabulary.VALUE, null));

            if (name.isPresent() && value.isPresent())
                httpHeaders.put(name.get().stringValue(), value.get().stringValue());
        });

        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.REQUEST_RATE_LIMIT, null))
                .ifPresent(lit -> setRequestRateLimit(lit.intValue()));
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.USER_AGENT, null))
                .ifPresent(lit -> setUserAgent(lit.stringValue()));

        model.filter(implNode, MpRepositoryVocabulary.AUTHORIZATION_KEY, null).forEach(data -> {
            data.getObject();
        });

        // Set Authorization
        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.AUTHORIZATION_KEY, null))
                .ifPresent(lit -> setAuthKey(lit.stringValue()));

        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.AUTHORIZATION_VALUE, null))
                .ifPresent(lit -> setAuthValue(lit.stringValue()));

        Models.objectLiteral(model.filter(implNode, MpRepositoryVocabulary.AUTHORIZATION_LOCATION, null))
                .ifPresent(lit -> setAuthLocation(lit.stringValue()));
    }

    @Override
    public Resource export(Model model) {
        Resource implNode = super.export(model);
        var vf = SimpleValueFactory.getInstance();

        // Store the HTTP method in the model
        if (!StringUtils.isEmpty(getHttpMethod())) {
            model.add(implNode, MpRepositoryVocabulary.HTTP_METHOD, vf.createLiteral(getHttpMethod()));
        }

        if (!StringUtils.isEmpty(getInputFormat())) {
            model.add(implNode, MpRepositoryVocabulary.INPUT_FORMAT, vf.createLiteral(getInputFormat()));
        }

        if (!StringUtils.isEmpty(getMediaType())) {
            model.add(implNode, MpRepositoryVocabulary.MEDIA_TYPE, vf.createLiteral(getMediaType()));
        }

        if (!Objects.isNull(httpHeaders) && httpHeaders.size() > 0) {
            for (Map.Entry<String, String> header : httpHeaders.entrySet()) {
                BNode root = vf.createBNode();

                model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, root);
                model.add(root, MpRepositoryVocabulary.NAME, vf.createLiteral(header.getKey()));
                model.add(root, MpRepositoryVocabulary.VALUE, vf.createLiteral(header.getValue()));
            }
        }

        if (getRequestRateLimit() != null) {
            model.add(implNode, MpRepositoryVocabulary.REQUEST_RATE_LIMIT, vf.createLiteral(getRequestRateLimit()));
        }

        if (getUserAgent() != null) {
            model.add(implNode, MpRepositoryVocabulary.USER_AGENT, vf.createLiteral(getUserAgent()));
        }

        if (this.getAuth() != null) {

            if (this.getAuth().getKey() != null) {
                model.add(implNode, MpRepositoryVocabulary.AUTHORIZATION_KEY,
                        vf.createLiteral(this.getAuth().getKey()));
            }

            if (this.getAuth().getValue() != null) {
                model.add(implNode, MpRepositoryVocabulary.AUTHORIZATION_VALUE,
                        vf.createLiteral(this.getAuth().getValue()));
            }

            if (this.getAuth().getLocation() != null) {
                model.add(implNode, MpRepositoryVocabulary.AUTHORIZATION_LOCATION,
                        vf.createLiteral(this.getAuth().getLocation().toString()));
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

    public RestAuthorization getAuth() {
        return auth;
    }

    public void initAuth() {
        if (this.auth == null)
            this.auth = new RestAuthorization();
    }

    public void setAuthKey(String key) {
        initAuth();
        this.auth.setKey(key);
    }

    public void setAuthValue(String value) {
        initAuth();
        this.auth.setValue(value);
    }

    public void setAuthLocation(String location) {
        initAuth();
        this.auth.setLocation(location);
    }
}