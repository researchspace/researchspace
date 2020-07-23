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

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.Assert;
import org.junit.Test;
import org.researchspace.security.WildcardPermission;

import com.google.common.collect.Sets;

public class WildcardPermissionTest {

    @Test
    public void permissionIriEscapeTest() {
        WildcardPermission perm = new WildcardPermission("api:<http://example.com>:create");
        Assert.assertEquals(permissionParts("api", "<http://example.com>", "create"), perm.getParts());
    }

    @Test
    public void permissionMultipleIriEscapeTest() {
        WildcardPermission perm = new WildcardPermission("api:<http://example.com>:create:<http://example.com/2>");
        Assert.assertEquals(permissionParts("api", "<http://example.com>", "create", "<http://example.com/2>"),
                perm.getParts());
    }

    @Test
    public void permissionIriNoEscapeTest() {
        WildcardPermission perm = new WildcardPermission("api:test:create");
        Assert.assertEquals(permissionParts("api", "test", "create"), perm.getParts());
    }

    @Test
    public void permissionRegexTest() {
        WildcardPermission mine = new WildcardPermission(
                "pages:edit:save:regex(<http://www.researchspace.org/resource/admin/.*>)");
        WildcardPermission other = new WildcardPermission(
                "pages:edit:save:<http://www.researchspace.org/resource/admin/RepositoryManager>");
        Assert.assertTrue(mine.implies(other));
    }

    @Test
    public void permissionRegexLocalnameTest() {
        WildcardPermission mine = new WildcardPermission("pages:edit:save:regex(<.*(EphedraServices)>)");
        WildcardPermission other = new WildcardPermission(
                "pages:edit:save:<http://www.researchspace.org/resource/admin/EphedraServices>");
        Assert.assertTrue(mine.implies(other));
        other = new WildcardPermission("pages:edit:save:<http://www.researchspace.org/resource/admin/SomethingElse>");
        Assert.assertFalse(mine.implies(other));
    }

    @Test
    public void permissionRegexNoTemplatesTest() {
        // Regex permissions must only apply for the templates domain
        WildcardPermission mine = new WildcardPermission(
                "dummy:edit:save:regex(<http://www.researchspace.org/resource/admin/.*>)");
        WildcardPermission other = new WildcardPermission(
                "dummy:edit:save:<http://www.researchspace.org/resource/admin/RepositoryManager>");
        Assert.assertFalse(mine.implies(other));
    }

    @Test
    public void permissionRegexWrongPartTest() {
        // Regex permissions must only apply for the last (instance) part of the
        // permission string
        WildcardPermission mine = new WildcardPermission(
                "pages:regex(<http://www.researchspace.org/resource/admin/.*>):edit");
        WildcardPermission other = new WildcardPermission(
                "pages:<http://www.researchspace.org/resource/admin/RepositoryManager>:edit");
        Assert.assertFalse(mine.implies(other));
    }

    @Test
    public void permissionRegexAndIriTest() {
        WildcardPermission mine = new WildcardPermission(
                "pages:<http://www.researchspace.org/resource/permitted/ThisShouldBeAccepted>:save:regex(<http://www.researchspace.org/resource/admin/.*>)");
        Assert.assertEquals(
                permissionParts("pages", "<http://www.researchspace.org/resource/permitted/ThisShouldBeAccepted>", "save",
                        "regex(<http://www.researchspace.org/resource/admin/.*>)"),
                mine.getParts());
        WildcardPermission other = new WildcardPermission(
                "pages:<http://www.researchspace.org/resource/permitted/ThisShouldBeAccepted>:save:<http://www.researchspace.org/resource/admin/ThisShouldBeAccepted>");
        Assert.assertTrue(mine.implies(other));
        other = new WildcardPermission(
                "pages:<http://www.researchspace.org/resource/permitted/ThisShouldNotBeAccepted>:save:<http://www.researchspace.org/resource/admin/ThisShouldBeAccepted>");
        Assert.assertFalse(mine.implies(other));
        other = new WildcardPermission(
                "pages:<http://www.researchspace.org/resource/permitted/ThisShouldBeAccepted>:save:<http://www.researchspace.org/resource/test/ThisShouldNotBeAccepted>");
        Assert.assertFalse(mine.implies(other));
    }

    @Test
    public void permissionRegexBlacklistTest() {
        WildcardPermission mine = new WildcardPermission(
                "pages:edit:save:regex(<((?!(http://www.researchspace.org/resource/admin/)|(http://www.researchspace.org/resource/test/)).)*>)");
        Assert.assertEquals(permissionParts("pages", "edit", "save",
                "regex(<((?!(http://www.researchspace.org/resource/admin/)|(http://www.researchspace.org/resource/test/)).)*>)"),
                mine.getParts());
        WildcardPermission other = new WildcardPermission(
                "pages:edit:save:<http://www.researchspace.org/resource/admin/RepositoryManager>");
        Assert.assertEquals(permissionParts("pages", "edit", "save",
                "<http://www.researchspace.org/resource/admin/RepositoryManager>"), other.getParts());
        Assert.assertFalse(mine.implies(other));
        other = new WildcardPermission("pages:edit:save:<http://www.researchspace.org/resource/test/SomeTest>");
        Assert.assertFalse(mine.implies(other));
        other = new WildcardPermission(
                "pages:edit:save:<http://www.researchspace.org/resource/permitted/ThisShouldBeAccepted>");
        Assert.assertTrue(mine.implies(other));
    }

    @Test
    public void permissionRegexBlacklistViewTest() {
        WildcardPermission mine = new WildcardPermission(
                "pages:view:regex(<((?!(http://www.researchspace.org/resource/admin/)).)*>)");
        Assert.assertEquals(
                permissionParts("pages", "view", "regex(<((?!(http://www.researchspace.org/resource/admin/)).)*>)"),
                mine.getParts());
        WildcardPermission other = new WildcardPermission(
                "pages:view:<http://www.researchspace.org/resource/admin/RepositoryManager>");
        Assert.assertEquals(
                permissionParts("pages", "view", "<http://www.researchspace.org/resource/admin/RepositoryManager>"),
                other.getParts());
        Assert.assertFalse(mine.implies(other));
        other = new WildcardPermission("pages:view:<http://www.researchspace.org/resource/test/SomeTest>");
        Assert.assertTrue(mine.implies(other));
    }

    @Test
    public void permissionCaseSensitiveTest() {
        WildcardPermission mine = new WildcardPermission("api:config:environment:resourceUrlMapping:read");
        WildcardPermission other = new WildcardPermission("api:config:environment:resourceurlmapping:read");
        // ensure that these two permissions match both ways, i.e. that case really
        // doesn't matter in both directions
        Assert.assertTrue(mine.implies(other));
        Assert.assertTrue(other.implies(mine));
    }

    private List<HashSet<String>> permissionParts(String... parts) {
        return Arrays.asList(parts).stream().map(Sets::newHashSet).collect(Collectors.toList());
    }
}
