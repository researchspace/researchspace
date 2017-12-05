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

package com.metaphacts.plugin.handler;

import static org.junit.Assert.fail;

import java.nio.file.Path;

import org.junit.Test;

import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.plugin.MetaphactoryPlugin;

/**
 * Tests the existence of constructors as being invoked by the {@link MetaphactoryPlugin}
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class ConstructorTest {
    
    @Test
    public void configBaseInstallationHandlerConstructorTest() {
        try {
            ConfigBaseInstallationHandler.class.getConstructor(Configuration.class, Path.class);
        } catch( NoSuchMethodException nsme ) {
           fail( "The specified " + ConfigBaseInstallationHandler.class.getName() + " constructor does not exist!");
        }
    }

    @Test
    public void namespaceBaseInstallationHandlerConstructorTest() {
        try {
            NamespaceBaseInstallationHandler.class.getConstructor(Configuration.class, NamespaceRegistry.class, Path.class);
        } catch( NoSuchMethodException nsme ) {
            fail( "The specified " + NamespaceBaseInstallationHandler.class.getName() + " constructor does not exist!");
        }
    }
    @Test

    public void templateBaseInstallationHandlerConstructorTest() {
        try {
            TemplateBaseInstallationHandler.class.getConstructor(Configuration.class, Path.class);
        } catch( NoSuchMethodException nsme ) {
            fail( "The specified " + TemplateBaseInstallationHandler.class.getName() + " constructor does not exist!");
        }
    }

}