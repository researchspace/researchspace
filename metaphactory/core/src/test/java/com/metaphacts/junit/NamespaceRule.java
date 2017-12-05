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

package com.metaphacts.junit;

import java.util.Map.Entry;

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
        for(Entry<String, String> prefixes : ns.getPrefixMap().entrySet()) {
            try {
                ns.delete(prefixes.getKey());
            } catch (ProtectedNamespaceDeletionException e) {
                // ignore (system namespaces not deleted)
            }
        }
    }
    
    
    public NamespaceRegistry getNamespaceRegistry(){
        return ns;
    }

}