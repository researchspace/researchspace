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

package org.researchspace.rest.endpoint;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.naming.NamingException;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.SimpleAccount;
import org.apache.shiro.authc.credential.PasswordService;
import org.apache.shiro.authz.Permission;
import org.apache.shiro.authz.SimpleRole;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.json.JsonUtil;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.rest.feature.CacheControl.MaxAgeCache;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.LDAPRealm;
import org.researchspace.security.PermissionUtil;
import org.researchspace.security.Permissions.ACCOUNTS;
import org.researchspace.security.Permissions.PERMISSIONS;
import org.researchspace.security.Permissions.ROLES;
import org.researchspace.security.sso.SSOEnvironment.SSOVariant;
import org.researchspace.security.PermissionsDocGroup;
import org.researchspace.security.PermissionsParameterInfo;
import org.researchspace.security.PlatformSecurityManager;
import org.researchspace.security.SecurityService;
import org.researchspace.security.ShiroTextRealm;

import com.fasterxml.jackson.core.JsonParser;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ClassInfo;
import io.github.classgraph.ScanResult;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Path("security")
@Singleton
public class SecurityEndpoint {

    private static final Logger logger = LogManager.getLogger(SecurityEndpoint.class);

    @Inject
    private PasswordService passwordService;

    @Inject
    private NamespaceRegistry ns;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private SecurityService securityService;

    /**
     * POJO to represent the current user for serialization to JSON //TODO return
     * some more sophisticated user object
     */
    @SuppressWarnings("unused")
    private class CurrentUser {
        public String principal = SecurityService.getUserName();
        public String userURI = ns.getUserIRI().stringValue();
        public boolean isAuthenticated = SecurityUtils.getSubject().isAuthenticated();
        public boolean isAnonymous = SecurityUtils.getSubject().getPrincipal().toString()
                .equals(PlatformSecurityManager.ANONYMOUS_PRINCIPAL);

    }

    @SuppressWarnings("unused")
    private class SessionInfo {
        public long lastAccessTimestamp = SecurityUtils.getSubject().getSession().getLastAccessTime().getTime();
        public long timout = SecurityUtils.getSubject().getSession().getTimeout();
        public long idleTime = ((new Date()).getTime() - lastAccessTimestamp) / 1000;
    }

    @SuppressWarnings("unused")
    private static class Account {
        // empty constructor is need for jackson
        public Account() {
        }

        public String getPrincipal() {
            return principal;
        }

        public void setPrincipal(String principal) {
            this.principal = principal;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getRoles() {
            return roles;
        }

        public void setRoles(String roles) {
            this.roles = roles;
        }

        public List<String> getPermissions() {
            return permissions;
        }

        public void setPermissions(List<String> permissions) {
            this.permissions = permissions;
        }

        private String principal;
        private String password;
        private String roles;
        private List<String> permissions;

    }

    private static class RoleDefinition {
        // empty constructor is need for jackson
        public RoleDefinition() {
        }

        @SuppressWarnings("unused")
        public String getRoleName() {
            return roleName;
        }

        public void setRoleName(String roleName) {
            this.roleName = roleName;
        }

        public List<String> getPermissions() {
            return permissions;
        }

        public String roleName;
        public List<String> permissions;
    }

    @GET()
    @NoCache
    @Path("user")
    @Produces(MediaType.APPLICATION_JSON)
    public CurrentUser getUser() {
        return new CurrentUser();
    }

    @POST()
    @Path("createAccount")
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    @RequiresPermissions(ACCOUNTS.CREATE)
    public void createAccount(Account account) {
        try {
            logger.debug("Adding new user account with principal :" + account.getPrincipal());
            String[] roles = StringUtils.isBlank(account.getRoles()) ? new String[] {} : account.getRoles().split(",");
            if (StringUtils.isBlank(account.getPrincipal()))
                throw new IllegalArgumentException("Principal can not be null or empty.");
            if (StringUtils.isBlank(account.getRoles()))
                throw new IllegalArgumentException("Roles can not be null or empty.");
            if (StringUtils.isBlank(account.getPassword()))
                throw new IllegalArgumentException("Password can not be null or empty.");

            if (getShiroTextRealm().accountExists(account.getPrincipal()))
                throw new IllegalArgumentException(
                        "Principal with name " + account.getPrincipal() + " does already exists.");

            getShiroTextRealm().addAccount(account.getPrincipal(),
                    passwordService.encryptPassword(account.getPassword()), roles);
        } catch (IllegalArgumentException e) {
            throw new CustomIllegalArgumentException(e.getMessage());
        }
    }

