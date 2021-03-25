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

import org.researchspace.sail.rest.AbstractServiceWrappingSailConfig;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */

public class AbstractSQLWrappingSailConfig extends AbstractServiceWrappingSailConfig {
    
    protected MpJDBCDriverManager driverManager; 
    protected String username;
    protected String password;

    public MpJDBCDriverManager getDriverManager() {
        return driverManager;
    }
        
    public void setDriverManager(MpJDBCDriverManager driverManager) {
        this.driverManager = driverManager;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
