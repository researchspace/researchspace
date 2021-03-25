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

import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.inject.Provider;

import com.google.common.collect.Maps;
import com.google.inject.Inject;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.SPIN;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;
import org.researchspace.vocabulary.SPL;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class SQLSail extends AbstractServiceWrappingSail<SQLSailConfig> {

    private static final String SQL_PARAMETER = "?";
    private static final String SQL_PARAMETER_DELIMITER = "_";

    public class SQLParameter {

        private String name;
        private IRI type;

        public SQLParameter(String name) {
            this.setName(name);
            this.setType(null);
        }

        public IRI getType() {
            return type;
        }

        public void setType(IRI type) {
            this.type = type;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }


    public class SQLQuery {

        private String query;
        private Map<Integer, SQLParameter> inputParametersMap;

        public SQLQuery() {
            setQuery(null);
            setInputParametersMap(Maps.newHashMap());
        }

        public Map<Integer, SQLParameter> getInputParametersMap() {
            return inputParametersMap;
        }

        public void setInputParametersMap(Map<Integer, SQLParameter> inputParametersMap) {
            this.inputParametersMap = inputParametersMap;
        }

        public String getQuery() {
            return query;
        }

        public void setQuery(String query) {
            this.query = query;
        }

        public void putInput(Integer index, SQLParameter parameter) {
            getInputParametersMap().put(index, parameter);
        }

    }

    private Map<String, SQLQuery> sqlQueriesMap =  Maps.newHashMap();
    private static final Pattern SQL_VARS_PATTERN = Pattern.compile("\\?[a-zA-Z_]+");

    @Inject
    Provider<MpJDBCDriverManager> jdbcDriverManager;

    public SQLSail(SQLSailConfig config) {
        super(config);
    }

    protected void parseQueriesMap() {

        Model model = getServiceDescriptor().getModel();

        Set<Resource> queries = Models.getPropertyResources(model, getServiceDescriptor().getServiceIRI(), MpRepositoryVocabulary.INCLUDE_SQL_QUERY);

        queries.stream().forEach(resource -> {
            String queryId = Models.getPropertyString(model, resource, MpRepositoryVocabulary.HAS_QUERY_ID).orElse("");
            String queryText = Models.getPropertyString(model, resource, MpRepositoryVocabulary.HAS_QUERY_TEXT).orElse("");

            Matcher matcher = SQL_VARS_PATTERN.matcher(queryText);
            SQLQuery query = new SQLQuery();

            int index = 0;

            while (matcher.find()) { 
                String varName = matcher.group().replace(SQL_PARAMETER, "");
                Set<Resource> res = Models.getPropertyResources(model, getServiceDescriptor().getServiceIRI(), SPIN.CONSTRAINT_PROPERTY);

                SQLParameter sqlParameter = new SQLParameter(varName);

                res.stream()
                .filter(
                    reso -> {
                        String tmp = Models.getPropertyString(model, reso, SPL.PREDICATE_PROPERTY).orElse("");
                        return StringUtils.equals(MpRepositoryVocabulary.NAMESPACE.concat(SQL_PARAMETER_DELIMITER).concat(varName), tmp);
                    }
                ).forEach(
                    reso-> {
                        IRI typeIri = Models.getPropertyIRI(model, reso, SPL.VALUETYPE_PROPERTY).orElse(null);
                        sqlParameter.setType(typeIri);
                    }
                );

                query.putInput(++index, sqlParameter);
            }

            query.setQuery(matcher.replaceAll(SQL_PARAMETER));
            sqlQueriesMap.put(queryId, query);
        });
    }

    public Map<String, SQLQuery> getSQLQueries() {
        if (sqlQueriesMap.isEmpty())
            parseQueriesMap();

        return this.sqlQueriesMap;
    }

    public SQLQuery getQueryById(String id) {
        if (sqlQueriesMap.isEmpty())
            parseQueriesMap();
            
        return this.sqlQueriesMap.get(id);
    }


    @Override
    protected SailConnection getConnectionInternal() throws SailException {
        initParameters();

        getConfig().setDriverManager(this.jdbcDriverManager.get());

        return new SQLSailConnection(this);
    }
}