    @PUT()
    @NoCache
    @Path("isPermissionValid")
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public boolean isPermissionValid(String permission) {
        if (PermissionUtil.isPermissionValid(permission)) {
            return true;
        } else {
            return false;
        }
    }

    @GET()
    @NoCache
    @Path("getAllRoleDefinitions")
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresPermissions({ ROLES.QUERY, PERMISSIONS.QUERY })
    public List<RoleDefinition> getAllAvailableRoles() {
        List<RoleDefinition> roleDefinitions = Lists.newArrayList();
        for (SimpleRole role : getShiroTextRealm().getRoles().values()) {
            RoleDefinition roleDefinition = new RoleDefinition();
            roleDefinition.permissions = new ArrayList<String>();
            roleDefinition.setRoleName(role.getName());
            for (Permission individualPermission : role.getPermissions()) {
                roleDefinition.permissions.add(individualPermission.toString());
            }
            roleDefinitions.add(roleDefinition);
        }
        return roleDefinitions;
    }

    @PUT()
    @Path("updateRoleDefinitions")
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    @RequiresPermissions(ROLES.EDIT)
    public Response updateRoleDefinitions(RoleDefinition[] roles) throws Exception {
        Map<String, List<String>> map = Maps.newHashMap();
        boolean isPermissionValid = true;
        try {
            for (RoleDefinition role : roles) {
                String roleName = role.roleName;
                List<String> permissions = new ArrayList<String>();
                for (String permission : role.getPermissions()) {
                    isPermissionValid = PermissionUtil.isPermissionValid(permission);
                    if (isPermissionValid) {
                        permissions.add(PermissionUtil.normalizePermission(permission));
                    } else {
                        throw new Exception("Something went wrong while saving \"" + permission.toUpperCase()
                                + "\". Please update it.");
                    }
                }
                map.put(roleName, permissions);
                // throw new Exception("Please enter a valid permission.");
            }
            getShiroTextRealm().updateRoles(map);
        } catch (Exception e) {
            logger.error("The user entred permission is invalid.");
            return Response.status(Response.Status.FORBIDDEN).entity(e.getMessage()).build();
        }
        return Response.ok().build();
    }

    @DELETE()
    @Path("deleteAccount/{userPrincipal}")
    @RequiresAuthentication
    @RequiresPermissions(ACCOUNTS.DELETE)
    public void deleteAccount(@PathParam("userPrincipal") String userPrincipal) {
        try {
            if (StringUtils.isBlank(userPrincipal))
                throw new IllegalArgumentException("User principal can not be null.");

            getShiroTextRealm().deleteAccount(userPrincipal);
        } catch (IllegalArgumentException e) {
            throw new CustomIllegalArgumentException(e.getMessage());
        }
    }

    @PUT()
    @Path("updateAccount")
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    @RequiresPermissions(ACCOUNTS.CREATE)
    public void updateAccount(Account account) {
        try {
            logger.debug("Updating user account with principal :" + account.getPrincipal());
            if (StringUtils.isBlank(account.getPrincipal()))
                throw new IllegalArgumentException("Principal can not be null or empty.");
            if (StringUtils.isBlank(account.getRoles()))
                throw new IllegalArgumentException("Roles can not be null or empty.");
            String[] roles = account.getRoles().split(",");

            String password = account.getPassword() != null ? passwordService.encryptPassword(account.getPassword())
                    : null;
            getShiroTextRealm().updateAccount(account.getPrincipal(), password, roles);
        } catch (IllegalArgumentException e) {
            throw new CustomIllegalArgumentException(e.getMessage());
        }
    }

    @GET()
    @MaxAgeCache(time = 1, unit = TimeUnit.DAYS)
    @Path("getAllPermissionsDoc")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public Map<String, ArrayList<PermissionsParameterInfo>> getAllPermissionsDoc() {
        PermissionsParameterInfo permissionParameters = new PermissionsParameterInfo();
        ArrayList<PermissionsParameterInfo> permissions = Lists.newArrayList();
        HashMap<String, ArrayList<PermissionsParameterInfo>> map = Maps.newHashMap();
        String pkg = "org.researchspace.security";
        String routeAnnotation = pkg + ".PermissionsDocGroup";
        try (ScanResult scanResult = new ClassGraph().enableClassInfo().enableAnnotationInfo()
                .enableStaticFinalFieldConstantInitializerValues().whitelistPackages(pkg).scan()) {
            for (ClassInfo routeClassInfo : scanResult.getClassesWithAnnotation(routeAnnotation)) {
                Class<?> permissionGroup = routeClassInfo.loadClass();
                String desc = permissionGroup.getAnnotation(PermissionsDocGroup.class).desc();
                permissions = new ArrayList<PermissionsParameterInfo>();
                permissionParameters.setAllAnnotationParameters(permissionGroup, permissions);
                map.put(desc, permissions);
            }
        }
        return map;
    }

