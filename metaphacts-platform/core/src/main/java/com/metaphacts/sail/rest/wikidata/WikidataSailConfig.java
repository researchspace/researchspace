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

package com.metaphacts.sail.rest.wikidata;

import com.metaphacts.sail.rest.AbstractServiceWrappingSailConfig;

/**
 * {@link SailImplConfig} for the {@link WikidataSail} text search API.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class WikidataSailConfig extends AbstractServiceWrappingSailConfig {
    
    public static final String DEFAULT_URL = "https://www.wikidata.org/w/api.php"; 

    public WikidataSailConfig() {
        super(WikidataSailFactory.SAIL_TYPE);
        this.setUrl(DEFAULT_URL);
    }
    
    public WikidataSailConfig(String url) {
        super(WikidataSailFactory.SAIL_TYPE);
        this.setUrl(url);
    }


}