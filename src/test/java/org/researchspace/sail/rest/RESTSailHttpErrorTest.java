/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.sail.rest;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.junit.Test;
import org.researchspace.sail.rest.AbstractServiceWrappingSailConnection.ServiceParametersHolder;

public class RESTSailHttpErrorTest {

    private static class FailingResponseConnection extends RESTSailConnection {

        private final Response response;

        FailingResponseConnection(RESTSail sail, Response response) {
            super(sail);
            this.response = response;
        }

        @Override
        protected Response submit(ServiceParametersHolder parametersHolder) {
            return response;
        }
    }

    private RESTSail createSail(boolean ignoreHttpErrors) {
        RESTSailConfig config = new RESTSailConfig();
        config.setUrl("http://localhost:1/api");
        config.setHttpMethod("GET");
        config.setIgnoreHttpErrors(ignoreHttpErrors);
        return new RESTSail(config);
    }

    private Response serverErrorResponse() {
        Response response = mock(Response.class);
        when(response.getStatus()).thenReturn(500);
        when(response.getStatusInfo()).thenReturn(Response.Status.INTERNAL_SERVER_ERROR);
        return response;
    }

    /**
     * HTTP errors from REST services must fail the query by default. Silently
     * returning empty results hides authentication errors, rate limiting and
     * misconfigured endpoints (and silently produces wrong federated joins).
     */
    @Test
    public void httpErrorsFailTheQueryByDefault() {
        assertFalse("ignoreHttpErrors must default to false", new RESTSailConfig().isIgnoreHttpErrors());

        RESTSailConnection connection = new FailingResponseConnection(createSail(false), serverErrorResponse());
        try {
            connection.executeAndConvertResultsToBindingSet(new ServiceParametersHolder());
            fail("expected SailException for HTTP 500 response");
        } catch (SailException e) {
            assertTrue(e.getMessage().contains("500"));
        }
    }

    @Test
    public void httpErrorsReturnEmptyResultsWhenIgnored() {
        RESTSailConnection connection = new FailingResponseConnection(createSail(true), serverErrorResponse());
        try (CloseableIteration<? extends BindingSet> result = connection
                .executeAndConvertResultsToBindingSet(new ServiceParametersHolder())) {
            assertFalse(result.hasNext());
        }
    }

    @Test
    public void errorResponseIsClosed() {
        Response response = serverErrorResponse();

        RESTSailConnection connection = new FailingResponseConnection(createSail(false), response);
        try {
            connection.executeAndConvertResultsToBindingSet(new ServiceParametersHolder());
            fail("expected SailException for HTTP 500 response");
        } catch (SailException e) {
            // expected
        }
        verify(response).close();
    }
}
