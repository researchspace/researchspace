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

import java.io.InputStream;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.eclipse.rdf4j.sail.SailException;
import org.apache.commons.compress.utils.Lists;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;

import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class RESTSailConnection extends AbstractRESTWrappingSailConnection {

    public RESTSailConnection(AbstractServiceWrappingSail sailBase) {
        super(sailBase);
    }

    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {
        return Lists.newArrayList();
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {
        RESTParametersHolder res = new RESTParametersHolder();

        // Iterate over input triples in descriptor
        // Use the SPARQL query to get values and create input parameter holder as a set of tuple IRI, value
        for(Map.Entry<IRI,Parameter> entry : getSail().getMapInputParametersByProperty().entrySet()) {

            // Get subject and value
            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Value> value = RESTWrappingSailUtils.getObjectInputParameter(stmtPatterns, subject.orElse(null), entry.getKey());
            
            // Add value from query or default value
            value = value.isPresent() ? value : entry.getValue().getDefaultValue();
            if(value.isPresent())
                res.getInputParameters().put(entry.getValue().getParameterName(), value.get().stringValue());
        }

        for(Map.Entry<IRI, Parameter> entry : getSail().getMapOutputParametersByProperty().entrySet()) {

            Optional<Var> subject = RESTWrappingSailUtils.getSubjectOutputVariable(stmtPatterns, null, entry.getKey());
            Optional<Var> value = RESTWrappingSailUtils.getObjectOutputVariable(stmtPatterns, subject.orElse(null), entry.getKey());

            if(value.isPresent())
                res.getOutputVariables().put(entry.getKey(), value.get().getName());

        }

        return res;
    }
    
}
