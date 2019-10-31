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

package com.metaphacts.repository;

import static com.metaphacts.junit.MpMatchers.hasItemsInOrder;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.repository.config.AbstractRepositoryImplConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.repository.config.RepositoryImplConfig;
import org.eclipse.rdf4j.repository.sail.config.SailRepositoryConfig;
import org.eclipse.rdf4j.sail.config.AbstractSailImplConfig;
import org.eclipse.rdf4j.sail.config.SailImplConfig;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * Checks the {@link RepositoryDependencySorter} functionalities.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class RepositoryDependencySorterTest {
    
    private static class DummyRepoNoDepsConfig extends AbstractRepositoryImplConfig {
        
    }
    
    private static class DummyRepoWithDepsConfig 
            extends AbstractRepositoryImplConfig 
            implements MpDelegatingImplConfig {

        private final List<String> delegates;
        
        public DummyRepoWithDepsConfig(List<String> delegates) {
            this.delegates = Lists.newArrayList(delegates);
        }
        
        @Override
        public Collection<String> getDelegateRepositoryIDs() {
            return delegates;
        }
    }
    
    private static class DummySailWithDepsConfig 
            extends AbstractSailImplConfig 
            implements MpDelegatingImplConfig {
        
        private final List<String> delegates;
        
        public DummySailWithDepsConfig(List<String> delegates) {
            this.delegates = Lists.newArrayList(delegates);
        }

        @Override
        public Collection<String> getDelegateRepositoryIDs() {
            return delegates;
        }
        
    }
    
    @Rule
    public ExpectedException exceptionGrabber = ExpectedException.none();
    

    public RepositoryDependencySorterTest() {
        // TODO Auto-generated constructor stub
    }
    
    private RepositoryConfig createTestRepoNoDepsConfig(String name) {
        RepositoryImplConfig impl = new DummyRepoNoDepsConfig();
        RepositoryConfig res = new RepositoryConfig(name, impl);
        return res;
    }
    
    private RepositoryConfig createTestRepoWithDepsConfig(
            String name, List<String> dependencyNames) {
        RepositoryImplConfig impl = new DummyRepoWithDepsConfig(dependencyNames);
        RepositoryConfig res = new RepositoryConfig(name, impl);
        return res;
    }
    
    private RepositoryConfig createTestSailRepoConfig(String name, List<String> dependencyNames) {
        SailImplConfig sailImpl = new DummySailWithDepsConfig(dependencyNames);
        RepositoryImplConfig impl = new SailRepositoryConfig(sailImpl);
        RepositoryConfig res = new RepositoryConfig(name, impl);
        return res;
    }
    
    private void addRepo(Map<String, RepositoryConfig> map, String name, String ... deps) {
        List<String> depList = Arrays.asList(deps);
        if (depList.isEmpty()) {
            map.put(name, createTestRepoNoDepsConfig(name));
        } else {
            map.put(name, createTestRepoWithDepsConfig(name, depList));
        }
    }
    
    private void addSailRepo(Map<String, RepositoryConfig> map, String name, String ... deps) {
        List<String> depList = Arrays.asList(deps);
        if (depList.isEmpty()) {
            map.put(name, createTestRepoNoDepsConfig(name));
        } else {
            map.put(name, createTestSailRepoConfig(name, depList));
        }
    }
    
    @Test
    public void testSimpleDependency() throws Exception {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // second <- first
        addRepo(originals, "first");
        addRepo(originals, "second", "first");
        
        Map<String, RepositoryConfig> sorted = RepositoryDependencySorter.sortConfigs(originals);
        assertEquals(
                Lists.newArrayList("first", "second"), Lists.newArrayList(sorted.keySet()));
    }
    
    @Test
    public void testSimpleDependencyChangedOrder() throws Exception {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // second <- first
        addRepo(originals, "second", "first");
        addRepo(originals, "first");
        
        Map<String, RepositoryConfig> sorted = RepositoryDependencySorter.sortConfigs(originals);
        assertEquals(
                Lists.newArrayList("first", "second"), Lists.newArrayList(sorted.keySet()));
    }
    
    @Test
    public void testSimpleDependencyViaSail() throws Exception {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // second <- first
        addRepo(originals, "first");
        addSailRepo(originals, "second", "first");
        
        Map<String, RepositoryConfig> sorted = RepositoryDependencySorter.sortConfigs(originals);
        assertEquals(
                Lists.newArrayList("first", "second"), Lists.newArrayList(sorted.keySet()));
    }
    
    @Test
    public void testSimpleLoop() throws Exception {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // first <- second
        // second <- first
        addRepo(originals, "first", "second");
        addRepo(originals, "second", "first");
        
        exceptionGrabber.expect(RepositoryConfigException.class);
        RepositoryDependencySorter.sortConfigs(originals);
    }
    
    @Test
    public void testLoopOfThree() throws Exception {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // second <- first
        // third <- second
        // first <- third
        addRepo(originals, "first", "third");
        addRepo(originals, "second", "first");
        addRepo(originals, "third", "second");
        
        exceptionGrabber.expect(RepositoryConfigException.class);
        RepositoryDependencySorter.sortConfigs(originals);
    }
    
    @Test
    public void testTree() {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // fourth <- third <- second
        // third <- first
        addRepo(originals, "fourth", "third");
        addRepo(originals, "first");
        addRepo(originals, "third", "first", "second");
        addRepo(originals, "second");
        
        Map<String, RepositoryConfig> sorted = RepositoryDependencySorter.sortConfigs(originals);
        assertThat(Lists.newArrayList(sorted.keySet()), 
                hasItemsInOrder("first", "third", "fourth"));
        assertThat(Lists.newArrayList(sorted.keySet()), 
                hasItemsInOrder("second", "third", "fourth"));
    }
    
    @Test
    public void testMultipleRoutes() {
        Map<String, RepositoryConfig> originals = Maps.newLinkedHashMap();
        // fourth <- third <- first
        // fourth <- second <- first
        addRepo(originals, "fourth", "third", "second");
        addRepo(originals, "first");
        addRepo(originals, "third", "first");
        addRepo(originals, "second", "first");
        
        Map<String, RepositoryConfig> sorted = RepositoryDependencySorter.sortConfigs(originals);
        assertThat(Lists.newArrayList(sorted.keySet()), 
                hasItemsInOrder("first", "third", "fourth"));
        assertThat(Lists.newArrayList(sorted.keySet()), 
                hasItemsInOrder("first", "second", "fourth"));
    }

}