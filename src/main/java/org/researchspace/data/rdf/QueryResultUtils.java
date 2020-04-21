/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.data.rdf;

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
     * Utility to close {@link Iteration} objects quietly i.e. exceptions will be
     * catched and logged.
     * 
     * @see Iterations#closeCloseable(Iteration)
     * @param iter
     */
    public static <X extends Exception> void closeQuietly(Iteration<?, X> iter) {
        try {
            Iterations.closeCloseable(iter);
        } catch (Exception e) {
            logger.warn("Failed to close iterable:" + e);
        }
    }
}