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

package org.researchspace.repository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryConfigSchema;
import org.eclipse.rdf4j.repository.sail.config.SailRepositorySchema;
import org.eclipse.rdf4j.repository.sparql.config.SPARQLRepositoryConfig;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.WriterConfig;
import org.eclipse.rdf4j.rio.helpers.BasicWriterSettings;
import org.eclipse.rdf4j.sail.config.SailConfigSchema;
import org.eclipse.rdf4j.sail.federation.config.FederationConfig;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectMetadata;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Maps;

/**
 * Collection of static utilities mainly around reading, parsing and serializing
 * {@link RepositoryConfig} <-> {@link Model} <-> turtle files.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class RepositoryConfigUtils {
    private static final StoragePath REPOSITORIES_OBJECT_PREFIX = ObjectKind.CONFIG.resolve("repositories");

    private static final Logger logger = LogManager.getLogger(RepositoryConfigUtils.class);

    /**
     * Tries to convert an RDF graph i.e. the specified {@link Model} into a
     * {@link RepositoryConfig} object.
     *
     * @param model
     * @return
     * @throws RepositoryConfigException If the supplied graph can not be converted
     *                                   into a VALID {@link RepositoryConfig}
     */
    public static RepositoryConfig createRepositoryConfig(Model model) throws RepositoryConfigException {
        Model idStmt = model.filter(null, RepositoryConfigSchema.REPOSITORYID, null);
        Optional<Resource> repositoryNode = Models.subject(idStmt);

        if (idStmt.size() != 1 || !repositoryNode.isPresent()) {
            throw new RepositoryConfigException("Repository configuration model must have exactly one repository id.");
        }

        return RepositoryConfig.create(model, repositoryNode.get());
    }

    /**
     * Tries to find and parse the repository configuration file for the specified
     * repository id within the specified folder. The assumption is that the base
     * file name of the turtle file is equal to the specified repository id. If such
     * file exists, it must meet the following condition:
     * <ul>
     * <li>file names must be equal to the repository configuration id as stated
     * within the turtle configuration</li>
     * <li>configuration must be valid</li>
     * </ul>
     * Respective exceptions will be thrown.
     *
     * @throws IllegalArgumentException  If no repository configuration file with
     *                                   such id can be found
     * @throws RepositoryConfigException If the repository configuration is not
     *                                   valid
     * @throws IOException               If the configuration file not not be read
     */
    public static RepositoryConfig readRepositoryConfigurationFile(PlatformStorage platformStorage, String repID)
            throws IllegalArgumentException, RepositoryConfigException, IOException {

        Optional<ObjectRecord> configFile = getConfigFile(platformStorage, repID).map(r -> r.getRecord());

        if (!configFile.isPresent()) {
            throw new IllegalArgumentException(
                    String.format("Repository configuration for \"%s\" does not exist.", repID));
        }

        RepositoryConfig repConfig = createRepositoryConfig(readTurtleRepositoryConfigFile(configFile.get()));

        String fileNameId = getRepositoryIdFromPath(configFile.get().getPath());
        if (!fileNameId.equals(repConfig.getID())) {
            throw new RepositoryConfigException(String.format(
                    "Name of repository configuration file is \"%s\", but need to be equal to the repository id as specified in the configuration (repositoryID=\"%s\").",
                    fileNameId, repConfig.getID()));
        }
        repConfig.validate();
        return repConfig;
    }

    public static void deleteRepositoryConfigurationIfExists(PlatformStorage platformStorage, String repID)
            throws IOException {
        Optional<PlatformStorage.FindResult> found = getConfigFile(platformStorage, repID);
        if (found.isPresent()) {
            PlatformStorage.FindResult result = found.get();
            ObjectStorage storage = platformStorage.getStorage(result.getAppId());
            storage.deleteObject(result.getRecord().getPath(), platformStorage.getDefaultMetadata());
        }
    }

    // regex pattern to normalize config file name to only alpha-numerical
    // characters
    private static final Pattern configFilePattern = Pattern.compile("[^a-zA-Z0-9.-]");

    private static String normalizeRepositoryConfigId(final String repID) {
        return configFilePattern.matcher(repID).replaceAll("-");
    }

    public static boolean repositoryConfigFileExists(PlatformStorage platformStorage, String repID) throws IOException {
        return getConfigFile(platformStorage, repID).isPresent();
    }

    private static Optional<PlatformStorage.FindResult> getConfigFile(PlatformStorage platformStorage, String repID)
            throws IOException {
        if (StringUtils.isEmpty(repID)) {
            throw new IllegalArgumentException("Repository config id must not be null.");
        }
        StoragePath objectId = getConfigObjectPath(repID);
        return platformStorage.findObject(objectId);
    }

    public static StoragePath getConfigObjectPath(String repID) {
        return REPOSITORIES_OBJECT_PREFIX.resolve(normalizeRepositoryConfigId(repID)).addExtension(".ttl");
    }

    public static String getRepositoryIdFromPath(StoragePath path) {
        return StoragePath.removeAnyExtension(path.getLastComponent());
    }

    /**
     * Serializes the provided {@link RepositoryConfig} as "pretty" turtle string
     * 
     * @param repConfig
     * @return
     * @throws IOException
     * @throws RepositoryConfigException
     */
    public static String convertRepositoryConfigToPrettyTurtleString(RepositoryConfig repConfig)
            throws IOException, RepositoryConfigException {
        return convertModelToPrettyTurtleString(exportConfigToModel(repConfig));
    }

    public static String convertModelToPrettyTurtleString(Model model) throws IOException, RepositoryConfigException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            writeModelAsPrettyTurtleOutputStream(baos, model);
            return baos.toString();
        }
    }

    /**
     * Converts the provided {@link RepositoryConfig} into a collection of RDF
     * statements i.e. a {@link Model}. Normalized the repository config id to
     * alpha-numerical characters and calls validate before converting the config
     * i.e. to prevent serialization of invalid configurations.
     *
     * @param repConfig
     * @return
     * @throws RepositoryConfigException
     */
    public static Model exportConfigToModel(RepositoryConfig repConfig) throws RepositoryConfigException {
        /* prevent invalid configurations from being serialized */
        repConfig.validate();

        /* normalize repository config id */
        repConfig.setID(normalizeRepositoryConfigId(repConfig.getID()));

        Resource repositoryNode = SimpleValueFactory.getInstance().createBNode();
        final Model model = new LinkedHashModel();
        repConfig.export(model, repositoryNode);
        return model;
    }

    /**
     * Serializes the provided {@link RepositoryConfig} as turtle and writes it to a
     * file into the specified object storage. The filename will be automatically
     * created using the repository configuration id.
     *
     * @param storage   Object storage into which the repository configuration
     *                  should serialized as turtle file.
     * @param repConfig
     * @param overwrite Whether to overwrite an existing configuration file with the
     *                  same id.
     * @throws RepositoryConfigException If invalid configuration is provided.
     * @throws IOException               If file already exists but the caller of
     *                                   this method as not explicitly specified to
     *                                   overwrite the file or in case of any other
     *                                   IO related exceptions.
     */
    public static void writeRepositoryConfigAsPrettyTurtleToFile(ObjectStorage storage, ObjectMetadata metadata,
            RepositoryConfig repConfig, boolean overwrite) throws RepositoryConfigException, IOException {
        writeModelAsPrettyTurtleToFile(storage, metadata, repConfig.getID(), exportConfigToModel(repConfig), overwrite);
    }

    private static void writeModelAsPrettyTurtleToFile(ObjectStorage storage, ObjectMetadata metadata, String repID,
            Model model, boolean overwrite) throws IOException {
        StoragePath objectId = getConfigObjectPath(repID);
        if (!overwrite) {
            Optional<ObjectRecord> existing = storage.getObject(objectId, null);
            if (existing.isPresent()) {
                throw new IOException(String.format(
                        "Repository configuration for \"%s\" already exists, but is not supposed to be overwritten by the method which is calling this function.",
                        repID));
            }
        }
        try (org.apache.commons.io.output.ByteArrayOutputStream os = new org.apache.commons.io.output.ByteArrayOutputStream()) {
            writeModelAsPrettyTurtleOutputStream(os, model);
            storage.appendObject(objectId, metadata, os.toInputStream(), os.size());
        }

    }

    private static void writeModelAsPrettyTurtleOutputStream(OutputStream os, Model model) {
        Map<String, String> prefixes = ImmutableMap.<String, String>builder()
                .put("rep", RepositoryConfigSchema.NAMESPACE).put("sail", SailConfigSchema.NAMESPACE)
                .put("sr", SailRepositorySchema.NAMESPACE).put("rdfs", RDFS.NAMESPACE)
                .put("mph", MpRepositoryVocabulary.NAMESPACE)
                .put("ephedra", MpRepositoryVocabulary.FEDERATION_NAMESPACE).put("fedsail", FederationConfig.NAMESPACE)
                .put("sparqlr", SPARQLRepositoryConfig.NAMESPACE).build();
        for (Entry<String, String> e : prefixes.entrySet()) {
            model.setNamespace(e.getKey(), e.getValue());
        }
        WriterConfig config = new WriterConfig();
        config.set(BasicWriterSettings.PRETTY_PRINT, true);
        config.set(BasicWriterSettings.INLINE_BLANK_NODES, true);
        Rio.write(model, os, RDFFormat.TURTLE, config);
    }

    /**
     * Scans the storage for turtle configuration files at "repositories/*.ttl" and
     * tries to read and parse the files as {@link RepositoryConfig}s. It does some
     * consistency checking:
     * <ul>
     * <li>file names must be valid repository IDs i.e. only alpha-numerical
     * characters are allowed</li>
     * <li>file names must be equal to the repository configuration id as stated
     * within the turtle configuration</li>
     * <li>configuration must be valid</li>
     * </ul>
     * Exceptions to these rules will be logged i.e. the method only returns a map
     * of repository configuration id and valid repository configuration objects
     * respectively.
     */
    public static Map<String, RepositoryConfig> readInitialRepositoryConfigsFromStorage(PlatformStorage platformStorage)
            throws IOException {
        Map<String, RepositoryConfig> map = Maps.newHashMap();

        List<ObjectRecord> turtleFiles = platformStorage.findAll(REPOSITORIES_OBJECT_PREFIX).values().stream()
                .map(result -> result.getRecord()).filter(record -> record.getPath().hasExtension(".ttl"))
                .collect(Collectors.toList());

        for (ObjectRecord configFile : turtleFiles) {
            try {
                String fileNameId = getRepositoryIdFromPath(configFile.getPath());
                Model model = readTurtleRepositoryConfigFile(configFile);
                RepositoryConfig repConfig = createRepositoryConfig(model);
                if (!normalizeRepositoryConfigId(fileNameId).equals(fileNameId)) {
                    throw new RepositoryConfigException(String.format(
                            "File name of repository configuration file \"%s\" contains characters that are not permitted. Please use only alpha-numerical characters.",
                            fileNameId));
                }

                if (!fileNameId.equals(repConfig.getID())) {
                    throw new RepositoryConfigException(String.format(
                            "Name of repository configuration file is \"%s\", but need to be equal to the repository id as specified in the configuration (repositoryID=\"%s\").",
                            fileNameId, repConfig.getID()));
                }
                map.put(repConfig.getID(), repConfig);
            } catch (IOException | RepositoryConfigException e) {
                logger.warn("Error while creating the repository config object from the configuration model:{}",
                        e.getMessage());
            }
        }

        return map;
    }

    private static Model readTurtleRepositoryConfigFile(ObjectRecord record) throws IOException {
        try (InputStream in = record.getLocation().readContent()) {
            return Rio.parse(in, "", RDFFormat.TURTLE);
        } catch (IOException e) {
            throw new IOException("Error while reading repository configuration file from file system: ", e);
        }
    }
}
