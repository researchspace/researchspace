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

package org.researchspace.sail.rest;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.ws.rs.HttpMethod;
import javax.ws.rs.core.Response;

import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.IOUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.repository.MpRepositoryVocabulary;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.ReadContext;

import gr.forth.ics.isl.x3ml.X3MLEngineFactory;
import net.minidev.json.JSONArray;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class RESTSailConnection extends AbstractRESTWrappingSailConnection<RESTSailConfig> {

    protected static final ValueFactory VF = (ValueFactory) SimpleValueFactory.getInstance();

    public RESTSailConnection(AbstractServiceWrappingSail<RESTSailConfig> sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {

        List<BindingSet> results = Lists.newArrayList();

        try {
            String stringResponse = IOUtils.toString(inputStream, StandardCharsets.UTF_8.name());

            // TODO: check the string format and call the right type. E.g., json or XML
            String type = "x3ml";
            switch (type) {
            case "json":
                Model model = getSail().getServiceDescriptor().getModel();

                // Get a list of output variable names and their json paths
                Map<String, String> jsonPaths = getJsonPaths(parametersHolder.getOutputVariables(), model);

                // Get the root path
                Optional<Parameter> param = getSail().getSubjectParameter();
                String rootPath = param.isPresent() ? getJsonPath(param.get(), model) : "$";

                results = executeJson(stringResponse, jsonPaths, rootPath);
                break;

            case "x3ml":
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                X3MLEngineFactory.create().withInput(new ByteArrayInputStream(stringResponse.getBytes()))
                        .withMappings(new File("/home/artem/tmp/mappings/Mapping258.x3ml"))
                        .withGeneratorPolicy(
                                new File("/home/artem/tmp/mappings/BM_generator_policy___27-01-2021195625___1355.xml"))
                        .withOutput(output, X3MLEngineFactory.OutputFormat.RDF_XML).execute();
                Model graph = Rio.parse(new ByteArrayInputStream(output.toByteArray()), "", RDFFormat.RDFXML);
                List<BindingSet> bindings = Lists.newArrayList();
                graph.forEach(st -> {
                    MapBindingSet binding = new MapBindingSet();
                    binding.addBinding("sg", st.getSubject());
                    binding.addBinding("sp", st.getPredicate());
                    binding.addBinding("so", st.getObject());
                    bindings.add(binding);
                });
                results = bindings;

            default:
                break;
            }

            return results;
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * 
     * @param res
     * @param parametersHolder
     * @param model
     */
    private List<BindingSet> executeJson(String res, Map<String, String> jsonPaths, String rootPath) {

        // Parse the response
        ReadContext context = JsonPath.parse(res);

        // Get the root object
        Object root = context.read(rootPath);

        List<BindingSet> results = Lists.newArrayList();

        // Manipulate the results in different ways based on its structure
        if (root instanceof JSONArray)
            results = iterateJsonArray((JSONArray) root, jsonPaths);

        if (root instanceof Map)
            results = iterateJsonMap((Map) root, jsonPaths);

        return results;
    }

    /**
     * 
     * @param array
     * @param outputVariables
     * @param model
     * @return
     */
    private List<BindingSet> iterateJsonArray(JSONArray array, Map<String, String> jsonPaths) {

        List<BindingSet> bindingSets = Lists.newArrayList();

        // Iterate over each object in JSONArray and evaluate its
        for (Object object : array) {
            MapBindingSet mapBindingSet = new MapBindingSet();

            // Evaluate each jsonPath singularly and add the result to the binding
            for (Map.Entry<String, String> path : jsonPaths.entrySet()) {
                mapBindingSet.addBinding(path.getKey(),
                        VF.createLiteral(JsonPath.read(object, path.getValue()).toString(), XSD.STRING));
            }

            bindingSets.add(mapBindingSet);
        }

        return bindingSets;
    }

    /**
     * 
     * This function iterate over jsonPaths and evaluate each against the JSON
     * object structured as a map
     * 
     * @param map
     * @param jsonPaths
     * @return
     */
    private List<BindingSet> iterateJsonMap(Map map, Map<String, String> jsonPaths) {

        List<BindingSet> bindingSets = Lists.newArrayList();
        MapBindingSet mapBindingSet = new MapBindingSet();

        for (Map.Entry<String, String> path : jsonPaths.entrySet()) {
            Object object = JsonPath.read(map, path.getValue());
            mapBindingSet.addBinding(path.getKey(), VF.createLiteral(object.toString(), XSD.STRING));
        }

        bindingSets.add(mapBindingSet);
        return bindingSets;
    }

    /**
     * 
     * @param outputVariables
     * @param model
     * 
     * @return Map containing a couple output variable name and its json path from
     *         the model
     */
    private Map<String, String> getJsonPaths(Map<IRI, String> outputVariables, Model model) {

        Map<String, String> jsonPaths = new HashMap<>();

        for (Map.Entry<IRI, String> output : outputVariables.entrySet())
            jsonPaths.put(output.getValue(),
                    getJsonPath(getSail().getMapOutputParametersByProperty().get(output.getKey()), model));

        return jsonPaths;
    }

    /**
     * Default implementation calling the API using an HTTP GET method. Parameters
     * are passed via URL. JSON expected as a result format.
     * 
     * @param parametersHolder
     * @return
     */
    @Override
    protected Response submit(RESTParametersHolder parametersHolder) {
        try {
            String httpMethod = getSail().getConfig().getHttpMethod();

            // Case with POST
            if (httpMethod.equals(HttpMethod.POST))
                return submitPost(parametersHolder);

            // Default case as GET
            return super.submit(parametersHolder);

        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    /**
     * 
     * @param parameter
     * @param model
     * 
     *                  Filter the statements having the JSON path predicate and
     *                  return the one belonging to the matching parameter
     * 
     * @return The string describing the JSON path for the matching parameter
     */
    private String getJsonPath(Parameter parameter, Model model) {
        return model.filter(parameter.getRootNode(), MpRepositoryVocabulary.JSON_PATH, null).stream()
                .map(statement -> statement.getObject()).map(value -> value.stringValue()).findFirst().orElse("");
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {
        RESTParametersHolder res = new RESTParametersHolder();

        // Iterate over input triples in descriptor
        // Use the SPARQL query to get values and create input parameter holder as a set
        // of tuple IRI, value
        for (Map.Entry<IRI, Parameter> entry : getSail().getMapInputParametersByProperty().entrySet()) {

            // Get subject and value
            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Value> value = RESTWrappingSailUtils.getObjectInputParameter(stmtPatterns, subject.orElse(null),
                    entry.getKey());

            // Add value from query or default value
            value = value.isPresent() ? value : entry.getValue().getDefaultValue();
            if (value.isPresent())
                res.getInputParameters().put(entry.getValue().getParameterName(), value.get().stringValue());
        }

        for (Map.Entry<IRI, Parameter> entry : getSail().getMapOutputParametersByProperty().entrySet()) {

            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Var> value = RESTWrappingSailUtils.getObjectOutputVariable(stmtPatterns, subject.orElse(null),
                    entry.getKey());

            if (value.isPresent())
                res.getOutputVariables().put(entry.getKey(), value.get().getName());
        }

        return res;
    }

}
