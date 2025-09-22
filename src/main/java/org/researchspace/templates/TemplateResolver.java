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
import org.researchspace.services.storage.api.*;

import java.util.*;

/**
 * Template resolver that handles all input formats (prefixed, full IRI, Template: prefixed)
 * and searches for both filename formats (IRI-encoded and prefixed) across all subfolders simultaneously.
 *
 * This resolver provides a comprehensive template resolution strategy that:
 * - Generates all possible template variations from any input format
 * - Tries direct path lookup first for optimal performance
 * - Falls back to hierarchical search across all template locations
 * - Supports both clean prefixed filenames and URL-encoded IRI filenames
 */
public class TemplateResolver {
    
    private final ValueFactory vf = SimpleValueFactory.getInstance();
    
    /**
     * Resolves a template location using unified hierarchical search.
     * 
     * @param location The template location to resolve
     * @param namespaceRegistry The namespace registry for prefix/IRI conversion
     * @param storage The platform storage for template lookup
     * @return Optional containing the storage result if found, empty otherwise
     */
    public Optional<PlatformStorage.FindResult> resolve(String location,
                                                       NamespaceRegistry namespaceRegistry,
                                                       PlatformStorage storage) {
        if (location == null || location.trim().isEmpty()) {
            return Optional.empty();
        }
        if (namespaceRegistry == null || storage == null) {
            return Optional.empty();
        }
        
        // Generate all possible template variations
        Set<String> variations = generateAllVariations(location, namespaceRegistry);
        
        // Try direct path lookup first (most efficient)
        for (String variation : variations) {
            Optional<PlatformStorage.FindResult> result = tryDirectPath(variation, namespaceRegistry, storage);
            if (result.isPresent()) {
                return result;
            }
        }
        
        // If direct paths fail, search all templates for filename matches
        return searchAllTemplates(variations, storage);
    }
    
    /**
     * Generates all possible variations of a template location.
     *
     * @param location The original template location
     * @param namespaceRegistry The namespace registry for prefix/IRI conversion
     * @return Set of all possible location variations
     */
    private Set<String> generateAllVariations(String location, NamespaceRegistry namespaceRegistry) {
        Set<String> variations = new LinkedHashSet<>();
        
        // Normalize input
        String trimmed = location.trim();
        boolean hasTemplatePrefix = TemplateIriUtils.hasTemplatePrefix(trimmed);
        String withoutTemplate = TemplateIriUtils.withoutTemplatePrefix(trimmed);
        
        // Add original location
        variations.add(trimmed);
        
        if (withoutTemplate.contains(":") && !withoutTemplate.startsWith("http")) {
            // Prefixed format (e.g., "test:Person")
            addPrefixedVariations(withoutTemplate, hasTemplatePrefix, namespaceRegistry, variations);
        } else if (withoutTemplate.startsWith("http")) {
            // Full IRI format (e.g., "http://example.org/Person")
            addIriVariations(withoutTemplate, hasTemplatePrefix, namespaceRegistry, variations);
        } else {
            // Simple name format (e.g., "Person")
            addSimpleNameVariations(withoutTemplate, hasTemplatePrefix, namespaceRegistry, variations);
        }
        
        return variations;
    }
    
    private void addPrefixedVariations(String prefixed, boolean hasTemplatePrefix,
                                     NamespaceRegistry namespaceRegistry, Set<String> variations) {
        // Add prefixed form variations
        variations.add(prefixed);
        if (hasTemplatePrefix) {
            variations.add(TemplateIriUtils.withTemplatePrefix(prefixed));
        } else {
            variations.add(prefixed);
            variations.add(TemplateIriUtils.withTemplatePrefix(prefixed));
        }
        
        // Try to expand to full IRI
        Optional<IRI> fullIri = namespaceRegistry.resolveToIRI(prefixed);
        if (fullIri.isPresent()) {
            String iriString = fullIri.get().stringValue();
            variations.add(iriString);
            variations.add(TemplateIriUtils.withTemplatePrefix(iriString));
        }
    }
    
    private void addIriVariations(String iri, boolean hasTemplatePrefix,
                                NamespaceRegistry namespaceRegistry, Set<String> variations) {
        // Add IRI form variations
        variations.add(iri);
        if (hasTemplatePrefix) {
            variations.add(TemplateIriUtils.withTemplatePrefix(iri));
        } else {
            variations.add(iri);
            variations.add(TemplateIriUtils.withTemplatePrefix(iri));
        }
        
        // Try to compress to prefixed form
        try {
            IRI iriObj = vf.createIRI(iri);
            String namespace = iriObj.getNamespace();
            String localName = iriObj.getLocalName();
            
            if (localName != null && !localName.isEmpty()) {
                Optional<String> prefix = namespaceRegistry.getPrefix(namespace);
                if (prefix.isPresent()) {
                    String prefixed = prefix.get() + ":" + localName;
                    variations.add(prefixed);
                    variations.add(TemplateIriUtils.withTemplatePrefix(prefixed));
                }
            }
        } catch (Exception e) {
            // Ignore invalid IRIs
        }
    }
    
