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

package com.metaphacts.data.rdf.container;

import org.eclipse.rdf4j.rio.RDFFormat;

import java.io.InputStream;

/**
 * @author Yury Emelyanov
 */
public class RDFStream {
    InputStream inputStream;
    RDFFormat format;

    public RDFStream(InputStream inputStream, RDFFormat format) {
        this.inputStream = inputStream;
        this.format = format;
    }

    public InputStream getInputStream() {

        return inputStream;
    }

    public RDFFormat getFormat() {
        return format;
    }
}