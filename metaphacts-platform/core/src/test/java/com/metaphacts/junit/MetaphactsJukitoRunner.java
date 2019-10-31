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

import java.lang.reflect.InvocationTargetException;

import org.jukito.JukitoRunner;
import org.junit.runners.model.InitializationError;

/**
 * Modification to the {@link JukitoRunner} to pass the injector statically to
 * {@link ResourceTestConfig} to establish the HK2 guice bridge.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MetaphactsJukitoRunner extends JukitoRunner {
    public MetaphactsJukitoRunner(final Class<?> classToRun) throws InitializationError,
    InvocationTargetException, InstantiationException, IllegalAccessException {
        super(classToRun);
    }

    @Override
    public Object createTest() throws Exception {
        ResourceTestConfig.injector= getInjector();
        return super.createTest();
    }
}