/**
 * ResearchSpace
 * Copyright (C) 2025, © Trustees of the British Museum
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

import java.io.IOException;
import java.util.Optional;

import com.github.jknack.handlebars.io.TemplateSource;
import com.github.jknack.handlebars.io.ReloadableTemplateSource;

public class TemplateByIriLoader extends FromStorageLoader {
    
    private final NamespaceRegistry ns;
    private final ValueFactory vf = SimpleValueFactory.getInstance();
    private final TemplateResolver resolver;

    public TemplateByIriLoader(PlatformStorage platformStorage, NamespaceRegistry ns) {
        super(platformStorage);
        this.ns = ns;
        this.resolver = new TemplateResolver();
    }

    @Override
    public TemplateSource sourceAt(String location) throws IOException {
        // Use unified resolver to find template
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, ns, storage);
        
        if (result.isPresent()) {
            return new ReloadableTemplateSource(
                new StorageTemplateSource(location, result.get().getRecord()));
        }
        
        // If not found, throw exception with primary path for backward compatibility
        StoragePath primaryPath = resolveLocation(location);
        throw new TemplateNotFoundException("Storage object \"" + primaryPath.toString() + "\"");
    }

    @Override
    protected StoragePath resolveLocation(String location) {
        IRI templateIri = constructTemplateIri(location);
        return TemplateIriUtils.templatePathFromIri(templateIri);
    }

    /**
     * Constructs a template IRI from a location string, handling loader prefix removal.
     *
     * @param location The template location
     * @return The constructed template IRI
     */
    private IRI constructTemplateIri(String location) {
        String prefix = this.getPrefix();
        if (location.startsWith(prefix)) {
            location = location.substring(prefix.length());
        }
        
        return TemplateIriUtils.constructTemplateIri(location, ns);
    }

    /**
     * Converts a template IRI to a storage path.
     *
     * @param templateIri The template IRI
     * @return The storage path for the template
     */
    public static StoragePath templatePathFromIri(IRI templateIri) {
        return TemplateIriUtils.templatePathFromIri(templateIri);
    }

    /**
     * Extracts a template IRI from a storage path, handling both root-level and subfolder templates.
     * This method safely handles the "Cannot unescape IRI from a non-root path" limitation
     * by extracting just the filename component for IRI decoding when dealing with subfolder paths.
     *
     * @param objectPath The storage path to extract the IRI from
     * @return Optional containing the template IRI if successfully decoded, empty otherwise
     */
    public static Optional<IRI> templateIriFromPath(StoragePath objectPath) {
        if (objectPath == null || !objectPath.hasExtension(".html")) {
            return Optional.empty();
        }
        
        // Get the relative path from the template root
        Optional<StoragePath> relativePath = ObjectKind.TEMPLATE.relativize(objectPath.stripExtension(".html"));
        if (!relativePath.isPresent()) {
            return Optional.empty();
        }
        
        StoragePath relPath = relativePath.get();
        
        // If the path contains separators (i.e., it's in a subfolder),
        // extract just the filename part for IRI decoding
        if (relPath.toString().contains(StoragePath.SEPARATOR)) {
            String filename = relPath.getLastComponent();
            return decodeFilenameAsIri(filename);
        } else {
            // Root level path - decode directly
            return decodeFilenameAsIri(relPath.toString());
        }
    }
    
    /**
     * Attempts to decode a filename as an IRI.
     *
     * @param filename The filename to decode
     * @return Optional containing the IRI if successfully decoded, empty otherwise
     */
    private static Optional<IRI> decodeFilenameAsIri(String filename) {
        try {
            // Check if this looks like a prefixed name (contains colon but no URL encoding)
            // Prefixed names like "test:Person" should not be decoded as IRIs
            if (filename.contains(":") && !filename.contains("%")) {
                return Optional.empty();
            }
            
            StoragePath filenamePath = StoragePath.parse(filename);
            return Optional.of(filenamePath.decodeIri());
        } catch (Exception e) {
            // If decoding fails, this might be a prefixed template name
            // Return empty since we can't decode non-IRI filenames to IRIs
            return Optional.empty();
        }
    }
}