    @GET()
    @NoCache
    @Path("getAllAccounts")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    @RequiresPermissions(ACCOUNTS.QUERY)
    public List<Account> getAllAcounts() {
        ArrayList<Account> accounts = Lists.newArrayList();
        ShiroTextRealm r = getShiroTextRealm();

        for (Entry<String, SimpleAccount> user : r.getUsers().entrySet()) {
            Account account = new Account();

            account.setPrincipal(user.getKey());
            if (SecurityUtils.getSubject().isPermitted(ROLES.QUERY)) {
                Collection<String> roles = user.getValue().getRoles();
                account.setRoles(StringUtils.join(roles, ","));
            }

            List<String> permissions = new ArrayList<String>();
            if (SecurityUtils.getSubject().isPermitted(PERMISSIONS.QUERY)) {
                for (Permission permissionValue : user.getValue().getObjectPermissions()) {
                    permissions.add(permissionValue.toString());
                }
            }
            permissions.sort(String::compareToIgnoreCase);
            account.setPermissions(permissions);
            accounts.add(account);
        }

        return accounts;
    }

    @POST
    @NoCache
    @Path("permissions")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public Response hasPermissions(final JsonParser jp) throws IOException {
        final JsonUtil.JsonFieldProducer processor = (jGenerator, input) -> {
            try {
                jGenerator.writeBooleanField(input, SecurityUtils.getSubject().isPermitted(input));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        };
        final StreamingOutput stream = JsonUtil.processJsonMap(jp, processor);
        return Response.ok(stream).build();
    }

    @GET()
    @NoCache
    @Path("getSessionInfo")
    @Produces(MediaType.APPLICATION_JSON)
    public SessionInfo getSession() {
        return new SessionInfo();
    }

    @POST()
    @Path("touchSession")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public void touchSession() {
        SecurityUtils.getSubject().getSession().touch();
    }

    @GET()
    @NoCache
    @Path("getLdapUsersMetadata")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    @RequiresPermissions(ACCOUNTS.LDAP_SYNC)
    public boolean getLdapUsersMetadata() throws NamingException, Exception {
        PlatformSecurityManager securityManager = (PlatformSecurityManager) SecurityUtils.getSecurityManager();
        LDAPRealm realm = securityManager.getLDAPRealm();
        String turtle = securityService.renderUsersMetadataToTurtle(realm);
        securityService.saveUsersMetadataTurtleInContainer(turtle,
                new MpRepositoryProvider(this.repositoryManager, RepositoryManager.ASSET_REPOSITORY_ID));
        return true;
    }

    @GET
    @NoCache
    @Path("getSaml2SpMetadata")
    public Response getSaml2SpMetadata() {
        final var securityManager = (PlatformSecurityManager) SecurityUtils.getSecurityManager();

        // try to get SSO realm
        return Optional.ofNullable(securityManager.getSsoRealm())
            // only if SAML2 is enabled
            .filter(realm -> realm.getSsoEnvironment().ssoVariant.equals(SSOVariant.saml2))
            // get SMAL2 Sp Metadata from the SSO shiro environment
            .flatMap(realm -> realm.getSsoEnvironment().getSamlSpMetadata())
            .map(spMetadata ->
                 Response.status(Status.OK)
                 // send Sp metadata as file for download
                 .header("content-disposition", "attachment; filename = researchspace-saml2-sp-metadata.xml")
                 .entity(spMetadata)
                 .type(MediaType.APPLICATION_XML)
                 .build()
                 )
            .orElseGet(() ->
                       Response
                       .status(Status.BAD_REQUEST)
                       .entity("Can't generate SAML2 Sp metadata, SSO with SAML is not enabled.")
                       .build()
                );
    }

    private ShiroTextRealm getShiroTextRealm() {
        return ((PlatformSecurityManager) SecurityUtils.getSecurityManager()).getShiroTextRealm();
    }

    /**
     * HTTP 500 (Internal Server Error) {@link WebApplicationException} with custom
     * error message
     */
    public class CustomIllegalArgumentException extends WebApplicationException {
        private static final long serialVersionUID = 5775630458408531231L;

        /**
         * @param message the String that is the entity of the 500 response.
         */
        public CustomIllegalArgumentException(String message) {
            super(Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).type("text/plain").build());
        }
    }
}
