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

package org.researchspace.junit;

import java.io.IOException;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.junit.rules.TemporaryFolder;
import org.researchspace.config.NamespaceRecord;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.NamespaceRegistry.ProtectedNamespaceDeletionException;

import com.google.inject.Inject;

/**
 * JUnit rule for namespace manipulation and access.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class NamespaceRule extends TemporaryFolder {

    @Inject
    NamespaceRegistry ns;

    @Override
    protected void before() throws Throwable {
        super.before();
    }

    @Override
    protected void after() {
        super.after();
        for (NamespaceRecord record : ns.getRecords()) {
            try {
                ns.deletePrefix(record.getPrefix(), record.getAppId());
            } catch (ProtectedNamespaceDeletionException e) {
                // ignore (system namespaces not deleted)
            } catch (IOException | ConfigurationException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public NamespaceRegistry getNamespaceRegistry() {
        return ns;
    }

    public void set(String prefix, String iriString) {
        try {
            IRI iri = SimpleValueFactory.getInstance().createIRI(iriString);
            ns.setPrefix(prefix, iri, TestPlatformStorage.STORAGE_ID);
        } catch (IOException | ConfigurationException e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(String prefix) {
        ns.getRecordByPrefix(prefix).ifPresent(record -> {
            try {
                ns.deletePrefix(record.getPrefix(), record.getAppId());
            } catch (IOException | ConfigurationException e) {
                throw new RuntimeException(e);
            }
        });
    }
}
