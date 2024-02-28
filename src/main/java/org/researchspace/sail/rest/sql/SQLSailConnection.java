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

import java.io.InputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.ws.rs.core.Response;

import com.google.common.collect.Lists;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;
import org.researchspace.sail.rest.AbstractServiceWrappingSailConnection;
import org.researchspace.sail.rest.RESTWrappingSailUtils;
import org.researchspace.sail.rest.sql.SQLSail.SQLParameter;
import org.researchspace.sail.rest.sql.SQLSail.SQLQuery;
import org.researchspace.federation.repository.service.ServiceDescriptor.Parameter;
import org.researchspace.repository.MpRepositoryVocabulary;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class SQLSailConnection extends AbstractServiceWrappingSailConnection<SQLSailConfig> {

    private static final Logger logger = LogManager.getLogger(SQLSailConnection.class);

    protected static final ValueFactory VF = SimpleValueFactory.getInstance();

    protected Connection databaseConnection = null;
    private PreparedStatement ps;

    public SQLSailConnection(AbstractServiceWrappingSail<SQLSailConfig> sailBase) {
        super(sailBase);

        // Initialize connection to the database
        initializeConnection();
    }

    protected void initializeConnection() throws SailException {
        try {

            String url = this.getSail().getConfig().getUrl();
            String username = this.getSail().getConfig().getUsername();
            String passw = this.getSail().getConfig().getPassword();

            MpJDBCDriverManager driverManager = this.getSail().getConfig().getDriverManager();
            this.databaseConnection = driverManager.getConnection(url, username, passw);

        } catch (SQLException e) {
            throw new SailException(e.getMessage());
        }
    }

    protected ResultSet submit(ServiceParametersHolder parametersHolder) throws SailException {

        SQLQuery sqlQuery = ((SQLSail) getSail()).getQueryById(parametersHolder.getSubjVarName());

        // Prepare the statement to handle the input parameters
        // if they are required
        try {
            ps = this.databaseConnection.prepareStatement(sqlQuery.getQuery());

            for (Map.Entry<Integer, SQLParameter> entry : sqlQuery.getInputParametersMap().entrySet()) {

                IRI type = entry.getValue().getType();
                String name = entry.getValue().getName();
                String value = parametersHolder.getInputParameters().get(name);

                if (value == null || value.isEmpty())
                    throw new SailException("The variable " + name + " is missing.");

                if (type.equals(XSD.FLOAT)) {
                    ps.setDouble(entry.getKey(), new Double(value));
                }

                if (type.equals(XSD.STRING)) {
                    ps.setString(entry.getKey(), value);
                }

                if (type.equals(XSD.INTEGER) || type.equals(XSD.INT)) {
                    ps.setInt(entry.getKey(), new Integer(value));
                }

            }

            return ps.executeQuery();

        } catch (SQLException e) {
            throw new SailException(e.getMessage());
        }

    }

    @Override
    protected ServiceParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns)
            throws SailException {

        ServiceParametersHolder res = new ServiceParametersHolder();

        // Check query ID
        Literal queryId = RESTWrappingSailUtils
                .getLiteralObjectInputParameter(stmtPatterns, null, MpRepositoryVocabulary.HAS_QUERY_ID)
                .orElseThrow(() -> new SailException("The SQL query ID was not provided using the "
                        + MpRepositoryVocabulary.HAS_QUERY_ID + " property."));

        res.setSubjVarName(queryId.stringValue());

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
    protected Collection<BindingSet> convertResult2BindingSets(ResultSet resultSet,
            ServiceParametersHolder parametersHolder) throws SailException {

        List<BindingSet> bindingSets = Lists.newArrayList();

        // Convert inputStream to list of binding sets

        try {
            while (resultSet.next()) {

                MapBindingSet mapBindingSet = new MapBindingSet();
                for (Map.Entry<IRI, String> outputParameter : parametersHolder.getOutputVariables().entrySet()) {

                    Parameter parameter = getSail().getServiceDescriptor().getOutputParameters()
                            .get(outputParameter.getKey().getLocalName());
                    IRI type = parameter.getValueType();

                    String strObj = resultSet.getString(outputParameter.getValue());

                    if (strObj != null) {
                        if (StringUtils.equals(type.stringValue(), RDFS.RESOURCE.stringValue())) {
                            logger.trace("Creating Resource ({})", strObj);
                            mapBindingSet.addBinding(outputParameter.getValue(), VF.createIRI(strObj));
                        } else {
                            logger.trace("Creating Literal({},{})", strObj, type);
                            mapBindingSet.addBinding(outputParameter.getValue(), VF.createLiteral(strObj,
                                    type));
                        }
                    }

                }
                bindingSets.add(mapBindingSet);
            }

            return bindingSets;

        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    @Override
    protected Collection<BindingSet> convertResult2BindingSets(InputStream inputStream,
            ServiceParametersHolder parametersHolder) throws SailException {
        throw new UnsupportedOperationException("Unimplemented method 'convertResult2BindingSets'");
    }

    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> executeAndConvertResultsToBindingSet(
            ServiceParametersHolder parametersHolder) {

        ResultSet resultSet = submit(parametersHolder);

        return new CollectionIteration<BindingSet, QueryEvaluationException>(
                convertResult2BindingSets(resultSet, parametersHolder));
    }

}