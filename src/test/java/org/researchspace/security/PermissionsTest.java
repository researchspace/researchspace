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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.junit.Test;
import org.researchspace.security.Permissions;
import org.researchspace.security.PermissionsDocField;

import com.google.common.collect.Sets;

public class PermissionsTest {

    @Test
    public void loadExampleFromResourcesTest() throws IOException {
        String resourceDirString = "org/researchspace/security/aclhelp/";
        Set<String> filesInResourceFolder = new HashSet<String>(IOUtils.readLines(
                this.getClass().getClassLoader().getResourceAsStream(resourceDirString), StandardCharsets.UTF_8));
        Set<String> filesReferencedInAnnotations = Sets.newHashSet();
        Set<Field> fields = Sets.newHashSet();
        for (Class<?> declaredClasses : Permissions.class.getDeclaredClasses()) {
            // nested enums
            for (Class<?> enumClass : declaredClasses.getDeclaredClasses()) {
                fields.addAll(Arrays.asList(enumClass.getFields()));
            }
            fields.addAll(Arrays.asList(declaredClasses.getDeclaredFields()));

        }

        for (Field field : fields) {
            if (field.isAnnotationPresent(PermissionsDocField.class)) {
                if (!field.getAnnotation(PermissionsDocField.class).example().equals("")) {
                    String resourceName = field.getAnnotation(PermissionsDocField.class).example();
                    filesReferencedInAnnotations.add(StringUtils.substringAfterLast(resourceName, "/"));
                    InputStream is = this.getClass().getResourceAsStream(resourceName);

                    assertTrue("Referenced example resource file contains content",
                            StringUtils.isNotEmpty(IOUtils.toString(is, StandardCharsets.UTF_8)));
                }
            }
        }

        assertTrue(filesReferencedInAnnotations.size() > 0);
        assertEquals(filesReferencedInAnnotations.size(), filesInResourceFolder.size());

        if (!filesReferencedInAnnotations.containsAll(filesInResourceFolder)) {
            fail("The following permission example files are in the resource classpath but not used in any of the annotations: "
                    + Sets.difference(filesInResourceFolder, filesReferencedInAnnotations));
        }

        if (!filesInResourceFolder.containsAll(filesReferencedInAnnotations)) {
            fail("The following example files are referenced from annotations but not in the resource classpath: "
                    + Sets.difference(filesReferencedInAnnotations, filesInResourceFolder));
        }

    }
}
