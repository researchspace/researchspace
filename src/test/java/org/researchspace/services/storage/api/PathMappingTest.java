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

package org.researchspace.services.storage.api;

import org.junit.Test;
import org.researchspace.services.storage.api.PathMapping;
import org.researchspace.services.storage.api.StoragePath;

import javassist.Loader.Simple;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

public class PathMappingTest {
    @Test
    public void testDefault() {
        PathMapping mapping = new PathMapping.Default();

        // test mapForward
        assertEquals(mapping.mapForward(StoragePath.parse("foo")).get(), StoragePath.parse("foo"));
        assertEquals(mapping.mapForward(StoragePath.parse("foo/bar")).get(), StoragePath.parse("foo/bar"));

        // test mapBack
        assertEquals(mapping.mapBack(StoragePath.parse("foo")).get(), StoragePath.parse("foo"));
        assertEquals(mapping.mapBack(StoragePath.parse("foo/bar")).get(), StoragePath.parse("foo/bar"));
    }

    @Test
    public void testMapPrefixWithReplace() {
        PathMapping mapping = new PathMapping.MapPrefix(new PathMapping.Default(), StoragePath.parse("foo/bar"),
                StoragePath.parse("qux/max"));

        // test mapForward
        assertEquals(mapping.mapForward(StoragePath.parse("foo/bar")).get(), StoragePath.parse("qux/max"));
        assertEquals(mapping.mapForward(StoragePath.parse("foo/bar/baz")).get(), StoragePath.parse("qux/max/baz"));
        assertFalse(mapping.mapForward(StoragePath.parse("foo")).isPresent());
        assertFalse(mapping.mapForward(StoragePath.parse("foo/ba1")).isPresent());

        // test mapBack
        assertEquals(mapping.mapBack(StoragePath.parse("qux/max")).get(), StoragePath.parse("foo/bar"));
        assertEquals(mapping.mapBack(StoragePath.parse("qux/max/baz")).get(), StoragePath.parse("foo/bar/baz"));
        assertFalse(mapping.mapBack(StoragePath.parse("qux")).isPresent());
        assertFalse(mapping.mapBack(StoragePath.parse("qux/ma1")).isPresent());
    }

    @Test
    public void testHierarchical() {
        PathMapping mapping = new PathMapping.HierarchicalPathMapping(
                SimpleValueFactory.getInstance().createIRI("http://www.researchspace.org/resource/"));

        StoragePath actualPath;
        StoragePath expectedPath;

        // test mapBack
        actualPath = mapping.mapBack(StoragePath.parse("index.html")).get();
        expectedPath = StoragePath.parse("http%3A%2F%2Fwww.researchspace.org%2Fresource%2Findex.html");
        assertEquals(expectedPath, actualPath);

        actualPath = mapping.mapBack(StoragePath.parse("templates/index.html")).get();
        expectedPath = StoragePath.parse("templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2Findex.html");
        assertEquals(expectedPath, actualPath);

        // test mapForward
        actualPath = mapping.mapForward(StoragePath.parse("http%3A%2F%2Fwww.researchspace.org%2Fresource%2Findex.html")).get();
        expectedPath = StoragePath.parse("index.html");
        assertEquals(expectedPath, actualPath);

        actualPath = mapping.mapForward(StoragePath.parse("templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2Findex.html")).get();
        expectedPath = StoragePath.parse("templates/index.html");
        assertEquals(expectedPath, actualPath); 
    }
}
