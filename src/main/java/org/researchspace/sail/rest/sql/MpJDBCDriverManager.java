/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.concurrent.CopyOnWriteArrayList;

import javax.inject.Singleton;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Singleton
public class MpJDBCDriverManager {

    private static final Logger logger = LogManager.getLogger(MpJDBCDriverManager.class);

    private final CopyOnWriteArrayList<Driver> registeredDrivers = new CopyOnWriteArrayList<>();

    public MpJDBCDriverManager() {
    }

    public Connection getConnection(String url) throws SQLException {

        java.util.Properties info = new java.util.Properties();
        return (getConnection(url, info));
    }

    public Connection getConnection(String url, String user, String password) throws SQLException {
        return getConnection(url, user, password, new java.util.Properties());
    }

    public Connection getConnection(String url, String user, String password, java.util.Properties info)
            throws SQLException {
        if (user != null) {
            info.put("user", user);
        }
        if (password != null) {
            info.put("password", password);
        }

        return (getConnection(url, info));
    }

    public Connection getConnection(String url, java.util.Properties info) throws SQLException {

        if (url == null) {
            throw new SQLException("The url cannot be null", "08001");
        }

        logger.trace("DriverManager.getConnection(\"" + url + "\")");

        SQLException reason = null;
        SQLException originalReason = null;

        try {
            return DriverManager.getConnection(url, info);
        } catch (SQLException e) {
            originalReason = e;
        }

        for (Driver driver : registeredDrivers) {
            try {
                Connection con = driver.connect(url, info);
                if (con != null) {
                    logger.trace("getConnection returning " + driver.getClass().getName());
                    return (con);
                }
            } catch (SQLException ex) {
                if (reason == null) {
                    reason = ex;
                }
            }
        }

        if (reason == null) {
            reason = originalReason;
        }

        // if we got here nobody could connect.
        if (reason != null) {
            logger.warn("getConnection failed: " + reason);
            throw reason;
        }

        logger.warn("getConnection: no suitable driver found for " + url);
        throw new SQLException("No suitable driver found for " + url, "08001");
    }

    public void registerDriver(Driver driver) {
        registeredDrivers.addIfAbsent(driver);
    }
}
