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

package com.metaphacts.data.rdf.container;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

import javax.inject.Inject;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.google.common.base.Throwables;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.google.inject.Injector;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ClassInfo;
import io.github.classgraph.ClassInfoList;
import io.github.classgraph.ScanResult;

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
    
    public static LDPResource getLDPImplementation(IRI iri, Set<IRI> types, MpRepositoryProvider repositoryProvider) {
        Class<? extends LDPResource> cl = null;
        if(knownContainerImplementations.containsKey(iri))
            cl=knownContainerImplementations.get(iri);
        else
            cl = isContainer(iri, types) ? getContainerImplementation(iri, types) : getResourceImplementation(iri, types);
            
        logger.trace("Selected implementation for LDP Container: " + cl);
        try {
            @SuppressWarnings("unchecked")
            Constructor<LDPResource> cons = (Constructor<LDPResource>) cl.getConstructor(IRI.class, MpRepositoryProvider.class);
            LDPResource instance = cons.newInstance(iri, repositoryProvider);
            injector.injectMembers(instance);
            if(LDPContainer.class.isAssignableFrom(instance.getClass())){
                ((LDPContainer)instance).initialize();
            }
            return instance;
        } catch (InstantiationException | IllegalAccessException
                | IllegalArgumentException | InvocationTargetException
                | NoSuchMethodException | SecurityException e) {
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
        }
    }
    
    public static boolean isKnownContainer(IRI iri) {
        return knownContainerImplementations.containsKey(iri);
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
         Set<Class<?>> classes = findLdpImplementations(classInfo ->
             classInfo.implementsInterface(LDPResource.class.getName()) &&
             !classInfo.implementsInterface(LDPContainer.class.getName())
         );
         for (Class<?> cl : classes) {
             LDPR a = cl.getAnnotation(LDPR.class);
             known.put(vf.createIRI(a.iri()), (Class<? extends LDPResource>) cl);
         }
         logger.trace("Found the following LDP resource implementations: " + known);
         return known;
     }

     @SuppressWarnings("unchecked")
     private static Map<IRI,Class<? extends LDPContainer>> listLDPContainerImplementations(){
         ValueFactory vf =  SimpleValueFactory.getInstance();
         Map<IRI,Class<? extends LDPContainer>> known = Maps.newHashMap();
         Set<Class<?>> classes = findLdpImplementations(classInfo ->
             classInfo.implementsInterface(LDPContainer.class.getName())
         );
         for (Class<?> cl : classes) {
            LDPR a = cl.getAnnotation(LDPR.class);
            known.put(vf.createIRI(a.iri()), (Class<? extends LDPContainer>) cl);
         }
         logger.trace("Found the following LDP container implementations: " + known);
         return known;
     }
     
    private static Set<Class<?>> findLdpImplementations(Predicate<ClassInfo> filter) {
        ClassGraph classGraph = new ClassGraph()
            .enableClassInfo()
            .enableAnnotationInfo()
            .overrideClassLoaders(LDPImplManager.class.getClassLoader());

        Set<Class<?>> ldpClasses = new HashSet<>();

        try (ScanResult scanResult = classGraph.scan()) {
            ClassInfoList classes = scanResult.getClassesWithAnnotation(LDPR.class.getName());
            for (ClassInfo classInfo : classes) {
                if (filter.test(classInfo)) {
                    ldpClasses.add(classInfo.loadClass());
                }
            }
        }

        return ldpClasses;
    }
}