    private void addSimpleNameVariations(String name, boolean hasTemplatePrefix,
                                       NamespaceRegistry namespaceRegistry, Set<String> variations) {
        // Add simple name variations
        variations.add(name);
        if (hasTemplatePrefix) {
            variations.add(TemplateIriUtils.withTemplatePrefix(name));
        } else {
            variations.add(name);
            variations.add(TemplateIriUtils.withTemplatePrefix(name));
        }
        
        // Try with default namespace
        String defaultNamespace = namespaceRegistry.getDefaultNamespace();
        if (defaultNamespace != null) {
            String fullIri = defaultNamespace + name;
            variations.add(fullIri);
            variations.add(TemplateIriUtils.withTemplatePrefix(fullIri));
        }
    }
    
    /**
     * Tries to find a template using direct path lookup.
     *
     * @param variation The template variation to try
     * @param namespaceRegistry The namespace registry
     * @param storage The platform storage
     * @return Optional containing the result if found
     */
    private Optional<PlatformStorage.FindResult> tryDirectPath(String variation,
                                                              NamespaceRegistry namespaceRegistry,
                                                              PlatformStorage storage) {
        try {
            IRI templateIri = TemplateIriUtils.constructTemplateIri(variation, namespaceRegistry);
            StoragePath path = TemplateIriUtils.templatePathFromIri(templateIri);
            return storage.findObject(path);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
    
    /**
     * Searches all templates for filename matches when direct paths fail.
     * This method performs a comprehensive search across all template locations.
     *
     * @param variations The set of template variations to search for
     * @param storage The platform storage
     * @return Optional containing the result if found
     */
    private Optional<PlatformStorage.FindResult> searchAllTemplates(Set<String> variations,
                                                                   PlatformStorage storage) {
        try {
            Map<StoragePath, PlatformStorage.FindResult> allTemplates = storage.findAll(ObjectKind.TEMPLATE);
            
            // Create filename patterns to match
            Set<String> filenamePatterns = generateFilenamePatterns(variations);
            
            // Search through all templates
            for (Map.Entry<StoragePath, PlatformStorage.FindResult> entry : allTemplates.entrySet()) {
                StoragePath templatePath = entry.getKey();
                
                if (templatePath.hasExtension(".html")) {
                    // Check IRI-encoded filename
                    if (matchesIriEncodedPath(templatePath, variations)) {
                        return Optional.of(entry.getValue());
                    }
                    
                    // Check clean filename
                    if (matchesCleanFilename(templatePath, filenamePatterns)) {
                        return Optional.of(entry.getValue());
                    }
                }
            }
        } catch (Exception e) {
            // Ignore search errors
        }
        
        return Optional.empty();
    }
    
    /**
     * Generates all possible filename patterns from the given variations.
     *
     * @param variations The template variations
     * @return Set of filename patterns to match
     */
    private Set<String> generateFilenamePatterns(Set<String> variations) {
        Set<String> filenamePatterns = new HashSet<>();
        
        for (String variation : variations) {
            // Add clean prefixed filename (e.g., "test:Person.html")
            filenamePatterns.add(variation + ".html");
            
            // If it's an IRI, also add URL-encoded version
            if (variation.startsWith("http")) {
                String encodedVariation = TemplateIriUtils.urlEncodeIri(variation);
                if (encodedVariation != null) {
                    filenamePatterns.add(encodedVariation + ".html");
                }
            }
            
            // Also try without Template: prefix for filename matching
            if (TemplateIriUtils.hasTemplatePrefix(variation)) {
                String withoutTemplate = TemplateIriUtils.withoutTemplatePrefix(variation);
                filenamePatterns.add(withoutTemplate + ".html");
                
                // If the part after Template: is an IRI, encode it too
                if (withoutTemplate.startsWith("http")) {
                    String encodedWithoutTemplate = TemplateIriUtils.urlEncodeIri(withoutTemplate);
                    if (encodedWithoutTemplate != null) {
                        filenamePatterns.add(encodedWithoutTemplate + ".html");
                    }
                }
            }
        }
        
        return filenamePatterns;
    }
    
    private boolean matchesIriEncodedPath(StoragePath templatePath, Set<String> variations) {
        try {
            IRI decodedIri = templatePath.stripExtension(".html").decodeIri();
            String decodedString = decodedIri.stringValue();
            return variations.contains(decodedString);
        } catch (Exception e) {
            return false;
        }
    }
    
    private boolean matchesCleanFilename(StoragePath templatePath, Set<String> filenamePatterns) {
        String pathString = templatePath.toString();
        String filename = pathString.substring(pathString.lastIndexOf('/') + 1);
        return filenamePatterns.contains(filename);
    }
    
}