/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.plugin.handler;

import static com.google.common.base.Preconditions.checkArgument;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;

import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.Logger;
 /**
 * Static utils to copy files from one directory to the other with detailed logging support.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
/* package private */class CopyUtils {
    
    /**
     * Copies all files from srcDir to dstDir unless a same-labeled filed in
     * dstDir already exists. Method takes no effect if one of the source
     * directory does not exist or is empty. Throws an
     * {@link IllegalArgumentException} if dstDir does not exist.
     * 
     * @param srcDir
     *            the source directory
     * @param dstDir
     *            the destination directory
     * @param fileNameFilter
     *            Filter for filtering the files to be copied. If null, all
     *            files will be copied.
     * @param logger
     *            logger instance to log to
     * @throws IllegalArgumentException
     *             If dstDir does not exist.
     */
    static public void copyFromSrcDirToDstDirNoOverride(final File srcDir, final File dstDir, final FilenameFilter fileNameFilter, final Logger logger) throws IllegalArgumentException{
        checkPreconditions(dstDir);
        
        final File[] files = fileNameFilter !=null ? srcDir.listFiles(fileNameFilter) : srcDir.listFiles();
        if (srcDir.exists() && files.length!=0) {
            for (final File file : files) {
                final File dstFile = new File(dstDir, file.getName());
                if (dstFile.exists()) {
                    
                    logger.debug(
                        "File \"{}\" already exists in \"{}\". Skipping.",
                        file.getAbsolutePath(),
                        dstDir.getAbsolutePath()
                    );
                } else {
                    
                    try {
                        
                        FileUtils.copyFile(file, dstFile);
                        logger.debug(
                                "Copied file from \"{}\" to \"{}\".",
                                file.getAbsolutePath(),
                                dstDir.getAbsolutePath()
                        );
                    } catch (IOException e) {
                        logger.warn("Copying of \"{}\" to \"{}\" failed.", file.getAbsolutePath(), dstDir.getAbsoluteFile());
                        logger.trace("Details: {}", e.getMessage());
                    }
                }
            }

        } else {
            logger.debug("No files in directory \"{}\" to copy.", srcDir.getAbsolutePath());
        }

    }

    /**
     * Copies all files from srcDir to dstDir <strong>regardless whether a files
     * with the same names already exist</strong> i.e. existing files will be
     * overwritten.Method takes no effect if one of the source directory does
     * not exist or is empty. Throws an {@link IllegalArgumentException} if
     * dstDir does not exist.
     * 
     * @param srcDir
     *            the source directory
     * @param dstDir
     *            the destination directory
     * @param fileNameFilter
     *            Filter for filtering the files to be copied. If null, all
     *            files will be copied.
     * @param logger
     *            logger instance to log to
     * @throws IllegalArgumentException
     *             If dstDir does not exist.
     */
    static public void copyFromSrcDirToDstDirOverride(final File srcDir, final File dstDir, final FilenameFilter fileNameFilter, final Logger logger)  throws IllegalArgumentException{
        checkPreconditions(dstDir);
        
        final File[] files = fileNameFilter !=null ? srcDir.listFiles(fileNameFilter) : srcDir.listFiles();
        if (srcDir.exists() || files.length==0) {
            for (final File file : files) {
                final File dstFile = new File(dstDir, file.getName());
                final boolean destFileExists = dstFile.exists();
                try {
                    // try not to preserve file date
                    FileUtils.copyFile(file, dstFile, false);
                    if (destFileExists) {
                        logger.debug(
                                "Copied (by overwrite) file from \"{}\" to \"{}\".",
                                file.getAbsolutePath(),
                                dstDir.getAbsolutePath()
                        );
                    } else {
                        logger.debug(
                                "Copied file from \"{}\" to \"{}\".",
                                file.getAbsolutePath(),
                                dstDir.getAbsolutePath()
                        );
                    }
                } catch (IOException e) {
                    logger.warn("Copying of \"{}\" to \"{}\" failed.", file.getAbsolutePath(), dstDir.getAbsoluteFile());
                    logger.trace("Details: {}", e.getMessage());
                }
                
            }
            
        } else {
            
            logger.debug("No files in directory \"{}\" to copy.", srcDir.getAbsolutePath());
            
        }
        
    }
    
    static private void checkPreconditions(File dstDir) throws IllegalArgumentException{
         checkArgument(dstDir.exists(), "Destination directory \""+ dstDir.getAbsolutePath() +"\" to copy to does not exist.");
    }
}
