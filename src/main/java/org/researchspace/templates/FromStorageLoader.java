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

package org.researchspace.templates;

import com.github.jknack.handlebars.io.AbstractTemplateLoader;
import com.github.jknack.handlebars.io.ReloadableTemplateSource;
import com.github.jknack.handlebars.io.TemplateSource;

import java.io.IOException;
import java.nio.charset.Charset;
import java.time.Instant;

import org.researchspace.services.storage.StorageUtils;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

public abstract class FromStorageLoader extends AbstractTemplateLoader {
    protected final PlatformStorage storage;

    public FromStorageLoader(PlatformStorage storage) {
        this.storage = storage;
    }

    protected abstract StoragePath resolveLocation(String location);

    @Override
    public TemplateSource sourceAt(String location) throws IOException {
        StoragePath resolved = resolveLocation(location);
        // handlebars library uses exception message as template location in their
        // not-found-error,
        // so the message should be phased as a template location noun
        PlatformStorage.FindResult found = storage.findObject(resolved)
                .orElseThrow(() -> new TemplateNotFoundException("Storage object \"" + resolved.toString() + "\""));
        return new ReloadableTemplateSource(new StorageTemplateSource(location, found.getRecord()));
    }

    protected static class StorageTemplateSource implements TemplateSource {
        private String filename;
        private ObjectRecord record;

        public StorageTemplateSource(String filename, ObjectRecord record) {
            this.filename = filename;
            this.record = record;
        }

        @Override
        public String content(Charset charset) throws IOException {
            return StorageUtils.readTextContent(record);
        }

        @Override
        public String filename() {
            return filename;
        }

        @Override
        public long lastModified() {
            Instant date = record.getMetadata().getCreationDate();
            return date == null ? 0 : date.toEpochMilli();
        }
    }

    public class TemplateNotFoundException extends IOException {
        public TemplateNotFoundException(String message) {
            super(message);
        }
    }
}
