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

import java.lang.annotation.Annotation;
import java.lang.reflect.Type;

import javax.inject.Singleton;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ParamConverter;
import javax.ws.rs.ext.ParamConverterProvider;

import org.eclipse.rdf4j.common.net.ParsedIRI;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * JAX-RS {@link ParamConverterProvider} for {@link String} -> {@link IRI}
 * conversion.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
public class IriParamProvider implements ParamConverterProvider {
    private final ValueFactory vf = SimpleValueFactory.getInstance();

    @Override
    public <T> ParamConverter<T> getConverter(final Class<T> rawType, Type genericType,
            final Annotation[] annotations) {
        if (rawType.equals(IRI.class)) {
            return new ParamConverter<T>() {
                @Override
                public T fromString(final String value) {
                    if (value == null) {
                        return null;
                    }
                    try {
                        boolean isAbsoluteIri = ParsedIRI.create(value).isAbsolute();
                        if (!isAbsoluteIri) {
                            throw new IllegalArgumentException("IRI \"" + value + "\" is not an absolute IRI.");
                        }
                        // value has been already URL-decoded by jersey
                        IRI uri = vf.createIRI(value);
                        return rawType.cast(uri);
                    } catch (final IllegalArgumentException ex) {
                        throw new WebApplicationException(getErrorResponse(ex));
                    }
                }

                @Override
                public String toString(final T value) throws IllegalArgumentException {

                    return value != null ? value.toString() : null;
                }

                protected Response getErrorResponse(IllegalArgumentException ex) {
                    return Response.status(400).entity(ex.getMessage()).type(MediaType.TEXT_PLAIN).build();
                }
            };
        }
        return null;
    }
}