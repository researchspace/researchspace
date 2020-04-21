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

package org.researchspace.rest.providers;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.util.Map.Entry;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.MessageBodyWriter;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.config.NamespaceRegistry;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@Produces({ "text/turtle", "application/x-turtle" })
public class Rdf4jModelTurtleMessageBodyWriter implements MessageBodyWriter<Model> {

    @Inject
    private NamespaceRegistry ns;

    @Override
    public boolean isWriteable(Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
        return Model.class.isAssignableFrom(type);
    }

    @Override
    public long getSize(Model t, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType) {
        // method is deprecated by JAX-RS 2.0 and ignored by Jersey runtime
        return -1;
    }

    @Override
    public void writeTo(Model t, Class<?> type, Type genericType, Annotation[] annotations, MediaType mediaType,
            MultivaluedMap<String, Object> httpHeaders, OutputStream entityStream)
            throws IOException, WebApplicationException {

        try {
            for (Entry<String, String> e : ns.getPrefixMap().entrySet())
                t.setNamespace(e.getKey(), e.getValue());
            Rio.write(t, entityStream, RDFFormat.TURTLE);
        } catch (RDFHandlerException e) {
            throw new WebApplicationException(e);
        }
    }

}