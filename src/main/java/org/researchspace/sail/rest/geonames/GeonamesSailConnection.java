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

package org.researchspace.sail.rest.geonames;

import java.io.InputStream;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractRESTWrappingSailConnection;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class GeonamesSailConnection extends AbstractRESTWrappingSailConnection {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    public static final String BASE_IRI = "http://www.researchspace.com/resource/assets/Ontologies/geonames#";
    public static final String POSTAL_CODE = "postalCode";
    public static final String COUNTRY = "country";
    public static final String RADIUS = "radius";
    public static final String USERNAME = "username";

    public static final String POSTAL_CODES = "postalCodes";
    public static final String PLACE_NAME = "placeName";

    public static final IRI IRI_POSTAL_CODE = VF.createIRI(BASE_IRI, POSTAL_CODE);
    public static final IRI IRI_COUNTRY = VF.createIRI(BASE_IRI, COUNTRY);
    public static final IRI IRI_RADIUS = VF.createIRI(BASE_IRI, RADIUS);
    public static final IRI IRI_USERNAME = VF.createIRI(BASE_IRI, USERNAME);
    public static final IRI IRI_LABEL = VF.createIRI("<http://www.w3.org/2000/01/rdf-schema#label>");

    public GeonamesSailConnection(AbstractServiceWrappingSail sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {

        try{
            // Read results and create a list of entries to iterate
            ObjectMapper mapper = new ObjectMapper();
            HashMap<String, Object> map = mapper.readValue(inputStream, HashMap.class);
            List<Object> resList = (List<Object>) map.get(POSTAL_CODES);

            // Save the list of results
            List<BindingSet> outList = Lists.newArrayList();

            // Iterate over results
            for(Object resObject : resList) {
                Map<String, Object> resMap = (Map<String, Object>) resObject;
                MapBindingSet bs = new MapBindingSet();

                // Check if the query requested the label
                // If so, add the result from Geonames to the results of the query
                if(parametersHolder.getOutputVariables().containsKey(RDFS.LABEL)) {
                    String strVal = resMap.containsKey(PLACE_NAME) ? (String) resMap.get(PLACE_NAME) : "";
                    bs.addBinding(parametersHolder.getOutputVariables().get(RDFS.LABEL), VF.createLiteral(strVal));
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
        List<StatementPattern> mandatoryParameters = stmtPatterns.stream().filter(
            stmtPattern -> stmtPattern.getPredicateVar().hasValue() 
                
                // Check if query contains <http://www.researchspace.com/resource/assets/Ontologies/geonames#postalCode>
                // Otherwise throw exception
                && stmtPattern.getPredicateVar().getValue().equals(IRI_POSTAL_CODE)
            ).collect(Collectors.toList());
        if(mandatoryParameters.isEmpty()) {
            throw new SailException("The mandatory parameter was not provided, must be passed via the reserved <"
                    + IRI_POSTAL_CODE.stringValue() + "> property.");
        }

        // Set parameters to query
        mandatoryParameters.stream().forEach(stmtPattern -> {
            res.getOutputVariables().put(IRI_POSTAL_CODE, stmtPattern.getSubjectVar().getName());
            res.getInputParameters().put(POSTAL_CODE.toLowerCase(), stmtPattern.getObjectVar().getValue().stringValue());
        });

        // Add input country 
        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(IRI_COUNTRY))
            .forEach(stmtPattern -> res.getInputParameters().put(COUNTRY, stmtPattern.getObjectVar().getValue().stringValue()));

        // Add input radius
        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(IRI_RADIUS))
            .forEach(stmtPattern -> res.getInputParameters().put(RADIUS, stmtPattern.getObjectVar().getValue().stringValue()));

        // Add input username
        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(IRI_USERNAME))
            .forEach(stmtPattern -> res.getInputParameters().put(USERNAME, stmtPattern.getObjectVar().getValue().stringValue()));
        
        // Add output label
        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(RDFS.LABEL))
                .forEach(stmtPattern -> res.getOutputVariables().put(RDFS.LABEL, stmtPattern.getObjectVar().getName()));

        return res;
    }
    
}
