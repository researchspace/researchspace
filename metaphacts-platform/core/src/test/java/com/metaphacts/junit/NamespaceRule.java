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

package com.metaphacts.junit;

import java.io.IOException;

import com.metaphacts.config.NamespaceRecord;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.junit.rules.TemporaryFolder;

import com.google.inject.Inject;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.config.NamespaceRegistry.ProtectedNamespaceDeletionException;

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
    
    
    public NamespaceRegistry getNamespaceRegistry(){
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
