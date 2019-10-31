/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package com.metaphacts.services.storage.api;

import org.junit.Test;

import static org.junit.Assert.*;

public class StoragePathTest {
    @Test
    public void testParseCommon() {
        assertEquals(StoragePath.parse("foo/bar/baz.txt").toString(), "foo/bar/baz.txt");
        assertEquals(StoragePath.parse("topLevel").toString(), "topLevel");
        assertEquals(StoragePath.parse("").toString(), "");
    }

    @Test
    public void testParseSpecialChars() {
        assertEquals(StoragePath.parse("@at/$dollar/%percent").toString(), "@at/$dollar/%percent");
        assertEquals(StoragePath.parse(".hidden.").toString(), ".hidden.");
        assertEquals(StoragePath.parse("SPACES SPACES / z ").toString(), "SPACES SPACES / z ");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testDisallowHeadingSeparators() {
        StoragePath.parse("/foo/bar");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testDisallowTrailingSeparators() {
        StoragePath.parse("foo/bar/");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testDisallowNonCaninicalPath() {
        StoragePath.parse("foo/../bar");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testDisallowEmptyComponents() {
        StoragePath.parse("foo//bar");
    }

    @Test
    public void testIsEmpty() {
        assertTrue(StoragePath.EMPTY.isEmpty());
        assertTrue(StoragePath.parse("").isEmpty());
        assertFalse(StoragePath.parse("foo/bar").isEmpty());
    }

    @Test
    public void testEquality() {
        assertEquals(StoragePath.EMPTY, StoragePath.parse(""));
        assertEquals(StoragePath.parse("foo"), StoragePath.parse("foo"));
        assertEquals(StoragePath.parse("foo/bar"), StoragePath.parse("foo/bar"));

        assertNotEquals(StoragePath.EMPTY, StoragePath.parse("foo/bar"));
        assertNotEquals(StoragePath.parse("foo/bar"), StoragePath.parse("foo/qux"));
        assertNotEquals(StoragePath.parse("foo"), StoragePath.parse("foo1"));
    }

    @Test
    public void testIsPrefixOf() {
        // empty path is a prefix for any other path, including empty one
        assertTrue(StoragePath.EMPTY.isPrefixOf(StoragePath.EMPTY));
        assertTrue(StoragePath.EMPTY.isPrefixOf(StoragePath.parse("foo/bar")));

        assertTrue(StoragePath.parse("foo").isPrefixOf(StoragePath.parse("foo")));
        assertTrue(StoragePath.parse("foo").isPrefixOf(StoragePath.parse("foo/bar")));
        assertTrue(StoragePath.parse("foo/bar").isPrefixOf(StoragePath.parse("foo/bar")));
        assertTrue(StoragePath.parse("foo/bar").isPrefixOf(StoragePath.parse("foo/bar/baz")));

        assertFalse(StoragePath.parse("foo").isPrefixOf(StoragePath.parse("bar")));
        // ensure that isPrefixOf only matches atomically by components
        assertFalse(StoragePath.parse("foo").isPrefixOf(StoragePath.parse("foobar")));
        assertFalse(StoragePath.parse("foo/bar").isPrefixOf(StoragePath.parse("foo/bar1")));
    }

    @Test
    public void testResolve() {
        assertEquals(StoragePath.EMPTY.resolve("foo"), StoragePath.parse("foo"));
        assertEquals(StoragePath.EMPTY.resolve("/foo/"), StoragePath.parse("foo"));
        assertEquals(StoragePath.parse("foo/bar").resolve("baz"), StoragePath.parse("foo/bar/baz"));
        assertEquals(StoragePath.parse("foo").resolve("bar/baz"), StoragePath.parse("foo/bar/baz"));
        assertEquals(StoragePath.parse(".foo").resolve(".bar/"), StoragePath.parse(".foo/.bar"));
        assertEquals(
            StoragePath.parse("foo").resolve(StoragePath.parse("bar/baz")),
            StoragePath.parse("foo/bar/baz")
        );
    }

    @Test(expected = IllegalArgumentException.class)
    public void testResolveFailsOnInvalidPart() {
        StoragePath.parse("foo/bar").resolve("qux//");
    }

    @Test
    public void testRelativize() {
        assertEquals(StoragePath.EMPTY.relativize(StoragePath.EMPTY).get(), StoragePath.EMPTY);
        assertEquals(
            StoragePath.parse("foo").relativize(StoragePath.parse("foo/bar")).get(),
            StoragePath.parse("bar")
        );
        assertEquals(
            StoragePath.EMPTY.relativize(StoragePath.parse("foo")).get(),
            StoragePath.parse("foo")
        );
        assertEquals(
            StoragePath.parse("foo/bar").relativize(StoragePath.parse("foo/bar")).get(),
            StoragePath.EMPTY
        );
        assertEquals(
            StoragePath.parse("foo/bar").relativize(StoragePath.parse("foo/bar/baz/qux")).get(),
            StoragePath.parse("baz/qux")
        );

        assertFalse(StoragePath.parse("foo").relativize(StoragePath.parse("foo1")).isPresent());
        assertFalse(StoragePath.parse("foo/bar").relativize(StoragePath.parse("foo/b")).isPresent());
        assertFalse(StoragePath.parse("foo/bar").relativize(StoragePath.EMPTY).isPresent());
    }

    @Test
    public void testGetParent() {
        assertEquals(StoragePath.EMPTY.getParent(), StoragePath.EMPTY);
        assertEquals(StoragePath.parse("foo").getParent(), StoragePath.EMPTY);
        assertEquals(StoragePath.parse("foo/bar").getParent(), StoragePath.parse("foo"));
    }

    @Test
    public void testGetLastComponent() {
        assertEquals(StoragePath.EMPTY.getLastComponent(), "");
        assertEquals(StoragePath.parse("foo").getLastComponent(), "foo");
        assertEquals(StoragePath.parse("foo/bar").getLastComponent(), "bar");
    }

    @Test
    public void testAddExtension() {
        assertEquals(StoragePath.parse("foo").addExtension(".txt"), StoragePath.parse("foo.txt"));
        assertEquals(
            StoragePath.parse("foo/bar").addExtension("...txt"),
            StoragePath.parse("foo/bar...txt")
        );
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFailToAddExtensionToEmptyPath() {
        StoragePath.EMPTY.addExtension(".png");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFailToAddInvalidExtensionWithoutDot() {
        StoragePath.parse("foo/bar").addExtension("non-extension");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFailToAddInvalidExtensionWithSeparator() {
        StoragePath.parse("foo/bar").addExtension(".png/jpg");
    }

    @Test
    public void testHasExtension() {
        assertTrue(StoragePath.parse("foo.txt").hasExtension(".txt"));
        assertTrue(StoragePath.parse("foo/bar...png").hasExtension("...png"));

        assertFalse(StoragePath.EMPTY.hasExtension(".txt"));
        assertFalse(StoragePath.parse("foo").hasExtension(".png"));
        assertFalse(StoragePath.parse("foo.txt").hasExtension(".png"));
        assertFalse(StoragePath.parse("foo.txt/bar").hasExtension(".txt"));
    }

    @Test
    public void testStripExtension() {
        assertEquals(StoragePath.EMPTY.stripExtension(".txt"), StoragePath.EMPTY);
        assertEquals(
            StoragePath.parse("foo.txt").stripExtension(".txt"),
            StoragePath.parse("foo")
        );
        assertEquals(
            StoragePath.parse("foo/bar...png").stripExtension("...png"),
            StoragePath.parse("foo/bar")
        );
        assertEquals(
            StoragePath.parse("foo.txt").stripExtension(".png"),
            StoragePath.parse("foo.txt")
        );
        assertEquals(
            StoragePath.parse("foo.txt/bar").stripExtension(".txt"),
            StoragePath.parse("foo.txt/bar")
        );
    }

    @Test
    public void testRemoveAnyExtension() {
        assertEquals(StoragePath.removeAnyExtension(""), "");
        assertEquals(StoragePath.removeAnyExtension("foo"), "foo");
        assertEquals(StoragePath.removeAnyExtension("foo.txt"), "foo");
        assertEquals(StoragePath.removeAnyExtension("foo.txt.png"), "foo.txt");
        assertEquals(StoragePath.removeAnyExtension("foo.txt/bar.png"), "foo.txt/bar");
        assertEquals(StoragePath.removeAnyExtension("foo.txt/bar"), "foo.txt/bar");
    }
}
