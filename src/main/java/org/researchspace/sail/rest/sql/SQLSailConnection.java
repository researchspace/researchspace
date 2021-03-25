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


package org.researchspace.sail.rest.sql;

import java.sql.ResultSet;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.google.common.collect.Lists;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;
import org.researchspace.sail.rest.RESTWrappingSailUtils;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class SQLSailConnection extends AbstractSQLWrappingSailConnection<SQLSailConfig> {

    protected static final ValueFactory VF = (ValueFactory) SimpleValueFactory.getInstance();

    public SQLSailConnection(AbstractServiceWrappingSail<SQLSailConfig> sailBase) {
        super(sailBase);

        // Initialize connection to the database
        initializeConnection();
    }

    @Override
    protected ParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {

        ParametersHolder res = new SQLParametersHolder();

        // Check query ID
        Literal queryId = RESTWrappingSailUtils.getLiteralObjectInputParameter(stmtPatterns, null, MpRepositoryVocabulary.HAS_QUERY_ID).orElseThrow(() -> new SailException("The SQL query ID was not provided using the " + MpRepositoryVocabulary.HAS_QUERY_ID + " property."));

        res.setIdentifier(queryId.stringValue());

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

    @Override
    protected Collection<BindingSet> convertObject2BindingSets(Object object, ParametersHolder parametersHolder)
            throws SailException {
        
        // Check if object is of type ResultSet
        if (!(object instanceof ResultSet))
            throw new SailException();

        List<BindingSet> results = Lists.newArrayList();
        ServiceDescriptor descriptor = getSail().getServiceDescriptor();
        ResultSet resultSet = (ResultSet) object;

        try{
            while(resultSet.next()) {

                MapBindingSet bs = new MapBindingSet();
                for(Map.Entry<IRI, String> entry : parametersHolder.getOutputVariables().entrySet()) {
    
                    String strObj = resultSet.getString(entry.getValue());
    
                    Parameter parameter = (Parameter) descriptor.getOutputParameters().get(entry.getValue());

                    // TODO update Literal type to match service descriptor
                    bs.addBinding(parameter.getParameterName(), VF.createLiteral(strObj, XSD.STRING));
                }
                results.add(bs);
            }
    
            return results;

        } catch (Exception e) {
            throw new SailException(e);
        }
    }

}
