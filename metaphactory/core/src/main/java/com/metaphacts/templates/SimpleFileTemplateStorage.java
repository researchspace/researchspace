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

package com.metaphacts.templates;

import static com.google.common.base.Preconditions.checkNotNull;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.google.common.base.Charsets;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

/**
 * Most simple implementation of a {@link TemplateStorage} where each resource
 * maps directly to an file without any revision or meta-data handling.
 * 
 * Johannes Trame <jt@metaphacts.com>
 */
public class SimpleFileTemplateStorage extends AbstractFileTemplateStorage<Long, URL> {
    
    private final static Logger logger = LogManager.getLogger(SimpleFileTemplateStorage.class);

    private final File baseStorageFolder;
    
    public SimpleFileTemplateStorage(File baseStorageFolder){
        this.baseStorageFolder = baseStorageFolder;
        logger.info("Initalized simple file based template storage with base storage location: "
                + baseStorageFolder.getAbsolutePath()
          );
    }
    
    @Override
    public Optional<String> getTemplateContent(IRI iri) throws IOException {
        return getTemplateContent(iri,null);
    }

    @Override
    public Optional<String> getTemplateContent(IRI iri, Long revision) throws IOException {
       Optional<URL> url = this.getTemplateLocation(iri, revision);
       if(!url.isPresent()){
           return Optional.<String>empty();
       }
       
        try {
            File file = new File(url.get().toURI());
            return Optional.ofNullable(FileUtils.readFileToString(file, StandardCharsets.UTF_8));
        } catch (URISyntaxException e ) {
           throw new IOException(e);
        }
    }

    @Override
    public Optional<URL> getTemplateLocation(IRI iri) throws IOException {
        return this.getTemplateLocation(iri, null);
    }

    @Override
    public Optional<URL> getTemplateLocation(IRI iri, Long revision) throws IOException{
       File f = this.getTemplateFile(iri);
       if(f.exists()){
           return Optional.of(f.toURI().toURL());
       }

       return Optional.<URL>empty();
    }

    @Override
    public synchronized Long storeNewRevision(IRI iri, String rawContent) throws IOException {
        checkNotNull(iri, "IRI for storing new template revision must not be null.");
        if(StringUtils.isEmpty(rawContent)){
            deleteTemplate(iri);
            return new Date().getTime();
        }else{
            File file = getTemplateFile(iri);
            IOUtils.write(rawContent, new FileOutputStream(file), StandardCharsets.UTF_8);
            return file.lastModified();
        }
    }
    
    private File getTemplateFile(IRI iri) throws UnsupportedEncodingException{
        return new File(baseStorageFolder,normalize(iri)+"."+SUFFIX);
    }

    @Override
    public SortedMap<Long, URL> getRevisions(IRI iri) throws IOException {
        TreeMap<Long, URL> map = Maps.newTreeMap();
        File file = getTemplateFile(iri);
        if(file.exists())
            map.put(file.lastModified(), file.toURI().toURL());
        return map;
    }

    @Override
    public Set<IRI> getAllStoredTemplates() throws IOException {
        String[] templates = baseStorageFolder.list(new FilenameFilter() {
            @Override
            public boolean accept(File current, String name) {
              return new File(current, name).isFile() && name.endsWith(SUFFIX);
            }
          });
        Set<IRI> set = Sets.newHashSet();
        ValueFactory vf = SimpleValueFactory.getInstance();
        for(String s:templates){
            // TODO
            set.add(vf.createIRI(URLDecoder.decode(StringUtils.removeEnd(s, "."+SUFFIX),  Charsets.UTF_8.name())));
        }
        return set;
    }

    @Override
    public void deleteTemplate(IRI iri) throws IOException {
        File file = this.getTemplateFile(iri);
        if(!file.exists()) return;
        
        FileUtils.deleteQuietly(file);
    }

    @Override
    public File getBaseDir() {
        return this.baseStorageFolder;
    }
    

}