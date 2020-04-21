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

package org.researchspace.data.rdf.container;

import org.eclipse.rdf4j.rio.RDFFormat;

import java.io.InputStream;

/**
 * @author Yury Emelyanov
 */
public class RDFStream {
    InputStream inputStream;
    RDFFormat format;

    public RDFStream(InputStream inputStream, RDFFormat format) {
        this.inputStream = inputStream;
        this.format = format;
    }

    public InputStream getInputStream() {

        return inputStream;
    }

    public RDFFormat getFormat() {
        return format;
    }
}