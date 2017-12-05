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

import java.io.IOException;
import java.net.URL;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.github.jknack.handlebars.io.ReloadableTemplateSource;
import com.metaphacts.config.NamespaceRegistry;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class FileTemplateLoader extends com.github.jknack.handlebars.io.FileTemplateLoader {
    private TemplateStorage<Long,URL> storage;
    private NamespaceRegistry ns;
    
    public FileTemplateLoader(TemplateStorage<Long, URL> templateStorage, NamespaceRegistry ns) {
        super(templateStorage.getBaseDir(), "");
        this.storage = templateStorage;
        this.ns = ns;
        this.setSuffix("");
    }
    
    
    @Override
    protected URL getResource(String location) throws IOException {
        try {
            location = location.replace(this.getPrefix(), "").trim();
            //TODO
            final String TEMPLATE_PREFIX = "Template:";
            final boolean isTemplate =  location.startsWith(TEMPLATE_PREFIX);

            final String plainLocation = isTemplate
                    ? location.substring(TEMPLATE_PREFIX.length())
                    : location;
            //TODO 
            ValueFactory vf = SimpleValueFactory.getInstance();
            IRI iri = plainLocation.startsWith("http")
                    ? SimpleValueFactory.getInstance().createIRI(plainLocation)
                    : (IRI) ns.resolveToIRI(plainLocation).orElse(vf.createIRI(ns.getDefaultNamespace().toString(), plainLocation));
            IRI fileIri = vf.createIRI(iri.stringValue());

            return isTemplate 
                    ? storage.getTemplateLocation(vf.createIRI(TEMPLATE_PREFIX + iri.stringValue())).orElseThrow( () -> new IOException(
                                "Template" +  TEMPLATE_PREFIX + iri.stringValue() + " does not exist."
                            )) 
                    : storage.getTemplateLocation(fileIri).orElseThrow( () -> new IOException());
        } catch (Exception e) {
            throw new IOException(e);
        }
    }
    
    @Override
    public ReloadableTemplateSource sourceAt(String uri) throws IOException {
        return new ReloadableTemplateSource(super.sourceAt(uri));
    }

}