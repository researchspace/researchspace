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

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.Map;
import java.util.Objects;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.evaluation.iterator.CollectionIteration;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;
import org.researchspace.sail.rest.AbstractServiceWrappingSailConnection;
import org.researchspace.sail.rest.sql.SQLSail.SQLParameter;
import org.researchspace.sail.rest.sql.SQLSail.SQLQuery;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public abstract class AbstractSQLWrappingSailConnection<C extends AbstractSQLWrappingSailConfig> 
    extends AbstractServiceWrappingSailConnection<C> {

    protected Connection databaseConnection = null;

    protected AbstractSQLWrappingSailConnection(AbstractServiceWrappingSail<C> sailBase) {
        super(sailBase);
    }

    @Override
    protected CloseableIteration<? extends BindingSet, QueryEvaluationException> executeAndConvertResultsToBindingSet(
            ParametersHolder parametersHolder) {

        ResultSet stream = submit(parametersHolder);

        Collection<BindingSet> collection = convertObject2BindingSets(stream,parametersHolder);
        
        return new CollectionIteration<BindingSet, QueryEvaluationException>(collection);
    }
    
    @Override
    protected abstract Collection<BindingSet> convertObject2BindingSets(Object object,
        ParametersHolder parametersHolder) throws SailException;

    protected ResultSet submit(ParametersHolder parametersHolder) throws SailException {

        SQLQuery sqlQuery = ((SQLSail)getSail()).getQueryById(parametersHolder.getIdentifier());

        // Prepare the statement to handle the input parameters 
        // if they are required 
        try {
            PreparedStatement ps = databaseConnection.prepareStatement(sqlQuery.getQuery());

            for (Map.Entry<Integer, SQLParameter> entry : sqlQuery.getInputParametersMap().entrySet()) {

                IRI type = entry.getValue().getType();
                String name = entry.getValue().getName();
                String value = parametersHolder.getInputParameters().get(name);

                if(Objects.isNull(value))
                    throw new SailException("The variable "+name+" is missing.");

                //TODO handle other types
                if(type.equals(XSD.FLOAT)) {
                    ps.setDouble(entry.getKey(), new Double(value));
                }

                if(type.equals(XSD.STRING)) {
                    ps.setString(entry.getKey(), value);
                }

                if(type.equals(XSD.INTEGER) || type.equals(XSD.INT)) {
                    ps.setInt(entry.getKey(), new Integer(value));
                }

            }

            return ps.executeQuery();
        } catch (SQLException e) {
            throw new SailException(e.getMessage());
        }

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

}
