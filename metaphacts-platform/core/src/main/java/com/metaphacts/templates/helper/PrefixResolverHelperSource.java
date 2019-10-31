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

package com.metaphacts.templates.helper;

import static com.google.common.base.Preconditions.checkNotNull;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.github.jknack.handlebars.Options;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.templates.TemplateContext;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PrefixResolverHelperSource {
    private static final Logger logger = LogManager.getLogger(PrefixResolverHelperSource.class);

    /**
     * Helper function to resolve a prefixed IRI string to a full IRI string.
     * @param param0 First helper input param as propagated by handlebars
     * @param options Handlebars {@link Options}, will be automatically propagated
     * @return Returns a full IRI string, without enclosing brackets
     */
    public String resolvePrefix(String param0, Options options) {
        TemplateContext context = (TemplateContext) options.context.model();
        String prefixedIri = checkNotNull(param0, "Parameter prefix must not null or empty.");
        logger.trace("Trying to resolve  {} to full IRI string.", prefixedIri);
        NamespaceRegistry ns = context.getNamespaceRegistry().orElseThrow(
                () -> new IllegalStateException("NamespaceService not available in helper function.") 
        );
        
        return ns.resolveToIRI(prefixedIri).orElseThrow( 
                () -> new IllegalArgumentException("Prefixed IRI "+prefixedIri + " is not resolveable to full IRI.")
        ).stringValue();
    }
}
