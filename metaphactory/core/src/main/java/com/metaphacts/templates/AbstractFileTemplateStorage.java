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

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import org.eclipse.rdf4j.model.IRI;

import com.google.common.base.Charsets;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public abstract class AbstractFileTemplateStorage<T extends Comparable<T>, E> implements TemplateStorage<T, E> {
    
    // TODO should be config
    public final static String BASE_STORAGE_LOCATION = "data/templates";
    protected final static String SUFFIX = "html";

    public static String normalize(IRI uri) throws UnsupportedEncodingException{
        return URLEncoder.encode(uri.stringValue(), Charsets.UTF_8.name());
    }
}