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

package com.metaphacts.security;

import org.apache.shiro.SecurityUtils;

import com.metaphacts.api.sparql.SparqlUtil.SparqlOperation;
import com.metaphacts.security.Permissions.SPARQL;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class PermissionUtil {

    public static boolean hasSparqlPermission(SparqlOperation op){
        switch(op){
            case SELECT:{
                return SecurityUtils.getSubject().isPermitted(SPARQL.QUERY_SELECT);
            }
            case CONSTRUCT:{
                return SecurityUtils.getSubject().isPermitted(SPARQL.QUERY_CONSTRUCT);
            }
            case DESCRIBE:{
                return SecurityUtils.getSubject().isPermitted(SPARQL.QUERY_DESCRIBE);
            }
            case ASK:{
                return SecurityUtils.getSubject().isPermitted(SPARQL.QUERY_ASK);
            }
            case UPDATE:{
                return SecurityUtils.getSubject().isPermitted(SPARQL.UPDATE);
            }
            default:{
                return false;
            }
        }
    }
}