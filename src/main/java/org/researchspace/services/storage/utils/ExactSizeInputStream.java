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

package org.researchspace.services.storage.utils;

import java.io.IOException;
import java.io.InputStream;

public class ExactSizeInputStream extends InputStream {
    private final InputStream original;
    private final long targetSize;
    private long total;

    public ExactSizeInputStream(InputStream original, long targetSize) {
        this.original = original;
        this.targetSize = targetSize;
    }

    @Override
    public long skip(long n) throws UnsupportedOperationException {
        throw new UnsupportedOperationException();
    }

    @Override
    public int available() throws IOException {
        return super.available();
    }

    @Override
    public void close() throws IOException {
        super.close();
    }

    @Override
    public synchronized void mark(int readlimit) {
        throw new UnsupportedOperationException();
    }

    @Override
    public synchronized void reset() throws UnsupportedOperationException {
        throw new UnsupportedOperationException();
    }

    @Override
    public boolean markSupported() {
        return false;
    }

    @Override
    public int read() throws IOException {
        int i = original.read();
        if (i >= 0)
            incrementCounter(1);
        return i;
    }

    @Override
    public int read(byte b[]) throws IOException {
        return read(b, 0, b.length);
    }

    @Override
    public int read(byte b[], int off, int len) throws IOException {
        int i = original.read(b, off, len);
        if (i >= 0)
            incrementCounter(i);
        if (i == -1 && total != targetSize)
            throw new IOException("InputStream has wrong size in bytes.");
        return i;
    }

    private void incrementCounter(int size) throws IOException {
        total += size;
        if (total > targetSize)
            throw new IOException("InputStream exceeded target size in bytes.");
    }

}
