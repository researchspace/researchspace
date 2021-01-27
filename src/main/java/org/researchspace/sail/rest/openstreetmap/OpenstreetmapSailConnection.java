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

package org.researchspace.sail.rest.openstreetmap;

import java.io.InputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.io.IOUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractRESTWrappingSailConnection;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

import com.google.common.collect.Lists;
import com.jayway.jsonpath.Configuration;

import net.minidev.json.JSONArray;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class OpenstreetmapSailConnection extends AbstractRESTWrappingSailConnection<OpenstreetmapSailConfig> {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    public static final String BASE_IRI = "http://www.researchspace.com/resource/assets/Ontologies/openstreetmap#";
    public static final String Q = "q";
    public static final String POLYGON_TEXT = "polygon_text";
    public static final String FORMAT = "format";
    public static final String EXTRA_TAGS = "extratags";
    public static final String DISPLAY_NAME = "displayName";
    public static final String GEO_TEXT = "geoText";
    public static final String WIKIDATA = "wikidata";

    public static final IRI IRI_Q = VF.createIRI(BASE_IRI, Q);
    public static final IRI IRI_POLYGON_TEXT = VF.createIRI(BASE_IRI, POLYGON_TEXT);
    public static final IRI IRI_FORMAT = VF.createIRI(BASE_IRI, FORMAT);
    public static final IRI IRI_EXTRA_TAGS = VF.createIRI(BASE_IRI, EXTRA_TAGS);
    public static final IRI IRI_DISPLAY_NAME = VF.createIRI(BASE_IRI, DISPLAY_NAME);
    public static final IRI IRI_GEO_TEXT = VF.createIRI(BASE_IRI, GEO_TEXT);
    public static final IRI IRI_WIKIDATA = VF.createIRI(BASE_IRI, WIKIDATA);

    public OpenstreetmapSailConnection(AbstractServiceWrappingSail<OpenstreetmapSailConfig> sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {

        // Create the instance of the resulting list
        List<BindingSet> outList = Lists.newArrayList();

        try {

            // Read results and get the json object
            StringWriter mapper = new StringWriter();
            IOUtils.copy(inputStream, mapper, StandardCharsets.UTF_8);

            // Get the resulting json object parsing the result
            JSONArray jsonFile = (JSONArray) Configuration.defaultConfiguration().jsonProvider()
                    .parse(mapper.toString());

            // Read each object contained in the json result
            for (Object obj : jsonFile) {

                Map<String, Object> resMap = (Map<String, Object>) obj;
                MapBindingSet bs = new MapBindingSet();

                // Save display name
                if (parametersHolder.getOutputVariables().containsKey(IRI_DISPLAY_NAME)
                        && !parametersHolder.getOutputVariables().get(IRI_DISPLAY_NAME).isEmpty()) {
                    Literal displayName = VF.createLiteral((String) resMap.get("display_name"));
                    bs.addBinding(parametersHolder.getOutputVariables().get(IRI_DISPLAY_NAME), displayName);
                }

                // Save geo text
                if (parametersHolder.getOutputVariables().containsKey(IRI_GEO_TEXT)
                        && !parametersHolder.getOutputVariables().get(IRI_GEO_TEXT).isEmpty()) {
                    Literal wkt = VF.createLiteral((String) resMap.get("geotext"));
                    bs.addBinding(parametersHolder.getOutputVariables().get(IRI_GEO_TEXT), wkt);
                }

                // Use extratags if it is declared as 1
                // Default is 1
                if (parametersHolder.getInputParameters().containsKey(EXTRA_TAGS)
                        && parametersHolder.getInputParameters().get(EXTRA_TAGS).equals("1")) {
                    Map<String, Object> extratags = (Map<String, Object>) resMap.get(EXTRA_TAGS);

                    // Save wikidata
                    if (parametersHolder.getOutputVariables().containsKey(IRI_WIKIDATA)
                            && !parametersHolder.getOutputVariables().get(IRI_WIKIDATA).isEmpty()) {

                        Literal wikidata = VF.createLiteral(
                                (String) (extratags.containsKey(WIKIDATA) ? extratags.get(WIKIDATA) : ""));
                        bs.addBinding(parametersHolder.getOutputVariables().get(IRI_WIKIDATA), wikidata);
                    }
                }
                outList.add(bs);
            }

            return outList;
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {
        RESTParametersHolder res = new RESTParametersHolder();

        // Check if mandatory parameters have been passaed through query
        List<StatementPattern> mandatoryParameters = stmtPatterns.stream()
                .filter(stmtPattern -> stmtPattern.getPredicateVar().hasValue()

                        // Check if query contains
                        // <http://www.researchspace.com/resource/assets/Ontologies/geonames#postalCode>
                        // Otherwise throw exception
                        && stmtPattern.getPredicateVar().getValue().equals(IRI_Q))
                .collect(Collectors.toList());
        if (mandatoryParameters.isEmpty()) {
            throw new SailException("The mandatory parameter was not provided, must be passed via the reserved <"
                    + IRI_Q.stringValue() + "> property.");
        } // Set parameters to query
        mandatoryParameters.stream().forEach(pattern -> {
            res.getInputParameters().put(Q, pattern.getObjectVar().getValue().stringValue());
            res.getOutputVariables().put(IRI_Q, pattern.getObjectVar().getValue().stringValue());
        });

        // Set default parameters
        res.getInputParameters().put(POLYGON_TEXT, "1");
        res.getInputParameters().put(EXTRA_TAGS, "1");

        // Update polygon text if explicit in query
        stmtPatterns.stream().filter(pattern -> pattern.getPredicateVar().getValue().equals(IRI_POLYGON_TEXT)).forEach(
                pattern -> res.getInputParameters().put(POLYGON_TEXT, pattern.getObjectVar().getValue().stringValue()));

        stmtPatterns.stream().filter(pattern -> pattern.getPredicateVar().getValue().equals(IRI_EXTRA_TAGS)).forEach(
                pattern -> res.getInputParameters().put(EXTRA_TAGS, pattern.getObjectVar().getValue().stringValue()));

        // Set output variables
        stmtPatterns.stream().filter(pattern -> pattern.getPredicateVar().getValue().equals(IRI_DISPLAY_NAME))
                .forEach(pattern -> res.getOutputVariables().put(IRI_DISPLAY_NAME, pattern.getObjectVar().getName()));

        stmtPatterns.stream().filter(pattern -> pattern.getPredicateVar().getValue().equals(IRI_GEO_TEXT))
                .forEach(pattern -> res.getOutputVariables().put(IRI_GEO_TEXT, pattern.getObjectVar().getName()));

        stmtPatterns.stream().filter(pattern -> pattern.getPredicateVar().getValue().equals(IRI_WIKIDATA))
                .forEach(pattern -> res.getOutputVariables().put(IRI_WIKIDATA, pattern.getObjectVar().getName()));

        // The format must alway be JSON
        res.getInputParameters().put(FORMAT, "json");

        return res;
    }

}
