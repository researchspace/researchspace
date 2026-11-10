/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest.reconciliation;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Form;
import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.datatypes.XMLDatatypeUtil;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.sail.rest.RESTSail;
import org.researchspace.sail.rest.RESTSailConnection;
import org.researchspace.sail.rest.reconciliation.ReconciliationQueryBuilder.Input;
import org.researchspace.sail.rest.reconciliation.ReconciliationQueryBuilder.ValueKind;

/**
 * Connection for services implementing the Reconciliation Service API.
 * <p>
 * The only difference to {@link RESTSailConnection} is the shape of the
 * request: such services expect all the inputs packed into one JSON document
 * sent as the <code>queries</code> parameter, instead of one request parameter
 * per input. Everything else - service URL, authentication, HTTP headers, rate
 * limit, error handling, <code>ephedra:rowLimit</code>, and the mapping of the
 * response to bindings with <code>ephedra:jsonPath</code> /
 * <code>ephedra:rowIndex</code> - is inherited, so a service is added with a
 * repository configuration and a service descriptor only.
 * <p>
 * An input argument of the descriptor goes to the place of the reconciliation
 * query named by its <code>ephedra:inputJsonPath</code>, or by its own name
 * when there is none: <code>query</code>, <code>type</code>,
 * <code>type_strict</code>, <code>limit</code>, and
 * <code>properties.&lt;pid&gt;</code> or any other name for a property, see
 * {@link ReconciliationQueryBuilder}. Property values are sent as JSON numbers
 * or booleans if <code>spl:valueType</code> is a numeric XSD datatype or
 * <code>xsd:boolean</code>, as <code>{"id": ...}</code> if it is
 * <code>rdfs:Resource</code>, and as strings otherwise.
 * <p>
 * The request is sent as GET, or as a form POST if
 * <code>ephedra:httpMethod</code> is POST. The results are found in the
 * response with <code>ephedra:jsonPath "$.q0.result[*]"</code> on the subject
 * column.
 */
public class ReconciliationSailConnection extends RESTSailConnection {

    public static final String QUERIES_PARAMETER = "queries";

    public ReconciliationSailConnection(RESTSail sailBase) {
        super(sailBase);
    }

    @Override
    protected Response submitGet(WebTarget targetResource, ServiceParametersHolder parametersHolder) {
        // Encoded here because WebTarget#queryParam treats curly braces as URI
        // template variables; already percent-encoded values are left as is by it.
        // Everything except unreserved characters is percent-encoded, '+' and
        // space included: servers decode query strings as form data, where a
        // literal '+' means a space.
        String queries = URLEncoder.encode(buildQueries(parametersHolder), StandardCharsets.UTF_8).replace("+",
                "%20");
        targetResource = auth(targetResource.queryParam(QUERIES_PARAMETER, queries));
        return addHTTPHeaders(targetResource.request()).get();
    }

    @Override
    protected Response submitPost(WebTarget targetResource, ServiceParametersHolder parametersHolder) {
        Form form = new Form(QUERIES_PARAMETER, buildQueries(parametersHolder));
        return addHTTPHeaders(auth(targetResource).request()).post(Entity.form(form));
    }

    protected String buildQueries(ServiceParametersHolder parametersHolder) throws SailException {
        Map<String, Parameter> declared = getSail().getServiceDescriptor().getInputParameters();
        List<Input> inputs = new ArrayList<>();
        for (Map.Entry<String, String> entry : httpInputParameters(parametersHolder).entrySet()) {
            Parameter parameter = declared.get(entry.getKey());
            inputs.add(new Input(target(entry.getKey(), parameter), entry.getValue(), valueKind(parameter)));
        }
        return ReconciliationQueryBuilder.build(inputs);
    }

    private static String target(String name, Parameter parameter) {
        String path = parameter != null ? parameter.getInputJsonPath() : null;
        if (path == null || path.trim().isEmpty()) {
            return name;
        }
        path = path.trim();
        return path.startsWith("$.") ? path.substring(2) : path;
    }

    private static ValueKind valueKind(Parameter parameter) {
        IRI type = parameter != null ? parameter.getValueType() : null;
        if (type == null) {
            return ValueKind.STRING;
        } else if (RDFS.RESOURCE.equals(type)) {
            return ValueKind.ENTITY;
        } else if (XSD.BOOLEAN.equals(type)) {
            return ValueKind.BOOLEAN;
        } else if (XMLDatatypeUtil.isNumericDatatype(type)) {
            return ValueKind.NUMBER;
        }
        return ValueKind.STRING;
    }
}
