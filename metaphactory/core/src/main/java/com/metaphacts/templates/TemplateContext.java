/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.templates;

import java.util.Map;
import java.util.Optional;

import javax.ws.rs.core.UriInfo;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.repository.Repository;

import com.google.common.collect.Maps;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.config.NamespaceRegistry;

/**
 * Carries all the information and references to services required for compiling a handlebars
 * template for a particular resource.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class TemplateContext {

    private UriInfo uriInfo;
    
    private Value value;

    private Map<String, Value> params = Maps.newHashMap();
    
    private LabelCache labelCache;
    
    private NamespaceRegistry namespaceRegistry;
    
    public Optional<NamespaceRegistry> getNamespaceRegistry() {
        return Optional.<NamespaceRegistry>ofNullable(namespaceRegistry);
    }

    public void setNamespaceRegistry(NamespaceRegistry ns) {
        this.namespaceRegistry = ns;
    }

    public void setLabelCache(LabelCache labelCache) {
        this.labelCache = labelCache;
    }

    public Map<String, Value> getParams() {
        return this.params;
    }

    public void addParam(String key, Value value) {
        this.params.put(key, value);
    }

    public TemplateContext(Value value, Repository repository, UriInfo uriInfo) {
        this.value = value;
        this.repository = repository;
        this.uriInfo = uriInfo;
    }
    
    public Value getValue() {
        return value;
    }

    public UriInfo getUriInfo() {
        return uriInfo;
    }

    private Repository repository;

    public Repository getRepository() {
        return repository;
    }
    
    public String getLabel() {
        if (this.labelCache != null && this.value instanceof IRI) {
            final IRI iri = (IRI) this.value;
            final Optional<Literal> label = labelCache.getLabel(iri, this.repository);
            return LabelCache.resolveLabelWithFallback(label, iri);    
                    
        }
        return "";
    }

    
    /**
     * Overrides toString() for template mechanism to access render [[this]] as
     * the string value of the current context value (i.e. resource)
     * 
     * @see java.lang.Object#toString()
     */
    @Override
    public String toString() {
        return this.value.stringValue();
    }
    
}