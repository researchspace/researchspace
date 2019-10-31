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

package com.metaphacts.upload.handlers;

import com.google.inject.Singleton;
import com.metaphacts.upload.UploadHandler;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.CopyOption;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

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
        CopyOption[] options = new CopyOption[]{
                StandardCopyOption.REPLACE_EXISTING
        };
        Files.copy(in, Paths.get(new URI(url.toString() + "/" + generatedId + ".jpg")), options);
    }
}