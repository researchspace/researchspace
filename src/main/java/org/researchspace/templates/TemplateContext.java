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

package org.researchspace.templates;

import java.util.Map;
import java.util.Optional;

import javax.annotation.Nullable;
import javax.ws.rs.core.UriInfo;

import com.github.jknack.handlebars.Context;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.repository.Repository;
import org.researchspace.cache.LabelCache;
import org.researchspace.config.NamespaceRegistry;

import com.google.common.collect.Maps;

/**
 * Carries all the information and references to services required for compiling
 * a handlebars template for a particular resource.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class TemplateContext {

    private Value value;
    private Repository repository;
    private UriInfo uriInfo;
    @Nullable
    private String preferredLanguage;

    private Map<String, Value> params = Maps.newHashMap();

    private LabelCache labelCache;
    private NamespaceRegistry namespaceRegistry;

    public TemplateContext(Value value, Repository repository, UriInfo uriInfo, @Nullable String preferredLanguage) {
        this.value = value;
        this.repository = repository;
        this.uriInfo = uriInfo;
        this.preferredLanguage = preferredLanguage;
    }

    public Value getValue() {
        return value;
    }

    public Repository getRepository() {
        return repository;
    }

    public UriInfo getUriInfo() {
        return uriInfo;
    }

    public Optional<String> getPreferredLanguage() {
        return Optional.ofNullable(preferredLanguage);
    }

    public Map<String, Value> getParams() {
        return this.params;
    }

    public void addParam(String key, Value value) {
        this.params.put(key, value);
    }

    public Optional<NamespaceRegistry> getNamespaceRegistry() {
        return Optional.ofNullable(namespaceRegistry);
    }

    public void setNamespaceRegistry(NamespaceRegistry ns) {
        this.namespaceRegistry = ns;
    }

    public void setLabelCache(LabelCache labelCache) {
        this.labelCache = labelCache;
    }

    public String getLabel() {
        if (this.labelCache != null && this.value instanceof IRI) {
            IRI iri = (IRI) this.value;
            Optional<Literal> label = labelCache.getLabel(iri, this.repository, this.preferredLanguage);
            return LabelCache.resolveLabelWithFallback(label, iri);
        }
        return "";
    }

    /**
     * Query ready, current resource IRI string representation.
     */
    public String getIri() {
        return "<" + this.value.stringValue() + ">";
    }

    /**
     * Overrides toString() for template mechanism to access render [[this]] as the
     * string value of the current context value (i.e. resource)
     *
     * @see java.lang.Object#toString()
     */
    @Override
    public String toString() {
        return this.value.stringValue();
    }

    public static TemplateContext fromHandlebars(Context handlebarsContext) {
        Object rootModel = handlebarsContext.data("root");
        if (!(rootModel instanceof TemplateContext)) {
            throw new IllegalStateException("Unexpected root Handlebars context is not a TemplateContext instance");
        }
        return (TemplateContext) rootModel;
    }
}
