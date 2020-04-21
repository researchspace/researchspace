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

package org.researchspace.federation.repository.evaluation;

import java.net.SocketException;

import org.apache.http.MalformedChunkCodingException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.ExceptionConvertingIteration;
import org.eclipse.rdf4j.common.iteration.Iteration;
import org.eclipse.rdf4j.query.QueryEvaluationException;

/**
 * A workaround for suppressing RDF4J errors due to incorrectly consumed
 * results.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 * @param <E>
 */
public class RemoteClosingExceptionConvertingIteration<E>
        extends ExceptionConvertingIteration<E, QueryEvaluationException> {

    private static final Logger logger = LogManager.getLogger(RemoteClosingExceptionConvertingIteration.class);

    public RemoteClosingExceptionConvertingIteration(Iteration<? extends E, ? extends Exception> iter) {
        super(iter);
    }

    @Override
    protected QueryEvaluationException convert(Exception exception) {
        return new QueryEvaluationException(exception);
    }

    @Override
    protected void handleClose() throws QueryEvaluationException {
        try {
            super.handleClose();
        } catch (Exception e) {
            Throwable rootCause = getRootCause(e);
            if ((rootCause instanceof MalformedChunkCodingException) || (rootCause instanceof IndexOutOfBoundsException)
                    || (rootCause instanceof SocketException)) {
                // Just suppress it: the stream is already closed
                logger.warn("Likely remote Blazegraph exception: ", e);
            } else {
                throw e;
            }
        }
    }

    private Throwable getRootCause(Throwable e) {
        Throwable cause = e.getCause();
        return cause != null ? getRootCause(cause) : e;
    }

}