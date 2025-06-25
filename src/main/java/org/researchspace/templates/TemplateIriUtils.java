/**
 * ResearchSpace
 * Copyright (C) 2025, © President and Fellows of Harvard College
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

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.StoragePath;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * Utility class for template IRI operations including construction, encoding, and path conversion.
 * This class consolidates common functionality used across the template resolution system.
 */
public final class TemplateIriUtils {
    
    /** Template prefix constant used throughout the system */
    public static final String TEMPLATE_PREFIX = "Template:";
    
    private static final ValueFactory VALUE_FACTORY = SimpleValueFactory.getInstance();
    
    // Private constructor to prevent instantiation
    private TemplateIriUtils() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }
    
    /**
     * Constructs a template IRI from a location string.
     * Handles Template: prefix logic and namespace resolution.
     * 
     * @param location The template location string
     * @param namespaceRegistry The namespace registry for prefix resolution
     * @return The constructed template IRI
     */
    public static IRI constructTemplateIri(String location, NamespaceRegistry namespaceRegistry) {
        if (location == null) {
            throw new IllegalArgumentException("Location cannot be null");
        }
        if (namespaceRegistry == null) {
            throw new IllegalArgumentException("NamespaceRegistry cannot be null");
        }
        
        location = location.trim();
        
        boolean isTemplate = location.startsWith(TEMPLATE_PREFIX);
        String plainLocation = isTemplate ? location.substring(TEMPLATE_PREFIX.length()) : location;
        
        IRI iri = plainLocation.startsWith("http") ? 
            VALUE_FACTORY.createIRI(plainLocation) :
            namespaceRegistry.resolveToIRI(plainLocation)
                .orElse(VALUE_FACTORY.createIRI(namespaceRegistry.getDefaultNamespace(), plainLocation));
        
        return isTemplate ? VALUE_FACTORY.createIRI(TEMPLATE_PREFIX + iri.stringValue()) : iri;
    }
    
    /**
     * Converts a template IRI to a storage path.
     * 
     * @param templateIri The template IRI to convert
     * @return The storage path for the template
     */
    public static StoragePath templatePathFromIri(IRI templateIri) {
        if (templateIri == null) {
            throw new IllegalArgumentException("Template IRI cannot be null");
        }
        
        return ObjectKind.TEMPLATE.resolve(StoragePath.encodeIri(templateIri)).addExtension(".html");
    }
    
    /**
     * URL-encodes an IRI string for use as a filename.
     * 
     * @param iri The IRI string to encode
     * @return The URL-encoded IRI string, or null if encoding fails
     */
    public static String urlEncodeIri(String iri) {
        if (iri == null) {
            return null;
        }
        
        try {
            return URLEncoder.encode(iri, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            // UTF-8 should always be supported
            return null;
        }
    }
    
    /**
     * Checks if a location has the Template: prefix.
     * 
     * @param location The location to check
     * @return true if the location has the Template: prefix
     */
    public static boolean hasTemplatePrefix(String location) {
        return location != null && location.trim().startsWith(TEMPLATE_PREFIX);
    }
    
    /**
     * Removes the Template: prefix from a location if present.
     * 
     * @param location The location to process
     * @return The location without the Template: prefix
     */
    public static String withoutTemplatePrefix(String location) {
        if (location == null) {
            return null;
        }
        
        String trimmed = location.trim();
        return hasTemplatePrefix(trimmed) ? trimmed.substring(TEMPLATE_PREFIX.length()) : trimmed;
    }
    
    /**
     * Adds the Template: prefix to a location if not already present.
     * 
     * @param location The location to process
     * @return The location with the Template: prefix
     */
    public static String withTemplatePrefix(String location) {
        if (location == null) {
            return TEMPLATE_PREFIX;
        }
        
        return hasTemplatePrefix(location) ? location : TEMPLATE_PREFIX + location;
    }
}