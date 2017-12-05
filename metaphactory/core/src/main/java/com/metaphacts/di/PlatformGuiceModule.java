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

package com.metaphacts.di;

import com.google.inject.servlet.ServletModule;
import com.metaphacts.servlet.SparqlServlet;
import com.metaphacts.servlet.filter.AssetFilter;
import com.metaphacts.servlet.filter.HomePageFilter;
import com.metaphacts.servlet.filter.RewriteFilter;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class PlatformGuiceModule extends ServletModule {
    @Override
    protected void configureServlets() {
        //register servlet filters
        filter("/assets/*","/images/*").through(AssetFilter.class);  
        filter("*").through(HomePageFilter.class);  
        filter("*").through(RewriteFilter.class);
        
        //register servlets
        serve("/sparql").with(SparqlServlet.class);
    }
    
}