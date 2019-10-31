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

package com.metaphacts.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;

/**
 * Static collection of utils for zip file handling.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class ZipUtils {
    /**
     * Creates a zip from a folder. The folder itself will be part of the zip as well as the method
     * will also add any nested, emtpy folders from the sourceDir to the zip file.
     * 
     * @param sourceDir
     * @param outputZipFile
     * @throws IOException
     * @throws FileNotFoundException
     */
    public static void compressDirToZipFile(File sourceDir, File outputZipFile)
            throws IOException, FileNotFoundException {
        try (ZipOutputStream zipFile = new ZipOutputStream(new FileOutputStream(outputZipFile))) {
            addFileOrFolderToZipStream(sourceDir, sourceDir, zipFile);
        }
    }

    /**
     * Unzips all entries from a zip file to a destination folder.
     * 
     * @param sourceZipPath
     * @param destFolderPath
     * @param charset
     * @throws IOException
     */
    public static void unzip(Path sourceZipPath, Path destFolderPath, Charset charset)
            throws IOException {
        try (ZipFile zipFile = new ZipFile(sourceZipPath.toFile(), ZipFile.OPEN_READ, charset)) {
            Enumeration<? extends ZipEntry> entries = zipFile.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                Path entryPath = destFolderPath.resolve(StringUtils.removeStart(entry.getName(),"/"));
                if (entry.isDirectory()) {
                    Files.createDirectories(entryPath);
                } else {
                    Files.createDirectories(entryPath.getParent());
                    try (InputStream in = zipFile.getInputStream(entry)) {
                        try (OutputStream out = new FileOutputStream(entryPath.toFile())) {
                            IOUtils.copy(in, out);
                        }
                    }
                }
            }
        }
    }

    /**
     * This is only public for testing purpose. Most likely you may want to use
     * {@link #compressDirToZipFile(File, File)} instead.
     * 
     * @param rootPath
     * @param sourceDir
     * @param out
     * @throws IOException
     * @throws FileNotFoundException
     */
    public static void addFileOrFolderToZipStream(File rootPath, File sourceDir,
            ZipOutputStream out) throws IOException, FileNotFoundException {
        for (File file : sourceDir.listFiles()) {
            /*
             * normalize entries to relative unix path
             * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT 4.4.17.1 The name of the
             * file, with optional relative path. The path stored MUST not contain a drive or device
             * letter, or a leading slash. All slashes MUST be forward slashes '/' as opposed to
             * backwards slashes '\' for compatibility with Amiga and UNIX file systems etc. If
             * input came from standard input, there is no file name field.
             */
            String zipEntryName = FilenameUtils.separatorsToUnix(
                    rootPath.getParentFile().toPath()
                    .relativize(sourceDir.toPath())
                    .resolve(file.getName())
                    .toString()
                    );
            if (file.isDirectory()) {
                //add entry for empty directories as well
                if(file.listFiles().length==0) {
                    out.putNextEntry(new ZipEntry(zipEntryName));
                }
                
                //call recursively 
                addFileOrFolderToZipStream(rootPath, file, out);
            } else {
                
                ZipEntry entry = new ZipEntry(zipEntryName);
                out.putNextEntry(entry);

                try (FileInputStream in = new FileInputStream(file)) {
                    IOUtils.copy(in, out);
                }
            }
        }
    }

}
