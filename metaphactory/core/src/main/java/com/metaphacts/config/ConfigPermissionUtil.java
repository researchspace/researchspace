/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.config;


/**
 * Utility methods for configuration permissions
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class ConfigPermissionUtil {

    public enum APIUsageMode {
        read,
        write
    };
    
    /**
     * Returns the required permission string for using the API in usageMode.
     * This is a SHIRO permission string of the following form:
     * api:<configGroup>:<configIdInGroup>:[read|write].
     */
    public static String getPermissionString(
        final String configGroup, final String configIdInGroup, final APIUsageMode usageMode) {
        
        final StringBuffer buf = new StringBuffer();
        buf.append("api:config:");
        buf.append(configGroup);
        buf.append(":");
        buf.append(configIdInGroup);
        buf.append(":");
        buf.append(usageMode);
      
        return buf.toString();
    }
}