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

package org.researchspace.plugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Enumeration;
import java.util.List;
import java.util.Properties;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.util.ZipUtils;

import com.google.common.collect.Lists;

import ro.fortsoft.pf4j.PluginException;

/**
 * Collection of static utils to handle unpacking of ZIP artefacts.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class PluginZipUtils {
    private static final Logger logger = LogManager.getLogger(PluginZipUtils.class);

    /**
     * <p>
     * This method takes a path to a single ZIP app and expands it into a folder
     * with a name equal next to the zip. If exists, it backs-up old app folders
     * with equal names to a zip-compressed <code>*,{timestamp}.zip.bk</code>
     * archive next to the new app folder.
     * <p>
     * <p>
     * It handles both:
     * <ul>
     * <li>ZIP artefacts with flat app folder structure, i.e. files are packaged
     * into the zip without a intermediate app folder</li>
     * <li>ZIP artefacts with one level nesting, i.e. the ZIP contains a single app
     * folder with the name equal to the zip. Throws an exception otherwise.</li>
     * </ul>
     * 
     * The procedure is as follows:
     * <ol>
     * <li>Expand the zip to a temp java/system folder, handling the two
     * aforementioned cases.</li>
     * <li>Check whether a app folder with the same name exists next to the ZIP app.
     * Create compressed backup and remove old folder.</li>
     * <li>Check whether app contains mandatory plugin.property file and is
     * consistent (id equal to app folder name).</li>
     * <li>Move uncompressed app directory from temp location next to the zip
     * (assuming that this is usually the app directory)</li>
     * </ol>
     * 
     * @param zipFile
     * @return the path to the folder where
     * @throws IOException
     * @throws PluginException
     */
    protected static Path expandAndDeleteIfValidZipApp(Path zipFile) throws IOException, PluginException {

        // exit if it is NOT a zip file
        if (!isZip(zipFile)) {
            return zipFile;
        }

        String pluginName = FilenameUtils.getBaseName(zipFile.getFileName().toString());

        // get the (future) app directory, i.e. a folder next to the zip file
        // Example: /apps/app1.zip -> /apps/app1
        Path pluginDirectory = zipFile.resolveSibling(pluginName);

        Path destAppsFolderPath = pluginDirectory.getParent();

        // create temp directory (which should always have the same name as the plugin
        // (for app ZIP files without root folder)
        Path tempDestFolderPath = Files.createTempDirectory("tmp").resolve(pluginName);
        Path tempPluginDirectory = isSingleDirectoryAppZip(zipFile.toFile()) ? tempDestFolderPath.resolve(pluginName)
                : tempDestFolderPath;
        File destAppFolder = destAppsFolderPath.resolve(pluginName).toFile();

        try {

            ZipUtils.unzip(zipFile, tempDestFolderPath, StandardCharsets.UTF_8);
            logger.info("Expanded plugin/app zip '{}' into temporary folder '{}'", zipFile.toFile().getAbsolutePath(),
                    tempDestFolderPath);

            PluginZipUtils.assertValidAppStructure(tempPluginDirectory.toFile());
            logger.info("App {} seems to be valid.", zipFile.getFileName());
            if (Files.exists(pluginDirectory)) {
                logger.debug("Removing and backing up old app directory {}", pluginDirectory);
                createBackupZipAndDelete(pluginDirectory);
            }
            FileUtils.moveDirectory(tempPluginDirectory.toFile(), destAppFolder);

        } catch (PluginException | IOException e) {
            throw e;
        } finally {
            // make sure that the temp directory is deleted in any case
            FileUtils.deleteQuietly(tempPluginDirectory.toFile());
            deleteZip(zipFile);
        }

        return destAppFolder.toPath();
    }

    /**
     * Tries to delete the specified zip file. Catches and logs any exception (for
     * example security/access issues if the zip is mounted), to that the subsequent
     * operations don't fail but the exception is logged as an error to inform the
     * admin.
     * 
     * @param zipFile
     */
    private static void deleteZip(Path zipFile) {
        try {
            zipFile.toFile().delete();
        } catch (Exception e) {
            logger.error("Failed to delete zip app {} after successful unzipping: {} ."
                    + "This may cause failures or inconsistencies. Please make sure that your app directory is writeable.",
                    zipFile.toFile().getAbsolutePath(), e.getMessage());
        }
    }

    /**
     * Returns true if the filename ends with .zip.
     * 
     * @param zipFile
     * @return
     */
    private static boolean isZip(Path zipFile) {
        return FilenameUtils.isExtension(zipFile.toFile().getName(), "zip");
    }

    /**
     * <p>
     * Returns true if and only if the zip contains a single directory. It uses a
     * very simple heuristic i.e. returns true as soon as it finds any ZIP entries
     * starting with the same name as the zip file. <b>This means in principle, that
     * the zip may contain more than just this folder</b>. This must be handled in
     * subsequent processing, for example, when unpacking the zip.
     * </p>
     * 
     * </p>
     * It throws a {@link PluginException} in case the zip is determined to be a
     * none-single directory ZIP but also does not contain the mandatory files like
     * plugin.properties flat, for example, if is a single directory zip, but the
     * zip name is differnt from the directory name.
     * </p>
     * TODO The heuristic may need to be improved in the future, however, one can
     * not simply check whether the zip contains just a single entry,since often
     * other files like .DS_Store or __MACOSX meta data files get compressed into
     * the archive as well, depending on the tooling being used to create the
     * archives.
     * 
     * @param zipFile
     * @return
     * @throws ZipException
     * @throws IOException
     * @throws PluginException
     */
    protected static boolean isSingleDirectoryAppZip(File zipFile) throws ZipException, IOException, PluginException {
        String name = FilenameUtils.getBaseName(zipFile.getName());
        List<String> zipEntries = getZipEntries(zipFile);
        for (String f : zipEntries) {
            // remove the leading slash as some os / zip tools create zip entries without
            // leading
            // slash
            if (StringUtils.startsWith(StringUtils.removeStart(f, "/"), name + "/")) {
                return true;
            }
        }
        // if it is not a single directory app, make sure that it is flat and not just
        // inconsistent in naming.
        if (!zipEntries.contains("plugin.properties")) {
            throw new PluginException(
                    "The zip file does not contain a folder with a name that is equal to the zip name. "
                            + "In this case the platform assumes that the app files are packaged flat into the archive."
                            + "However, mandatory files like the \"plugin.properties\" don't exist. Please make sure that "
                            + "the zip file is named correctly and contains all mandatory files. ");
        }
        return false;
    }

    /**
     * Returns true is and only if the specified app directory contains a
     * plugin.properties file, where the plugin.id is equal to the plugin directory
     * name.
     * 
     * @param appDirectory
     * @return
     * @throws PluginException
     * @throws IOException
     */
    protected static boolean assertValidAppStructure(File appDirectory) throws PluginException, IOException {
        final String pluginFilePropertiesFileName = "plugin.properties";
        File pluginFileProperties = new File(appDirectory, pluginFilePropertiesFileName);
        if (!pluginFileProperties.exists()) {
            throw new PluginException("App must contain a plugin.properties file");
        }
        Properties prop = new Properties();

        try (FileInputStream fois = FileUtils.openInputStream(pluginFileProperties)) {
            prop.load(fois);
            String pluginId = prop.getProperty("plugin.id");
            if (StringUtils.isEmpty(pluginId)) {
                throw new PluginException("plugin.properties file must contain a none empty plugin.id property.");
            }
            if (!pluginId.equals(appDirectory.getName())) {
                throw new PluginException("plugin.id must be equal to the app folder/zip name.");
            }
        }

        return true;
    }

    protected static List<String> getZipEntries(File archive) throws ZipException, IOException {
        List<String> zipEntries = Lists.newArrayList();
        try (ZipFile zipFile = new ZipFile(archive)) {
            Enumeration<? extends ZipEntry> e = zipFile.entries();

            while (e.hasMoreElements()) {
                ZipEntry entry = e.nextElement();
                String entryName = entry.getName();
                zipEntries.add(entryName);
            }
        }
        return zipEntries;
    }

    protected static File createBackupZipAndDelete(Path pluginDirectory) throws IOException {
        final File pluginDirectoryFile = pluginDirectory.toFile();
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
        String backupName = FilenameUtils.getBaseName(pluginDirectoryFile.getAbsolutePath()) + "."
                + dateFormat.format(new Date()) + ".zip.bk";
        File backup = new File(pluginDirectory.getParent().toFile(), backupName);
        logger.debug("Creating backup {} for existing app directory {}", backup.getAbsolutePath(),
                pluginDirectory.toFile().getAbsolutePath());
        ZipUtils.compressDirToZipFile(pluginDirectory.toFile(), backup);
        FileUtils.deleteDirectory(pluginDirectory.toFile());
        return backup;
    }

}
