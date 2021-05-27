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

package org.researchspace.services.storage.api;

import org.apache.commons.configuration2.Configuration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * Abstract representation of a storage configuration. Specializations may
 * extend it and implement own validation logic in {@link #validate()}.
 * 
 * @author Alexey Morozov
 * @author Johannes Trame <jt@metaphacts.com>
 */
public abstract class StorageConfig {
    protected boolean mutable = false;
    protected String subroot;

    protected String pathMapping;
    protected IRI baseIri;

    /**
     * Returns a key to identify the type of storage that can be instantiated with
     * this configuration.
     */
    public abstract String getStorageType();

    public abstract ObjectStorage createStorage(StorageCreationParams params) throws StorageException;

    /**
     * Storage specific configuration validation logic. Should check whether storage
     * config is consistent and valid.
     */
    protected void validate() throws StorageConfigException {
        if (this.subroot != null) {
            try {
                StoragePath.parse(this.subroot);
            } catch (Exception ex) {
                throw new StorageConfigException("Invalid value for property 'subroot'", ex);
            }
        }
    }

    public void setMutable(boolean mutable) {
        this.mutable = mutable;
    }

    public boolean isMutable() {
        return this.mutable;
    }

    public void setSubroot(String subroot) {
        this.subroot = subroot;
    }

    public String getSubroot() {
        return subroot;
    }

    public void setPathMapping(String pathMapping) {
        this.pathMapping = pathMapping;
    }

    public String getPathMapping() {
        return pathMapping;
    }

    public void setBaseIri(IRI baseIri) {
        this.baseIri = baseIri;
    }

    public IRI getBaseIri() {
        return baseIri;
    }

    public static void readBaseProperties(StorageConfig config, Configuration properties) {
        if (properties.containsKey("mutable")) {
            config.setMutable(properties.getBoolean("mutable"));
        }
        if (properties.containsKey("subroot")) {
            config.setSubroot(properties.getString("subroot"));
        }
        if (properties.containsKey("path-mapping")) {
            config.setPathMapping(properties.getString("path-mapping"));
        }
        if (properties.containsKey("base-iri")) {
            config.setBaseIri(SimpleValueFactory.getInstance().createIRI(properties.getString("base-iri")));
        }
    }
}
