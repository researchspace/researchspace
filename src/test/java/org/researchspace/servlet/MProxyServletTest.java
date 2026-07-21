/**
 * ResearchSpace
 * Copyright (C) 2026 ResearchSpace contributors
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

package org.researchspace.servlet;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class MProxyServletTest {
    @Test
    public void stripsPathPrefix() {
        assertEquals(
                "/image.jpg/full/!640,480/0/default.jpg",
                MProxyServlet.stripPathPrefix(
                        "/iiif/2/image.jpg/full/!640,480/0/default.jpg",
                        "/iiif/2"));
        assertEquals("/", MProxyServlet.stripPathPrefix("/iiif/2", "/iiif/2"));
        assertEquals("/image.jpg", MProxyServlet.stripPathPrefix("/iiif/2/image.jpg", "iiif/2/"));
    }

    @Test
    public void preservesUnmatchedPath() {
        assertEquals("/iiif/20/image.jpg", MProxyServlet.stripPathPrefix("/iiif/20/image.jpg", "/iiif/2"));
        assertEquals("/image.jpg", MProxyServlet.stripPathPrefix("/image.jpg", null));
    }
}
