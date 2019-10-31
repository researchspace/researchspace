/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.services.storage.api.*;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import java.util.Optional;

public class TemplateByIriLoader extends FromStorageLoader {
    protected final NamespaceRegistry ns;

    public TemplateByIriLoader(
        PlatformStorage platformStorage,
        NamespaceRegistry ns
    ) {
        super(platformStorage);
        this.ns = ns;
    }

    @Override
    protected StoragePath resolveLocation(String location) {
        IRI templateIri = constructTemplateIri(location);
        return templatePathFromIri(templateIri);
    }

    private IRI constructTemplateIri(String location) {
        String prefix = this.getPrefix();
        if (location.startsWith(prefix)) {
            location = location.substring(prefix.length());
        }
        location = location.trim();

        String TEMPLATE_PREFIX = "Template:";
        boolean isTemplate = location.startsWith(TEMPLATE_PREFIX);

        String plainLocation = isTemplate
            ? location.substring(TEMPLATE_PREFIX.length())
            : location;

        ValueFactory vf = SimpleValueFactory.getInstance();
        IRI iri = plainLocation.startsWith("http")
            ? SimpleValueFactory.getInstance().createIRI(plainLocation)
            : ns.resolveToIRI(plainLocation).orElse(vf.createIRI(ns.getDefaultNamespace(), plainLocation));

        IRI templateIri = isTemplate ? vf.createIRI(TEMPLATE_PREFIX + iri.stringValue()) : iri;
        return templateIri;
    }

    public static StoragePath templatePathFromIri(IRI templateIri) {
        return ObjectKind.TEMPLATE.resolve(StoragePath.encodeIri(templateIri)).addExtension(".html");
    }

    public static Optional<IRI> templateIriFromPath(StoragePath objectPath) {
        if (!objectPath.hasExtension(".html")) {
            return Optional.empty();
        }
        return ObjectKind.TEMPLATE
            .relativize(objectPath.stripExtension(".html"))
            .map(StoragePath::decodeIri);
    }
}
