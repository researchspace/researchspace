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

package com.metaphacts.repository;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryConfigSchema;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.WriterConfig;
import org.eclipse.rdf4j.rio.helpers.BasicWriterSettings;

import com.google.common.collect.Maps;

/**
 * Collection of static utilities mainly around reading, parsing and serializing
 * {@link RepositoryConfig} <-> {@link Model} <-> turtle files.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class RepositoryConfigUtils {
    private static final Logger logger = LogManager.getLogger(RepositoryConfigUtils.class);
    
    /**
     * Tries to convert an RDF graph i.e. the specified {@link Model} into a
     * {@link RepositoryConfig} object.
     * 
     * @param model
     * @return
     * @throws RepositoryConfigException
     *             If the supplied graph can not be converted into a VALID
     *             {@link RepositoryConfig}
     */
    public static RepositoryConfig createRepositoryConfig(Model model) throws RepositoryConfigException {
        Model idStmt = model.filter(null, RepositoryConfigSchema.REPOSITORYID, null);
        Optional<Resource> repositoryNode = Models.subject(
                idStmt  
        );

        if (idStmt.size() != 1 || !repositoryNode.isPresent()){
            throw new RepositoryConfigException("Repository configuration model must have exactly one reposiotry id.");
        }

        return RepositoryConfig.create(model, repositoryNode.get());
    }
    
    
    /**
     * Tries to find and parse the repository configuration file for the
     * specified repository id within the specified folder. The assumption is
     * that the base file name of the turtle file is equal to the specified
     * repository id. If such file exists, it must meet the following condition:
     * <ul>
     * <li>file names must be equal to the repository configuration id as stated
     * within the turtle configuration</li>
     * <li>configuration must be valid</li>
     * </ul>
     * Respective exceptions will be thrown.
     * 
     * @param folder
     * @param repID
     * @return
     * @throws IllegalArgumentException If no repository configuration file with such id can be found
     * @throws RepositoryConfigException If the repository configuration is not valid
     * @throws IOException If the configuration file not not be read
     */
    public static RepositoryConfig readRepositoryConfigurationFile(File folder, String repID) throws IllegalArgumentException, RepositoryConfigException, IOException{
        final File configFile = getConfigFile(folder, repID);
        
        if(! configFile.exists()){
            throw new IllegalArgumentException(
                    String.format(
                            "Repository configuration file with id \"%s\" does not exist.",
                            configFile.getName()));
        }
        
        RepositoryConfig repConfig = createRepositoryConfig(readTurtleRepositoryConfigFile(configFile));
        
        final String fileNameId = FilenameUtils.getBaseName(configFile.getName());
        if(! fileNameId.equals(repConfig.getID()) ){
            throw new RepositoryConfigException(
                    String.format(
                            "Name of repository configuration file is \"%s\", but need to be equal to the repository id as specified in the configuration (repositoryID=\"%s\").",
                            fileNameId, repConfig.getID()));
        }
        repConfig.validate();
        return repConfig;
    }
    
    // regex pattern to normalize config file name to only alpha-numerical characters
    private static final Pattern configFilePattern = Pattern.compile("[^a-zA-Z0-9.-]"); 
    
    private static String normalizeRepositoryConfigId(final String repID){
        return configFilePattern.matcher(repID).replaceAll("-");
    }
    
    private static File getConfigFile(final File folder, final String repID){
        if(StringUtils.isEmpty(repID)){
            throw new IllegalArgumentException("Repository config id must not be null.");
        }
        
        return new File(folder, normalizeRepositoryConfigId(repID) + ".ttl");
    }
    
    /**
     * Serializes the provided {@link RepositoryConfig} as "pretty" turtle string
     * @param repConfig
     * @return
     * @throws IOException
     * @throws RepositoryConfigException
     */
    public static String convertRepositoryConfigToPrettyTurtleString(RepositoryConfig repConfig) throws IOException, RepositoryConfigException{
        return convertModelToPrettyTurtleString(
                exportConfigToModel(repConfig)
               );
    }
    
    private static String convertModelToPrettyTurtleString(Model model) throws IOException, RepositoryConfigException{
        try(ByteArrayOutputStream baos = new ByteArrayOutputStream()){
            writeModelAsPrettyTurtleOutputStream(baos, model);
            return baos.toString();
        }
    }
    
    /**
     * Converts the provided {@link RepositoryConfig} into a collection of RDF
     * statements i.e. a {@link Model}. Normalized the repository config id to
     * alpha-numerical characters and calls validate before converting the
     * config i.e. to prevent serialization of invalid configurations.
     * 
     * @param repConfig
     * @return
     * @throws RepositoryConfigException
     */
    private static Model exportConfigToModel(RepositoryConfig repConfig) throws RepositoryConfigException{
        /* prevent invalid configurations from being serialized */
        repConfig.validate();

        /* normalize repository config id */
        repConfig.setID(normalizeRepositoryConfigId(repConfig.getID()));

        final Model model = new LinkedHashModel();
        repConfig.export(model);
        return model;
    }
    
    /**
     * Serializes the provided {@link RepositoryConfig} as turtle and writes it
     * to a file into the specified folder. The filename will be automatically
     * created using the repository configuration id.
     * 
     * @param folder The FOLDER into which the repository configuration should serialized as turtle file.
     * @param repConfig
     * @param overwrite Whether to overwrite an existing configuration file with the same id.
     * @throws RepositoryConfigException
     *             If invalid configuration is provided.
     * @throws IOException
     *             If file already exists but the caller of this method as not
     *             explicitly specified to overwrite the file or in case of any
     *             other IO related exceptions.
     */
    public static void writeRepositoryConfigAsPrettyTurtleToFile(final File folder, final RepositoryConfig repConfig, final boolean overwrite) throws RepositoryConfigException, IOException{
        writeModelAsPrettyTurtleToFile(
                getConfigFile(folder, repConfig.getID()),
                exportConfigToModel(repConfig),
                overwrite
        );
    }
    
    private static void writeModelAsPrettyTurtleToFile(final File file, final Model model, final boolean overwrite) throws IOException{
        if (file.exists() && !overwrite) {
            throw new IOException(
                    String.format(
                            "Repository configuration file \"%s\" already exists, but is not supposed to be overwriten by the method which is calling this function.",
                            file.getName()));
        }
        writeModelAsPrettyTurtleOutputStream(new FileOutputStream(file), model);
    }
    
    private static void writeModelAsPrettyTurtleOutputStream(OutputStream os, Model model){
        WriterConfig config = new WriterConfig();
        config.set(BasicWriterSettings.PRETTY_PRINT, true);
        Rio.write(model, os, RDFFormat.TURTLE, config);
    }
    
    /**
     * Scans the provided folder for turtle files and tries to read and parse
     * the files as {@link RepositoryConfig}s. It does some consistency
     * checking:
     * <ul>
     * <li>file names must be valid repository IDs i.e. only alpha-numerical
     * characters are allowed</li>
     * <li>file names must be equal to the repository configuration id as stated
     * within the turtle configuration</li>
     * <li>configuration must be valid</li>
     * </ul>
     * Exceptions to these rules will be logged i.e. the method only returns a
     * map of repository configuration id and valid repository configuration
     * objects respectively .
     * 
     * @param folder
     * @return
     */
    public static Map<String, RepositoryConfig> readInitialRepositoryConfigsFromFileSystem(File folder){
        File[] turtleFiles = folder.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.endsWith(".ttl");
            }
        });
    
        Map<String, RepositoryConfig> map = Maps.newHashMap();
        
        for(File configFile: turtleFiles){
            try{
                final String fileNameId = FilenameUtils.getBaseName(configFile.getName());
                final Model model = readTurtleRepositoryConfigFile(configFile);
                RepositoryConfig repConfig = createRepositoryConfig(model);
                if( !normalizeRepositoryConfigId(fileNameId).equals(fileNameId)){
                    throw new RepositoryConfigException(
                            String.format(
                                    "File name of repository configuration file \"%s\" contains characters that are not permitted. Please use only alpha-numerical characters.",
                                    fileNameId
                                )
                    );
                }
                
                if( ! fileNameId.equals(repConfig.getID()) ){
                    throw new RepositoryConfigException(
                            String.format(
                                "Name of repository configuration file is \"%s\", but need to be equal to the repository id as specified in the configuration (repositoryID=\"%s\").",
                                fileNameId, repConfig.getID()
                            )
                    );
                }
                map.put(repConfig.getID(), repConfig);
            }catch(IOException | RepositoryConfigException e){
                logger.warn("Error while creating the repository config object from the configuration model:{}", e.getMessage());
            }
        }
        
        return map;
    }
    

    private static Model readTurtleRepositoryConfigFile(File file) throws IOException{
        try(FileInputStream in = new FileInputStream(file)){
             return Rio.parse(in , "", RDFFormat.TURTLE);
        } catch (IOException e) {
            new IOException("Error while reading repository configuration file from file system: " + e.getMessage());
        }
        return new LinkedHashModel();
    }
}