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

package org.researchspace.security;

import org.eclipse.rdf4j.model.IRI;
import org.researchspace.api.sparql.SparqlUtil.SparqlOperation;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class Permissions {
    public enum APIUsageMode {
        read, write
    }

    /**
     * Utility methods for configuration permissions
     *
     * @author Michael Schmidt <ms@metaphacts.com>
     */
    @PermissionsDocGroup(desc = "Permissions for managing configuration properties.")
    public static class CONFIGURATION {
        @PermissionsDocField(desc = "Grants permission to configuration properties.", example = "/org/researchspace/security/aclhelp/api_config.html")
        public static final String API_CONFIG = "api:config:{configGroup}:{propertyName}:{usageMode}";

        /**
         * Returns the required permission string for using the API in usageMode. This
         * is a SHIRO permission string of the following form:
         * api:<configGroup>:<configIdInGroup>:[read|write].
         */
        public static String getPermissionString(String configGroup, String configIdInGroup, APIUsageMode usageMode) {
            return "api:config:" + configGroup + ":" + configIdInGroup + ":" + usageMode;
        }
    }

    @PermissionsDocGroup(desc = "Permissions for pages.")
    public static class PAGES {
        public static enum Action {
            @PermissionsDocField(desc = "Grants permission to view template page html code.", pattern = "pages:edit:view:{<page_iri>|regex(<regex_expression>)}", example = "/org/researchspace/security/aclhelp/page_edit_view.html")
            EDIT_VIEW("edit:view"),

            @PermissionsDocField(desc = "Grants permission to save template and page html code.", pattern = "pages:edit:save:{<page_iri>|regex(<regex_expression>)}", example = "/org/researchspace/security/aclhelp/page_edit_save.html")
            EDIT_SAVE("edit:save"),

            @PermissionsDocField(desc = "Grants permission to export templates and static pages", pattern = "pages:info:export:{<page_iri>|regex(<regex_expression>)}")
            INFO_EXPORT("info:export"),

            @PermissionsDocField(desc = "Grants permission to view meta-information about templates and static pages", pattern = "pages:info:view:{<page_iri>|regex(<regex_expression>)}")
            INFO_VIEW("info:view"),

            @PermissionsDocField(desc = "Grants permission to delete templates and static pages", pattern = "pages:info:delete:{<page_iri>|regex(<regex_expression>)}")
            INFO_DELETE("info:delete"),

            @PermissionsDocField(desc = "Grants permission to view pages with given URIs.", pattern = "pages:view:{<page_iri>|regex(<regex_expression>)}", example = "/org/researchspace/security/aclhelp/page_view.html")
            VIEW("view");

            final String action;

            private Action(String action) {
                this.action = action;
            }

            @Override
            public String toString() {
                return action;
            }
        }

        public static final String DOMAIN = "pages";
        private static final String PREFIX = DOMAIN + ":";

        public static String templateOperationDefaultPermission(Action action) {
            return PREFIX + action.toString();
        }

        public static String templateOperationPermission(IRI iri, Action action) {
            return PREFIX + action.toString() + ":<" + iri.stringValue() + ">";
        }
    }

    @PermissionsDocGroup(desc = "Permissions for managing accounts.")
    public static class ACCOUNTS {

        @PermissionsDocField(desc = "Grants permission to query user account information (i.e. roles/permissions).")
        public static final String QUERY = "accounts:users:query";

        @PermissionsDocField(desc = "Grants permission to create and update user accounts.")
        public static final String CREATE = "accounts:users:create";

        @PermissionsDocField(desc = "Grants permission to delete user accounts.")
        public static final String DELETE = "accounts:users:delete";

        @PermissionsDocField(desc = "Grants permission to trigger LDAP metadata synchronization.")
        public static final String LDAP_SYNC = "accounts:ldap:sync";
    }

    @PermissionsDocGroup(desc = "Permissions for managing permissions.")
    public static class PERMISSIONS {

        @PermissionsDocField(desc = "Grants permission to query permissions information.")
        public static final String QUERY = "accounts:permissions:query";

        @PermissionsDocField(desc = "Grants permission to assign permissions to users.")
        public static final String ASSIGN_TO_USERS = "accounts:permissions:assign:user";

        @PermissionsDocField(desc = "Grants permission to assign permissions to roles.")
        public static final String ASSIGN_TO_ROLES = "accounts:permissions:assign:roles";
    }

    @PermissionsDocGroup(desc = "Permissions for managing roles.")
    public static class ROLES {

        @PermissionsDocField(desc = "Grants permission to query user-role assignments (for users defined in the local shiro.ini only).")
        public static final String QUERY = "accounts:roles:query";

        @PermissionsDocField(desc = "Grants permission to create new role.")
        public static final String CREATE = "accounts:roles:create";

        @PermissionsDocField(desc = "Grants permission to edit a role.")
        public static final String EDIT = "accounts:roles:edit";

        @PermissionsDocField(desc = "Grants permission to assign a role to user.")
        public static final String ASSIGN_TO_USER = "accounts:roles:assign";
    }

    @PermissionsDocGroup(desc = "Permissions for accessing the RDF namespace service.")
    public static class NAMESPACES {

        @PermissionsDocField(desc = "Grants permission to delete entries in the RDF namespace service.")
        public static final String DELETE = "namespaces:delete";

        @PermissionsDocField(desc = "Grants permission to create entries in the RDF namespace service.")
        public static final String CREATE = "namespaces:create";

        @PermissionsDocField(desc = "Grants permission to change entries in the RDF namespace service.")
        public static final String CHANGE = "namespaces:change";
    }

    @PermissionsDocGroup(desc = "Permissions for the SPARQL endpoint /sparql and GraphStore /rdf-graph-store interface.")
    public static class SPARQL {
        public static final String PREFIX = "sparql:";
        @PermissionsDocField(desc = "Grants permission to execute SPARQL Select queries on the given {repositoryID}.", pattern = "sparql:{repositoryID}:query:select", example = "/org/researchspace/security/aclhelp/sparql_select.html")
        public static final String QUERY_SELECT_POSTFIX = "query:select";
        @PermissionsDocField(desc = "Grants permission to execute SPARQL Ask queries on the given {repositoryID}.", pattern = "sparql:{repositoryID}:query:ask", example = "/org/researchspace/security/aclhelp/sparql_ask.html")
        public static final String QUERY_ASK_POSTFIX = "query:ask";
        @PermissionsDocField(desc = "Grants permission to execute SPARQL Describe queries on the given {repositoryID}.", pattern = "sparql:{repositoryID}:query:describe", example = "/org/researchspace/security/aclhelp/sparql_describe.html")
        public static final String QUERY_DESCRIBE_POSTFIX = "query:describe";
        @PermissionsDocField(desc = "Grants permission to execute SPARQL Construct queries on the given {repositoryID}.", pattern = "sparql:{repositoryID}:query:construct", example = "/org/researchspace/security/aclhelp/sparql_construct.html")
        public static final String QUERY_CONSTRUCT_POSTFIX = "query:construct";
        @PermissionsDocField(desc = "Grants permission to perform any SPARQL Update operation on the given {repositoryID}.", pattern = "sparql:{repositoryID}:update", example = "/org/researchspace/security/aclhelp/sparql_update.html")
        public static final String UPDATE_POSTFIX = "update";

        private static final String QUERY_SELECT_DEFAULT = PREFIX + QUERY_SELECT_POSTFIX;
        private static final String QUERY_ASK_DEFAULT = PREFIX + QUERY_ASK_POSTFIX;
        private static final String QUERY_DESCRIBE_DEFAULT = PREFIX + QUERY_DESCRIBE_POSTFIX;
        private static final String QUERY_CONSTRUCT_DEFAULT = PREFIX + QUERY_CONSTRUCT_POSTFIX;
        private static final String UPDATE_DEFAULT = PREFIX + UPDATE_POSTFIX;

        public static final String sparqlOperationPermission(String repositoryId, SparqlOperation operationType) {
            StringBuilder builder = new StringBuilder(PREFIX);
            builder.append(repositoryId);
            builder.append(":");
            switch (operationType) {
            case CONSTRUCT:
                builder.append(QUERY_CONSTRUCT_POSTFIX);
                break;
            case SELECT:
                builder.append(QUERY_SELECT_POSTFIX);
                break;
            case ASK:
                builder.append(QUERY_ASK_POSTFIX);
                break;
            case DESCRIBE:
                builder.append(QUERY_DESCRIBE_POSTFIX);
                break;
            case UPDATE:
                builder.append(UPDATE_POSTFIX);
                break;
            default:
                throw new IllegalArgumentException("Unknown operation type " + operationType.toString());
            }
            return builder.toString();
        }

        public static final String sparqlOperationDefaultPermission(SparqlOperation operationType) {
            switch (operationType) {
            case CONSTRUCT:
                return QUERY_CONSTRUCT_DEFAULT;
            case SELECT:
                return QUERY_SELECT_DEFAULT;
            case ASK:
                return QUERY_ASK_DEFAULT;
            case DESCRIBE:
                return QUERY_DESCRIBE_DEFAULT;
            case UPDATE:
                return UPDATE_DEFAULT;
            default:
                throw new IllegalArgumentException("Unknown operation type " + operationType.toString());
            }
        }

        @PermissionsDocField(desc = "Grants permission to get, create, modify or delete any named graph by performing a HEAD operation on /rdf-graph-store?graph={URI}.")
        public static final String GRAPH_STORE_HEAD = "sparql:graphstore:head";
        @PermissionsDocField(desc = "Grants permission to get any named graph by performing a GET operation on /rdf-graph-store?graph={URI}.")
        public static final String GRAPH_STORE_GET = "sparql:graphstore:get";
        @PermissionsDocField(desc = "Grants permission to create any named graph by performing a PUT operation on /rdf-graph-store?graph={URI}.")
        public static final String GRAPH_STORE_CREATE = "sparql:graphstore:create";
        @PermissionsDocField(desc = "Grants permission to modify any named graph by performing a POST operation on /rdf-graph-store?graph={URI}.")
        public static final String GRAPH_STORE_UPDATE = "sparql:graphstore:update";
        @PermissionsDocField(desc = "Grants permission to delete any named graph by performing a DELETE operation on /rdf-graph-store?graph={URI}.")
        public static final String GRAPH_STORE_DELETE = "sparql:graphstore:delete";
    }

    @PermissionsDocGroup(desc = "Permissions for managing and accessing LDP containers.")
    public static class CONTAINER {
        /**
         * Helper to build LDP Container/Resource permission strings:
         *
         * api:ldp:container|type:<container_iri|type>:create|update|delete:any|owner
         *
         * @param resource  IRI of the LDPResource or LDPContainer resource in case of
         *                  identity based permission or type IRI in case of type based
         *                  permission
         * @param base      {@link CONTAINER#IDENTITY_BASED} or
         *                  {@link CONTAINER#TYPE_BASED}}
         * @param action    {@link CONTAINER#CREATE} or {@link CONTAINER#UPDATE} or
         *                  {@link CONTAINER#DELETE} or {@link CONTAINER#EXPORT} or
         *                  {@link CONTAINER#IMPORT}
         * @param ownership {@link CONTAINER#ANY} or {@link CONTAINER#OWNER}
         * @return LDP Container/Resource action permission string
         */
        public static final String resourcePermission(IRI resource, String base, String action, String ownership) {
            return "api:ldp:" + base + ":<" + resource.stringValue() + ">:" + action + ":" + ownership;
        }

        public static final String IDENTITY_BASED = "container";
        public static final String TYPE_BASED = "type";
        public static final String READ = "read";
        @PermissionsDocField(desc = "Grants permission to create items to the specified container.", pattern = "api:ldp:container:{<container_iri>|<item_rdf_type_iri>}:create", example = "/org/researchspace/security/aclhelp/api_container_create.html")
        public static final String CREATE = "create";
        @PermissionsDocField(desc = "Grants permission to update items to the specified container.", pattern = "api:ldp:container:{<container_iri>|<item_rdf_type_iri>}:(update:any)|(update:owner)", example = "/org/researchspace/security/aclhelp/api_container_update.html")
        public static final String UPDATE = "update";
        @PermissionsDocField(desc = "Grants permission to delete items to the specified container.", pattern = "api:ldp:container:{<container_iri>|<item_rdf_type_iri>}:(delete:any)|(delete:owner)", example = "/org/researchspace/security/aclhelp/api_container_delete.html")
        public static final String DELETE = "delete";
        public static final String EXPORT = "export";
        public static final String IMPORT = "import";
        public static final String ANY = "any";
        public static final String OWNER = "owner";
    }

    @PermissionsDocGroup(desc = "Permissions for forms in LDP persistence mode.")
    public static class FORMS_LDP {
        @PermissionsDocField(desc = "Grants permission to create LDP container, which are created when using the authoring forms in LDP persistence mode.")
        public static final String CREATE = "forms:ldp:create";
        @PermissionsDocField(desc = "Grants permission to update LDP container, which are created when using the authoring forms in LDP persistence mode.")
        public static final String UPDATE = "forms:ldp:update";
        @PermissionsDocField(desc = "Grants permission to delete LDP container.")
        public static final String DELETE = "forms:ldp:delete";
    }

    @PermissionsDocGroup(desc = "Permissions for forms in SPARQL persistence mode.")
    public static class FORMS_SPARQL {
        @PermissionsDocField(desc = "Grants permission to run SPARQL Insert operations, which are executed when using the authoring forms in SPARQL persistence mode.")
        public static final String CREATE = "forms:sparql:insert";
        @PermissionsDocField(desc = "Grants permission to run SPARQL Delete operations, which are executed when using the authoring forms in SPARQL persistence mode.")
        public static final String UPDATE = "forms:sparql:delete";
    }

    @PermissionsDocGroup(desc = "Permissions for managing caches.")
    public static class CACHES {
        @PermissionsDocField(desc = "Grants permission to invalidate all caches.")
        public static final String INVALIDATE_ALL = "caches:*:invalidate";
    }

    public static class SERVICES {
        public static final String URL_MINIFY = "services:url-minify";
    }

    @PermissionsDocGroup(desc = "Permissions for managing and executing Query as a Service (QaaS) objects.")
    public static class QAAS {
        @PermissionsDocField(desc = "Grants permission to create QaaS objects.")
        public static final String CREATE = "qaas:create";
        @PermissionsDocField(desc = "Grants permission to update QaaS objects.")
        public static final String UPDATE = "qaas:update";
        @PermissionsDocField(desc = "Grants permission to delete QaaS objects.")
        public static final String DELETE = "qaas:delete";
        @PermissionsDocField(desc = "Grants permission to read QaaS meta-information/configs.")
        public static final String INFO = "qaas:info";
        @PermissionsDocField(desc = "Grants permission to execute a particulular \"Query as a Service\".", pattern = "qaas:execute:{service-permission-string}", example = "/org/researchspace/security/aclhelp/qaas_execute.html")
        public static final String PREFIX_EXECUTE = "qaas:execute:";
        public static final String EXECUTE_ALL = "qaas:execute:*";
    }

    @PermissionsDocGroup(desc = "Permissions for managing repository configurations.")
    public static class REPOSITORY_CONFIG {
        @PermissionsDocField(desc = "Grants permission to update repository configurations. These permissions should only be granted to root administrators, if repository configurations need to be changed through the UI.", pattern = "repository-config:update:{repository-id}", example = "/org/researchspace/security/aclhelp/repository_config_update.html")
        public static final String PREFIX_UPDATE = "repository-config:update:";
        @PermissionsDocField(desc = "Grants permission to delete repository configurations. These permissions should only be granted to root administrators, if repository configurations need to be deleted through the UI.", pattern = "repository-config:delete:{repository-id}", example = "/org/researchspace/security/aclhelp/repository_config_delete.html")
        public static final String PREFIX_DELETE = "repository-config:delete:";
        @PermissionsDocField(desc = "Grants permission to view repository configurations. These permissions should only be granted to root administrators, if repositories need to be changed through the UI.", pattern = "repository-config:view:{repository-id}", example = "/org/researchspace/security/aclhelp/repository_config_view.html")
        public static final String PREFIX_VIEW = "repository-config:view:";
        @PermissionsDocField(desc = "Grants permission to create repository configurations. These permissions should only be granted to root administrators, if repositories need to be changed through the UI.", pattern = "repository-config:create:{repository-id}", example = "/org/researchspace/security/aclhelp/repository_config_create.html")
        public static final String CREATE = "repository-config:create";
    }

    public static class EPHEDRA_SERVICE_CONFIG {
        public static final String PREFIX_UPDATE = "ephedra-service-config:update:";
        public static final String PREFIX_DELETE = "ephedra-service-config:delete:";
        public static final String PREFIX_VIEW = "ephedra-service-config:view:";
        public static final String CREATE = "ephedra-service-config:create";
    }

    @PermissionsDocGroup(desc = "Permissions for managing the base system.")
    public static class SYSTEM {
        @PermissionsDocField(desc = "Grants permission to restart the system, e.g. after installing an app.")
        public static final String RESTART = "system:restart";
    }

    @PermissionsDocGroup(desc = "Permissions for managing apps.")
    public static class APP {
        public static final String PREFIX_CONFIG_VIEW = "app:view-config:";
        @PermissionsDocField(desc = "Grants permission to upload app ZIP artefacts."
                + "This is a global permission, i.e. there is no distinction between different apps.")
        public static final String UPLOAD = "app:upload";
    }

    @PermissionsDocGroup(desc = "Permissions for managing storages.")
    public static class STORAGE {

        @PermissionsDocField(desc = "Permissions for viewing the storage configurations for the specified {storageId}.", pattern = "storage:view-config:{storageId}", example = "/org/researchspace/security/aclhelp/storage_view_config.html")
        public static final String PREFIX_VIEW_CONFIG = "storage:view-config:";

        @PermissionsDocField(desc = "Permissions to export and download the specified {storageId} as a zip archive.", pattern = "storage:zip-export:{storageId}", example = "/org/researchspace/security/aclhelp/storage_zip_export.html")
        public static final String PREFIX_ZIP_EXPORT = "storage:zip-export:";

        @PermissionsDocField(desc = "Permissions for uploading files to the specified {storageId}", pattern = "storage:upload:{storageId}", example = "/org/researchspace/security/aclhelp/storage_upload.html")
        public static final String PREFIX_WRITE = "storage:upload:";
    }

    @PermissionsDocGroup(desc = "Permissions for managing file related operations (e.g. file upload in forms).")
    public static class FILE {
        @PermissionsDocField(desc = "Permissions for retrieving files.", pattern = "file:read:{storageId}", example = "/org/researchspace/security/aclhelp/file_read.html")
        public static final String PREFIX_READ = "file:read:";
        @PermissionsDocField(desc = "Permissions for writing files.", pattern = "file:write:{storageId}", example = "/org/researchspace/security/aclhelp/file_write.html")
        public static final String PREFIX_WRITE = "file:write:";
    }

    @PermissionsDocGroup(desc = "Permissions for managing logs.")
    public static class LOGS {
        @PermissionsDocField(desc = "Permissions for displaying log files.", pattern = "logs:read:*", example = "/org/researchspace/security/aclhelp/logs_read.html")
        public static final String PREFIX_READ = "logs:read:";

        @PermissionsDocField(desc = "Permissions for configuring the logging system (e.g. the logging profile).", pattern = "logs:configure:*", example = "/org/researchspace/security/aclhelp/logs_configure.html")
        public static final String PREFIX_CONFIGURE = "logs:configure:";
    }

    @PermissionsDocGroup(desc = "Permissions for managing ontologies.")
    public static class ONTOLOGIES {
        @PermissionsDocField(desc = "Permissions for authoring ontologies.", pattern = "ontologies:*:*")
        public static final String PREFIX_AUTHORING = "ontologies:";

    }

    @PermissionsDocGroup(desc = "Permissions for managing data quality jobs.")
    public static class JOBS {
        @PermissionsDocField(desc = "Grants permission to run the data-quality job.")
        public static final String DATA_QUALITY_CREATE = "job:create:data-quality";

        @PermissionsDocField(desc = "Grants permission to retrieve the job status.")
        public static final String DATA_QUALITY_INFO = "job:info:data-quality";
    }

    @PermissionsDocGroup(desc = "Permissions for accessing proxy services.")
    public static class PROXY {

        @PermissionsDocField(desc = "Permission for accessing the specified service, which is proxied through the platforms proxy service /proxy/{proxy-id}.", pattern = "proxy:{proxy-id}", example = "/org/researchspace/security/aclhelp/proxy.html")
        public static final String PREFIX = "proxy:";
    }

}
