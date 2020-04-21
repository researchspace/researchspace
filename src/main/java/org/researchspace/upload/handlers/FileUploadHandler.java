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

package org.researchspace.upload.handlers;

import com.google.inject.Singleton;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.CopyOption;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.researchspace.upload.UploadHandler;

/**
 * @author Yury Emelyanov
 */
@Singleton
public class FileUploadHandler implements UploadHandler {

    @Override
    public boolean supportsProtocol(String protocol) {
        return "file".equals(protocol);
    }

    @Override
    public void handleUpload(URL url, String generatedId, InputStream in) throws IOException, URISyntaxException {
        CopyOption[] options = new CopyOption[] { StandardCopyOption.REPLACE_EXISTING };
        Files.copy(in, Paths.get(new URI(url.toString() + "/" + generatedId + ".jpg")), options);
    }
}