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

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
final public class Permissions {

    public static class TEMPLATE_PAGES{
        public static final String EDIT_VIEW = "templates:edit:view";
        public static final String EDIT_SAVE = "templates:edit:save";
        public static final String INFO_EXPORT = "templates:info:export";
        public static final String INFO_VIEW = "templates:info:view";
        public static final String INFO_DELETE = "templates:info:delete";
    }

    public static class ACCOUNTS{
        // right to query account informations
        public static final String QUERY = "accounts:users:query";
        // right to create new accounts
        public static final String CREATE = "accounts:users:create";
        // right to delete accounts
        public static final String DELETE = "accounts:users:delete";
        // right to query LDAP users metadata
        public static final String LDAP_SYNC = "accounts:ldap:sync";
    }

    public static class PERMISSIONS{
        // right to query permissions for others
        public static final String QUERY = "accounts:permissions:query";
        // right to assign permissions to users
        public static final String ASSIGN_TO_USERS = "accounts:permissions:assign:user";
        // right to assign permissions to roles
        public static final String ASSIGN_TO_ROLES = "accounts:permissions:assign:roles";
    }

    public static class ROLES{
        public static final String QUERY = "accounts:roles:query";
        // right to create new roles
        public static final String CREATE = "accounts:roles:create";
        // right to assign roles to user
        public static final String ASSIGN_TO_USER = "accounts:roles:assign";
    }

    public static class NAMESPACES{
        public static final String DELETE = "namespaces:delete";
        public static final String CREATE = "namespaces:create";
        public static final String CHANGE = "namespaces:change";
    }

    public static class SPARQL{
        public static final String QUERY_SELECT = "sparql:query:select";
        public static final String QUERY_ASK = "sparql:query:ask";
        public static final String QUERY_DESCRIBE = "sparql:query:describe";
        public static final String QUERY_CONSTRUCT = "sparql:query:construct";
        public static final String UPDATE = "sparql:update";

        public static final String GRAPH_STORE_HEAD = "sparql:graphstore:head";
        public static final String GRAPH_STORE_GET = "sparql:graphstore:get";
        public static final String GRAPH_STORE_CREATE = "sparql:graphstore:create";
        public static final String GRAPH_STORE_UPDATE = "sparql:graphstore:update";
        public static final String GRAPH_STORE_DELETE = "sparql:graphstore:delete";
    }

    public static class CONTAINER{
        public static final String CREATE_CONTAINER_IN_ROOT = "container:root:create";
    }

    public static class FORMS_LDP{
    	public static final String CREATE = "forms:ldp:create";
    	public static final String UPDATE = "forms:ldp:update";
    }

    public static class FORMS_SPARQL{
        public static final String CREATE = "forms:sparql:insert";
        public static final String UPDATE = "forms:sparql:delete";
    }

    public static class CACHES{
        public static final String INVALIDATE_ALL = "caches:*:invalidate";
    }

    public static class SERVICES {
        public static final String URL_MINIFY = "services:url-minify";
    }

}
