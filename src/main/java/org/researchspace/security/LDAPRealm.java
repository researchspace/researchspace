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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import javax.naming.ldap.LdapContext;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.Permission;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.authz.SimpleRole;
import org.apache.shiro.realm.activedirectory.ActiveDirectoryRealm;
import org.apache.shiro.realm.ldap.DefaultLdapRealm;
import org.apache.shiro.realm.ldap.LdapContextFactory;
import org.apache.shiro.realm.ldap.LdapUtils;
import org.apache.shiro.subject.PrincipalCollection;
import org.researchspace.secrets.SecretResolver;

import com.google.common.collect.Sets;

/**
 * Extends the {@link DefaultLdapRealm} to enable custom mappings from full
 * qualified LDAP groups to roles. Permissions will be read from the
 * {@link ShiroTextRealm}.
 * 
 * <p>
 * The following configuration values are subject to secret resolution (see
 * {@link SecretResolver} for details):
 * <ul>
 * <li>username for system user</li>
 * <li>password for system user</li>
 * </ul>
 * </p>
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class LDAPRealm extends DefaultLdapRealm implements UserMetadataProvider {

    private static final Logger logger = LogManager.getLogger(LDAPRealm.class);

    /**
     * Possible values for {@link #groupObjectClass}
     **/
    private static final String POSIX_GROUP = "posixGroup";
    private static final String GROUP_OF_NAMES = "groupOfNames";

    private static final SearchControls SUBTREE_SCOPE = new SearchControls();

    static {
        SUBTREE_SCOPE.setSearchScope(SearchControls.SUBTREE_SCOPE);
    }

    public LDAPRealm() {
        super();
        setPermissionResolver(new WildcardPermissionResolver());
    }

    /**
     * The DN string which identifies the root node for user searches For example
     * "dc=example,dc=com"
     */
    private String searchBase;

    /**
     * The DN string which identifies the root node for group searches.
     */
    private String groupSearchBase;

    /**
     * ObjectClass which identifies user object in the directory.
     */
    private String userObjectClass = "person";

    /**
     * Attribute to identify the unique id for a user object
     */
    private String userIdentifierAttribute = "uid";

    /**
     * Attribute that connects a LDAP group object to a member i.e. userDN Common
     * configuration is "member". In OpenLDAP with POSIX, this is typically
     * memberUid and requires to set also the {@link #groupObjectClass} to
     * "posixGroup".
     */
    private String groupMemberAttribute = "member";

    /**
     * Attribute to identify the unique id for a group object
     */
    private String groupIdentifierAttribute = "ou";

    /**
     * ObjectClass which identifies the type of groups in the directory. Possible
     * values are typically "groupOfNames" and "posixGroup". "groupOfNames" is
     * mainly used in Active Directory and OpenLDAP, whereas "posixGroup" is used
     * with OpenLDAP + POSIX groups. The main difference is that POSIX group
     * schemata uses as member Attribute "memberUid" and point only to the plain uid
     * of the user instead of its fully qualified domain name. For more information,
     * read http://www.olearycomputers.com/ll/security/ldap/openldap_groups.html
     */
    private String groupObjectClass = GROUP_OF_NAMES;

    /**
     * Mapping from fully qualified active directory group names (e.g.
     * ou=mathematicians,dc=example,dc=com) to role names.
     *
     * Alternatively a shortcut version is to use the unique value as identified by
     * the groupIdentifierAttribute (e.g. mathematicans)
     */
    private Map<String, String> groupRolesMap;

    public void setGroupRolesMap(Map<String, String> groupRolesMap) {
        this.groupRolesMap = groupRolesMap;
    }

    public String getSearchBase() {
        return searchBase;
    }

    public void setSearchBase(String searchBase) {
        this.searchBase = searchBase;
    }

    public String getGroupSearchBase() {
        return groupSearchBase == null ? this.getSearchBase() : groupSearchBase;
    }

    public void setGroupSearchBase(String groupSearchBase) {
        this.groupSearchBase = groupSearchBase;
    }

    public String getGroupMemberAttribute() {
        return groupMemberAttribute;
    }

    public void setGroupMemberAttribute(String groupMemberAttribute) {
        this.groupMemberAttribute = groupMemberAttribute;
    }

    public String getGroupIdentifierAttribute() {
        return groupIdentifierAttribute;
    }

    public void setGroupIdentifierAttribute(String groupIdentifierAttribute) {
        this.groupIdentifierAttribute = groupIdentifierAttribute;
    }

    public String getGroupObjectClass() {
        return groupObjectClass;
    }

    public void setGroupObjectClass(String groupObjectClass) {
        this.groupObjectClass = groupObjectClass;
    }

    public String getUserObjectClass() {
        return userObjectClass;
    }

    public void setUserObjectClass(String userObjectClass) {
        this.userObjectClass = userObjectClass;
    }

    public String getUserIdentifierAttribute() {
        return userIdentifierAttribute;
    }

    public void setUserIdentifierAttribute(String userIdAttribute) {
        this.userIdentifierAttribute = userIdAttribute;
    }

    @Override
    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
        AuthorizationInfo cachedAuthorization = getAuthorizationCache().get(getAuthorizationCacheKey(principals));
        if (cachedAuthorization != null)
            return cachedAuthorization;

        AuthorizationInfo authorizationInfo = super.doGetAuthorizationInfo(principals);
        getAuthorizationCache().put(getAuthorizationCacheKey(principals), authorizationInfo);
        return authorizationInfo;
    }

    /**
     * Enable authorization cache by default
     * 
     * @see org.apache.shiro.realm.AuthorizingRealm#isAuthorizationCachingEnabled()
     */
    @Override
    public boolean isAuthorizationCachingEnabled() {
        return true;
    }

    /**
     * @see org.apache.shiro.realm.ldap.JndiLdapRealm#queryForAuthorizationInfo(org.apache.shiro.subject.PrincipalCollection,
     *      org.apache.shiro.realm.ldap.LdapContextFactory)
     */
    @Override
    protected AuthorizationInfo queryForAuthorizationInfo(PrincipalCollection principals,
            LdapContextFactory ldapContextFactory) throws NamingException {
        String username = (String) getAvailablePrincipal(principals);

        // Perform context search
        LdapContext ldapContext = ldapContextFactory.getSystemLdapContext();

        Set<String> roleNames;

        try {
            roleNames = getRoleNamesForUser(username, ldapContext);
        } finally {
            LdapUtils.closeContext(ldapContext);
        }

        if (roleNames.isEmpty()) {
            logger.debug("User {} could not be authorized: user's groups could not be mapped to any platform role.");
        } else {
            logger.debug("User {} successfully authorized. Roles: {}", username, roleNames);
        }

        SimpleAuthorizationInfo authorizationInfo = new SimpleAuthorizationInfo(roleNames);
        ShiroTextRealm shiroTextRealm = ((PlatformSecurityManager) SecurityUtils.getSecurityManager())
                .getShiroTextRealm();
        Map<String, SimpleRole> roles = shiroTextRealm.getRoles();
        Set<Permission> permissions = Sets.newHashSet();
        for (String roleString : authorizationInfo.getRoles()) {
            if (roles.containsKey(roleString)) {
                permissions.addAll(roles.get(roleString).getPermissions());
            }
        }

        authorizationInfo.setObjectPermissions(permissions);
        return authorizationInfo;
    }

    /**
     * Returns the
     * 
     * @param ldapContext
     * @param userDnOrUserUid either the user uui or the full dn depending on the
     *                        schema being used. Use
     *                        {@link #getUserDnOrUserUid(String, String)}
     * @return
     * @throws NamingException
     */
    private NamingEnumeration<SearchResult> getGroupsForUsers(LdapContext ldapContext, String userDnOrUserUid)
            throws NamingException {
        String[] returnAttributes = { groupIdentifierAttribute };
        SearchControls cons = new SearchControls();
        cons.setSearchScope(SearchControls.SUBTREE_SCOPE);
        cons.setReturningAttributes(returnAttributes);
        String searchFilter = "({0}={1})";
        Object[] searchArguments = new Object[] { groupMemberAttribute, userDnOrUserUid };

        // use this only for logger
        // SHIRO-115 - prevent potential code injection:
        String searchFilterString = String.format("(%1$s=%2$s)", searchArguments);
        logger.trace("Searching for groups DN of user [{}], with filter: {}", userDnOrUserUid, searchFilterString);

        NamingEnumeration<SearchResult> searchResults = ldapContext.search(this.getGroupSearchBase(), searchFilter,
                searchArguments, cons);
        if (!searchResults.hasMoreElements()) {
            logger.debug("LDAP query did not return any groups for user [{}]", userDnOrUserUid);
        }
        return searchResults;
    }

    /**
     * Returns the user uid or the full dn for group-user membership lookup,
     * depending on whether posixGroups or groupOfNames schema is used.
     * http://www.olearycomputers.com/ll/security/ldap/openldap_groups.html
     * 
     * @param uid
     * @param userDn
     * @return
     */
    private String getUserDnOrUserUid(String uid, String userDn) {
        return this.groupObjectClass.equals(POSIX_GROUP) ? uid : userDn;
    }

    /**
     * With minor modifications taken from {@link ActiveDirectoryRealm} . Will
     * return empty set if user dn does not exist. This is particularly important
     * when being used in combination with
     * {@link org.researchspace.security.AnonymousUserFilter}.
     * 
     * @param username
     * @param ldapContext
     * @return
     * @throws NamingException
     */
    private Set<String> getRoleNamesForUser(String username, LdapContext ldapContext) throws NamingException {
        Set<String> roleNames = new LinkedHashSet<String>();

        // even though we may only need the username in case of POSIX groups (see
        // below),
        // we still leave this check to confirm that it is a valid user in the system
        Optional<String> userDn = retrieveUserDn(username);
        if (!userDn.isPresent()) {
            /*
             * Code should not throw new
             * javax.naming.AuthenticationException("User DN not found."); because shiro
             * doesn't expect exceptions while iterating over realms when checking user
             * permissions. Instead return empty set of role names.
             */
            return roleNames;
        }

        // use user uid or full user dn for the look-up, depending on the schema being
        // used.
        String userDnOrUserUid = getUserDnOrUserUid(username, userDn.get());

        NamingEnumeration<SearchResult> searchResults = getGroupsForUsers(ldapContext, userDnOrUserUid);

        while (searchResults.hasMoreElements()) {
            SearchResult sr = searchResults.next();

            logger.trace("Retrieving group names for user [{}]", sr.getName());

            Attributes attrs = sr.getAttributes();

            if (attrs != null) {
                NamingEnumeration<? extends Attribute> ae = attrs.getAll();
                while (ae.hasMore()) {
                    Attribute attr = ae.next();

                    if (attr.getID().equals(groupIdentifierAttribute)) {

                        Collection<String> groupNames = LdapUtils.getAllAttributeValues(attr);
                        // TODO by now we adding both the full qualified group name as well as the UDI
                        // as determined by the groupIdentifierAttribute
                        groupNames.add(sr.getNameInNamespace());

                        if (logger.isTraceEnabled()) {
                            logger.trace("Groups found for user [{}]: {}", username, groupNames);
                        }

                        Collection<String> rolesForGroups = ShiroRealmUtils.getRoleNamesForGroups(logger, groupRolesMap,
                                groupNames);
                        roleNames.addAll(rolesForGroups);
                    }
                }
            }
        }
        return roleNames;
    }

    @Override
    protected AuthenticationInfo queryForAuthenticationInfo(AuthenticationToken token,
            LdapContextFactory ldapContextFactory) throws NamingException {
        Object principal = token.getPrincipal();
        Object credentials = token.getCredentials();

        logger.debug("Authenticating user '{}' through LDAP", principal);

        Optional<String> userDn = retrieveUserDn((String) principal);
        if (userDn.isPresent()) {
            principal = userDn.get();
            LdapContext ctx = null;
            try {
                ctx = ldapContextFactory.getLdapContext(principal, credentials);
                // context was opened successfully, which means their credentials were valid.
                // Return the AuthenticationInfo:
                return createAuthenticationInfo(token, principal, credentials, ctx);
            } finally {
                LdapUtils.closeContext(ctx);
            }
        } else {
            throw new javax.naming.AuthenticationException("User DN not found.");
        }
    }

    /**
     * Search for a user DN with ObjectClass corresponding to
     * {@link #userObjectClass} and principal matching
     * {@link #userIdentifierAttribute}.
     */
    protected Optional<String> retrieveUserDn(String principal) throws NamingException {
        String searchFilter = "(&(objectclass={0})({1}={2}))";
        Object[] searchArguments = new Object[] { userObjectClass, userIdentifierAttribute, principal };

        // use this only for logger
        // SHIRO-115 - prevent potential code injection:
        String searchFilterString = String.format("(&(objectclass=%1$s)(%2$s=%3$s))", searchArguments);
        logger.trace("Searching for user DN, with filter: {}", searchFilterString);

        NamingEnumeration<SearchResult> searchResultEnum = null;
        LdapContext context = null;
        try {
            context = getContextFactory().getSystemLdapContext();
            searchResultEnum = context.search(searchBase, searchFilter, searchArguments, SUBTREE_SCOPE);
            if (searchResultEnum.hasMore()) {
                SearchResult searchResult = searchResultEnum.next();
                String dn = searchResult.getNameInNamespace();
                logger.trace("Found DN for the user: {}", dn);
                return Optional.of(dn);
            } else {
                logger.debug("User {} was not found in LDAP directory.", principal);
                return Optional.empty();
            }

        } finally {
            LdapUtils.closeEnumeration(searchResultEnum);
            LdapUtils.closeContext(context);
        }
    }

    private List<SearchResult> toListOfSearchResults(NamingEnumeration<SearchResult> searchResults)
            throws NamingException {
        List<SearchResult> result = new ArrayList<SearchResult>();
        while (searchResults.hasMore()) {
            SearchResult searchResult = searchResults.next();
            result.add(searchResult);
        }
        return result;
    }

    private List<String> getAttributeValues(SearchResult searchResult, String attributeName) throws NamingException {
        List<String> result = new ArrayList<String>();
        Attributes attrs = searchResult.getAttributes();
        if (attrs != null) {
            NamingEnumeration<? extends Attribute> ae = attrs.getAll();
            while (ae.hasMore()) {
                Attribute attr = ae.next();
                if (attr.getID().equals(attributeName)) {
                    Collection<String> values = LdapUtils.getAllAttributeValues(attr);
                    for (String value : values) {
                        result.add(value);
                    }
                }
            }
        }
        return result;
    }

    private List<SearchResult> getUsers(LdapContext ldapContext) throws NamingException {
        SearchControls cons = new SearchControls();
        cons.setSearchScope(SearchControls.SUBTREE_SCOPE);
        cons.setReturningAttributes(new String[] { userIdentifierAttribute });
        NamingEnumeration<SearchResult> searchResults = ldapContext.search(searchBase, "(objectclass={0})",
                new String[] { userObjectClass }, cons);
        return toListOfSearchResults(searchResults);
    }

    private List<SearchResult> getGroupsForUser(LdapContext ldapContext, String userDN) throws NamingException {
        NamingEnumeration<SearchResult> searchResults = getGroupsForUsers(ldapContext, userDN);
        return toListOfSearchResults(searchResults);
    }

    @Override
    public List<UserMetadata> getUsersMetadata() {
        List<UserMetadata> result = new ArrayList<UserMetadata>();
        try {
            LdapContext ldapContext = getContextFactory().getSystemLdapContext();

            List<SearchResult> users = getUsers(ldapContext);
            for (SearchResult user : users) {
                List<String> userUids = getAttributeValues(user, userIdentifierAttribute);
                for (String userUid : userUids) {
                    Set<UserMetadata.GroupProps> groupSet = new HashSet<>();
                    Set<String> roleSet = new HashSet<>();
                    String userDnOrUserUid = getUserDnOrUserUid(userUid, user.getNameInNamespace());
                    List<SearchResult> groups = getGroupsForUser(ldapContext, userDnOrUserUid);
                    for (SearchResult group : groups) {
                        groupSet.add(new UserMetadata.GroupProps(group.getNameInNamespace(),
                                group.getAttributes().get(groupIdentifierAttribute).get().toString()));
                        String groupDn = group.getNameInNamespace();
                        Collection<String> groupList = Arrays.asList(groupDn);
                        for (String role : ShiroRealmUtils.getRoleNamesForGroups(logger, groupRolesMap, groupList)) {
                            roleSet.add(role);
                        }
                    }
                    result.add(new UserMetadata(userUid, groupSet, roleSet));
                }
            }
        } catch (NamingException e) {
        }
        return result;
    }
}
