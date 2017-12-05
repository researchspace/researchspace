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

package com.metaphacts.sail.rest.wikidata;

import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;

import com.metaphacts.sail.rest.AbstractRESTWrappingSail;

/**
 * {@link Sail} wrapper for the Wikidata search API (https://www.wikidata.org/w/api.php).
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class WikidataSail extends AbstractRESTWrappingSail {

    public WikidataSail() {
        this(WikidataSailConfig.DEFAULT_URL);
    }
    
    public WikidataSail(String url) {
        super(url);
    }

    @Override
    protected SailConnection getConnectionInternal() throws SailException {
        return new WikidataSailConnection(this);
    }

    @Override
    protected void shutDownInternal() throws SailException {
        super.shutDownInternal();
    }

    
    
}