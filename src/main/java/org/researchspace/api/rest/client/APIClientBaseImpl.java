/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.api.rest.client;

import java.net.HttpURLConnection;
import java.net.URL;

import org.apache.commons.codec.binary.Base64;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;

/**
 * Default implementation of {@link APIClientBase}.
 * 
 * @author msc
 */
public class APIClientBaseImpl implements APIClientBase {

    private String endpoint;
    private String user;
    private String password;
    private IRI baseIri;

    public APIClientBaseImpl(String endpoint, String user, String password, IRI baseIri) {

        this.endpoint = endpoint;
        this.user = user;
        this.password = password;
        this.baseIri = baseIri;
    }

    @Override
    public String getEndpoint() {
        return endpoint;
    }

    @Override
    public String getUser() {
        return user;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public IRI getBaseIri() {
        return baseIri;
    }

    /**
     * Submits a GET request and converts the result into a {@link Model}.
     * 
     * @param pathFromEndpoint path relative to the endpoint (without leading /)
     * 
     * @return the model or null, in case something went wrong with the request
     * @throws APICallFailedException
     */
    @Override
    public Model submitGET(final String pathFromEndpoint) throws APICallFailedException {

        HttpURLConnection conn = null;

        try {

            final StringBuffer buf = new StringBuffer();
            buf.append(getEndpoint());
            buf.append("/");
            buf.append(pathFromEndpoint);

            final URL url = new URL(buf.toString());

            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");

            // set basic auth header, if credentials specified
            if (user != null && !user.isEmpty() && password != null) {
                String userCredentials = user + ":" + password;
                String basicAuth = "Basic " + new String(new Base64().encode(userCredentials.getBytes()));
                conn.setRequestProperty("Authorization", basicAuth);
            }

            if (conn.getResponseCode() != 200) {
                throw new APICallFailedException(
                        "API call failed with HTTP error code '" + conn.getResponseCode() + "'");
            }

            RDFParser rdfParser = Rio.createParser(RDFFormat.N3);
            Model model = new org.eclipse.rdf4j.model.impl.LinkedHashModel();
            rdfParser.setRDFHandler(new StatementCollector(model));

            rdfParser.parse(conn.getInputStream(), baseIri.stringValue());

            return model;

        } catch (Exception e) {

            throw new APICallFailedException("API call failed with message '" + e.getMessage() + "'");

        } finally {

            if (conn != null) {
                conn.disconnect();
            }

        }

    }
}