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

package com.metaphacts.data.rdf;

import org.eclipse.rdf4j.common.iteration.Iteration;
import org.eclipse.rdf4j.common.iteration.Iterations;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.query.QueryResults;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class QueryResultUtils extends QueryResults {
    
    private static final Logger logger = LogManager.getLogger(QueryResultUtils.class);
    
    /**
     * Utility to close {@link Iteration} objects quietly i.e. exceptions will
     * be catched and logged.
     * 
     * @see Iterations#closeCloseable(Iteration)
     * @param iter
     */
    public static <X extends Exception>  void closeQuietly(Iteration<?, X> iter){
        try {
            Iterations.closeCloseable(iter);
        } catch (Exception e) {
           logger.warn("Failed to close iterable:" + e);
        }
    }
}