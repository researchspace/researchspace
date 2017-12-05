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

package com.metaphacts.data.rdf.container;

import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.inject.Inject;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.reflections.Reflections;
import org.reflections.vfs.Vfs;
import org.reflections.scanners.SubTypesScanner;
import org.reflections.scanners.TypeAnnotationsScanner;
import org.reflections.util.ClasspathHelper;
import org.reflections.util.ConfigurationBuilder;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.google.inject.Injector;
import com.metaphacts.vocabulary.LDP;



/**
 * 
 * TODO replace by META-INF service loader?
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class LDPImplManager {
    
    private static final Logger logger = LogManager.getLogger(LDPImplManager.class);
    
    private static final Map<IRI,Class<? extends LDPContainer>> knownContainerImplementations = listLDPContainerImplementations();
    private static final Map<IRI,Class<? extends LDPResource>> knownResourceImplementations = listLDPImplementations();
    
    @Inject
    private static Injector injector;
    
    public static LDPResource getLDPImplementation(IRI iri, Set<IRI> types, Repository repository) throws Exception{
        Class<? extends LDPResource> cl = null;
        if(knownContainerImplementations.containsKey(iri))
            cl=knownContainerImplementations.get(iri);
        else
            cl = isContainer(iri, types) ? getContainerImplementation(iri, types) : getResourceImplementation(iri, types);
            
        logger.trace("Selected implementation for LDP Container: " + cl);
        try {
            @SuppressWarnings("unchecked")
            Constructor<LDPResource> cons = (Constructor<LDPResource>) cl.getConstructor(IRI.class, Repository.class);
            LDPResource instance = cons.newInstance(iri, repository);
            injector.injectMembers(instance);
            if(LDPContainer.class.isAssignableFrom(instance.getClass())){
                ((LDPContainer)instance).initialize();
            }
            return instance;
        } catch (InstantiationException | IllegalAccessException
                | IllegalArgumentException | InvocationTargetException
                | NoSuchMethodException | SecurityException e) {
            throw e;
        }
    }
    
    private static boolean isContainer(IRI iri, Set<IRI> types){
        boolean b = RootContainer.IRI.equals(iri) || !Collections.disjoint(types, Sets.newHashSet(LDP.Container, LDP.BasicContainer, LDP.DirectContainer));
        if(logger.isTraceEnabled()) logger.trace("Resource is a LDP Container: "+b );
        return b;
    }
    
    private static Class<? extends LDPResource> getContainerImplementation(IRI iri, Set<IRI> types){
        Class<? extends LDPContainer> impl = knownContainerImplementations.containsKey(iri) ? knownContainerImplementations.get(iri) : null;
        if(impl!=null)
            return impl;
        for(Resource r : types){
            if(knownContainerImplementations.containsKey(r)) return knownContainerImplementations.get(r);
        }
        return DefaultLDPContainer.class;
     }
     
     private static Class<? extends LDPResource> getResourceImplementation(IRI iri, Set<IRI> types){
         for(Resource r : types){
             if(knownResourceImplementations.containsKey(r)) return knownResourceImplementations.get(r);
         }
         return DefaultLDPResource.class;
     }
     
     @SuppressWarnings("unchecked")
     private static Map<IRI,Class<? extends LDPResource>> listLDPImplementations(){
         ValueFactory vf =  SimpleValueFactory.getInstance();
         Map<IRI,Class<? extends LDPResource>> known = Maps.newHashMap();
         Set<Class<?>> classes = findLdpImpls();
         for (Class<?> cl : classes) {
             Annotation a = cl.getAnnotation(LDPR.class);
             if (LDPResource.class.isAssignableFrom(cl) && !LDPContainer.class.isAssignableFrom(cl))
                 known.put(vf.createIRI(((LDPR) a).iri()), (Class<? extends LDPResource>) cl);
             
         }
         logger.debug("Found the following LDP resource implementations : " + known);
         return known;
     }

     @SuppressWarnings("unchecked")
     private static Map<IRI,Class<? extends LDPContainer>> listLDPContainerImplementations(){
         ValueFactory vf =  SimpleValueFactory.getInstance();
         Map<IRI,Class<? extends LDPContainer>> known = Maps.newHashMap();
         Set<Class<?>> classes = findLdpImpls();
         for (Class<?> cl : classes) {
            Annotation a = cl.getAnnotation(LDPR.class);
            if (LDPContainer.class.isAssignableFrom(cl))
                known.put(vf.createIRI(((LDPR) a).iri()), (Class<? extends LDPContainer>) cl);
         }
         logger.debug("Found the following LDP container implementations : " + known);
         return known;
     }
     
    private static Set<Class<?>> findLdpImpls() {
        registerUrlTypes();
        ConfigurationBuilder builder = new ConfigurationBuilder().setUrls(ClasspathHelper.forClass(LDPResource.class))
            .addUrls(ClasspathHelper.forClassLoader())
            .setScanners(new SubTypesScanner(), new TypeAnnotationsScanner());
        return new Reflections(builder).getTypesAnnotatedWith(LDPR.class);
    }

    /**
     * Workaround for Reflection related warning on OS X.
     * 
     * @see https://gist.github.com/nonrational/287ed109bb0852f982e8
     * @see https://github.com/ronmamo/reflections/issues/80
     */
    private static void registerUrlTypes() {
        final List<Vfs.UrlType> urlTypes = Lists.newArrayList();
        urlTypes.add(new EmptyIfFileEndingsUrlType(".jnilib"));
        urlTypes.addAll(Arrays.asList(Vfs.DefaultUrlTypes.values()));
        Vfs.setDefaultURLTypes(urlTypes);
    }

    private static class EmptyIfFileEndingsUrlType implements Vfs.UrlType {

        private final List<String> fileEndings;

        private EmptyIfFileEndingsUrlType(final String... fileEndings) {
            this.fileEndings = Lists.newArrayList(fileEndings);
        }

        public boolean matches(URL url) {

            final String protocol = url.getProtocol();
            final String externalForm = url.toExternalForm();
            if (!protocol.equals("file")) {
                return false;
            }
            for (String fileEnding : fileEndings) {
                if (externalForm.endsWith(fileEnding)) {
                    return true;
                }
            }
            return false;
        }

        public Vfs.Dir createDir(final URL url) throws Exception {
            return emptyVfsDir(url);
        }

        private static Vfs.Dir emptyVfsDir(final URL url) {
            return new Vfs.Dir() {
                @Override
                public String getPath() {
                    return url.toExternalForm();
                }

                @Override
                public Iterable<Vfs.File> getFiles() {
                    return Collections.emptyList();
                }

                @Override
                public void close() {
                }
            };
        }
    }
}
