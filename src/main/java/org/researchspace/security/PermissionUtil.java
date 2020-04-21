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

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.shiro.SecurityUtils;
import org.eclipse.rdf4j.model.IRI;
import org.researchspace.api.sparql.SparqlUtil.SparqlOperation;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.security.Permissions.PAGES;
import org.researchspace.security.Permissions.SPARQL;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class PermissionUtil {

    private static final String VALID_PERMISSION_REGEX = "([-a-z0-9^\n]*):([^{}\n]*)";

    public static boolean hasSparqlPermission(SparqlOperation op, String repositoryId) {
        return (repositoryId.equals(RepositoryManager.DEFAULT_REPOSITORY_ID)
                && SecurityUtils.getSubject().isPermitted(SPARQL.sparqlOperationDefaultPermission(op)))
                || SecurityUtils.getSubject().isPermitted(SPARQL.sparqlOperationPermission(repositoryId, op));
    }

    public static boolean hasTemplateActionPermission(IRI iri, PAGES.Action action) {
        return (SecurityUtils.getSubject().isPermitted(PAGES.templateOperationPermission(iri, action)));
    }

    /**
     * First part of the regular expression checks the permission type i.e. Check if
     * it contains only alphanumeric characters. Only exception here is a dash '-'
     * that is allowed. The Second part of the permission after ':' can contain
     * anything except curly brackets '{}', because ideally the user should replace
     * the curly bracket with a valid entity example: proxyID, storageId,
     * repositoryId.
     * 
     * @param Permission string entered by the user.
     * @return Returns whether the permission string is valid or not.
     */
    public static boolean isPermissionValid(String permission) {
        Pattern initialPattern = Pattern.compile(VALID_PERMISSION_REGEX, Pattern.CASE_INSENSITIVE);
        Matcher initalPatternMatcher = initialPattern.matcher(permission);
        if (!initalPatternMatcher.matches()) {
            return false;
        }
        return true;
    }

    public static String normalizePermission(String permission) {
        return permission.replaceAll("\\s", "");
    }
}
