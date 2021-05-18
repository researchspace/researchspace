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

import com.google.common.collect.Maps;

import org.researchspace.sail.rest.AbstractServiceWrappingSailConfig;
import org.researchspace.sail.rest.sql.SQLSail.SQLQueryWrapper;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class SQLSailConfig extends AbstractServiceWrappingSailConfig {

    private MpJDBCDriverManager driverManager; 
    private Map<String, SQLQueryWrapper> sqlQueriesMap =  Maps.newHashMap();

    public MpJDBCDriverManager getDriverManager() {
        return driverManager;
    }
        
    public void setDriverManager(MpJDBCDriverManager driverManager) {
        this.driverManager = driverManager;
    }

    
    public SQLQueryWrapper getSqlQueryById(String queryId) {
        return sqlQueriesMap.get(queryId);
    }


    public void setQueriesMap (Map<String, SQLQueryWrapper> sqlQueriesMap) {
        this.sqlQueriesMap = sqlQueriesMap;
    }
}
