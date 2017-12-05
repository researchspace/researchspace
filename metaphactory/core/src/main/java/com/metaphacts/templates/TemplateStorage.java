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

import java.io.File;
import java.io.IOException;
import java.net.URL;
/*
 * Copyright (C) 2015, metaphacts GmbH
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
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public interface TemplateStorage<T extends Comparable<T>, E> {

    /**
     * The raw (i.e. unprocessed) content string of the template.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @return The raw (i.e. unprocessed) content string of the template.
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract Optional<String> getTemplateContent(IRI iri) throws IOException;
    
    /**
     * The raw (i.e. unprocessed) content string of the template.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @param revision
     *            Revision ID (i.e. may depend on the specific implementation).
     *            If <code>null</code>, latest revision will be returned.
     * @return The raw (i.e. unprocessed) content string of the template.
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract Optional<String> getTemplateContent(IRI iri, T revision) throws IOException;
    
    /**
     * Returns the {@link E} for loading for the template identified by the
     * {@link IRI} with latest revision.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @return The {@link E} for loading for the template identified by the
     *         {@link IRI} and revision. 
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract Optional<E> getTemplateLocation(IRI iri) throws IOException;
    
    /**
     * Returns the {@link E} for loading for the template identified by the
     * {@link IRI} and revision.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @param revision
     *            Revision identifier (i.e. depending on the implementation). If
     *            <code>null</code>, latest revision will be returned.
     * @return The {@link E} for loading for the template identified by the
     *         {@link IRI} and revision. 
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract Optional<E> getTemplateLocation(IRI iri, T revision) throws IOException;
    
    /**
     * Returns a map with all stored revisions for the specified resource.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @return
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract Map<T, URL> getRevisions(IRI iri) throws IOException;
    
    /**
     * Returns a {@link Set} of resource known by storage system.
     * 
     * @return
     */
    public abstract Set<IRI> getAllStoredTemplates() throws IOException;
    
    /**
     * Stores a new revision of the template as identified by the supplied
     * {@link IRI}.
     * 
     * @param uri
     *            The {@link IRI} to identify the template resource.
     * @param rawContent
     *            The raw (i.e. plain) template content string to be stored.
     * @throws IOException
     *             On any error related to the storage system.
     */
    public abstract T storeNewRevision(IRI iri, String rawContent) throws IOException;
    
    /**
     * Deletes the specified template including all revisions.
     * @throws IOException
     */
    public abstract void deleteTemplate(IRI iri) throws IOException;
    
    /**
     * @return
     */
    public abstract File getBaseDir();
}