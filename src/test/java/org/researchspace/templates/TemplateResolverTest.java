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

package org.researchspace.templates;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.junit.Test;
import org.junit.Before;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.services.storage.api.*;

import java.util.*;

import static org.junit.Assert.*;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for TemplateResolver.
 */
public class TemplateResolverTest {
    
    @Mock
    private NamespaceRegistry namespaceRegistry;
    
    @Mock
    private PlatformStorage storage;
    
    @Mock
    private PlatformStorage.FindResult findResult;
    
    private TemplateResolver resolver;
    private ValueFactory vf;
    
    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        resolver = new TemplateResolver();
        vf = SimpleValueFactory.getInstance();
        
        // Setup common mock behaviors
        when(namespaceRegistry.getDefaultNamespace()).thenReturn("http://example.org/");
        when(namespaceRegistry.resolveToIRI("test:Person"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Person")));
        when(namespaceRegistry.getPrefix("http://test.org/resource/"))
            .thenReturn(Optional.of("test"));
        
        // Mock resolveToIRI to return empty for unknown prefixes
        when(namespaceRegistry.resolveToIRI(anyString())).thenReturn(Optional.empty());
        // Override specific known prefixes
        when(namespaceRegistry.resolveToIRI("test:Person"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Person")));
        when(namespaceRegistry.resolveToIRI("test:Actor"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Actor")));
    }
    
    @Test
    public void testResolve_WithNullInputs() {
        // Test null location
        Optional<PlatformStorage.FindResult> result = resolver.resolve(null, namespaceRegistry, storage);
        assertFalse(result.isPresent());
        
        // Test empty location
        result = resolver.resolve("", namespaceRegistry, storage);
        assertFalse(result.isPresent());
        
        // Test null namespace registry
        result = resolver.resolve("test:Person", null, storage);
        assertFalse(result.isPresent());
        
        // Test null storage
        result = resolver.resolve("test:Person", namespaceRegistry, null);
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testResolve_DirectPathSuccess() throws Exception {
        String location = "test:Person";
        
        // Mock direct path lookup success
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.of(findResult));
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
        verify(storage, atLeastOnce()).findObject(any(StoragePath.class));
    }
    
    @Test
    public void testResolve_FallbackToHierarchicalSearch() throws Exception {
        String location = "test:Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search success
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("subfolder/test:Person.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
        verify(storage).findAll(ObjectKind.TEMPLATE);
    }
    
    @Test
    public void testResolve_IriEncodedTemplate() throws Exception {
        String location = "http://example.org/resource/Test";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with IRI-encoded template
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("http%3A%2F%2Fexample.org%2Fresource%2FTest.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_TemplatePrefix() throws Exception {
        String location = "Template:test:Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search success
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("test:Person.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_SubfolderTemplate() throws Exception {
        String location = "test:Actor";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with template in subfolder
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("subfolder/forms/test:Actor.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_NotFound() throws Exception {
        String location = "test:NonExistent";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock empty hierarchical search
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(new HashMap<>());
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testResolve_StorageException() throws Exception {
        String location = "test:Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock storage exception during hierarchical search
        when(storage.findAll(ObjectKind.TEMPLATE)).thenThrow(new StorageException("Test exception"));
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testResolve_MixedTemplateFormats() throws Exception {
        String location = "test:Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with mixed template formats
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        allTemplates.put(StoragePath.parse("http%3A%2F%2Fexample.org%2Fresource%2FTest1.html"), mock(PlatformStorage.FindResult.class));
        allTemplates.put(StoragePath.parse("test:Test2.html"), mock(PlatformStorage.FindResult.class));
        allTemplates.put(StoragePath.parse("subfolder/http%3A%2F%2Fexample.org%2Fresource%2FTest4.html"), mock(PlatformStorage.FindResult.class));
        allTemplates.put(StoragePath.parse("subfolder/forms/test:Person.html"), findResult); // This should match
        
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_IriToPrefix_Conversion() throws Exception {
        String location = "http://test.org/resource/Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with prefixed template
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("test:Person.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_PrefixToIri_Conversion() throws Exception {
        String location = "test:Person";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with IRI-encoded template
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("http%3A%2F%2Ftest.org%2Fresource%2FPerson.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
    
    @Test
    public void testResolve_SimpleNameWithDefaultNamespace() throws Exception {
        String location = "SimpleName";
        
        // Mock direct path lookup failure
        when(storage.findObject(any(StoragePath.class))).thenReturn(Optional.empty());
        
        // Mock hierarchical search with template using default namespace
        Map<StoragePath, PlatformStorage.FindResult> allTemplates = new HashMap<>();
        StoragePath templatePath = StoragePath.parse("http%3A%2F%2Fexample.org%2FSimpleName.html");
        allTemplates.put(templatePath, findResult);
        when(storage.findAll(ObjectKind.TEMPLATE)).thenReturn(allTemplates);
        
        Optional<PlatformStorage.FindResult> result = resolver.resolve(location, namespaceRegistry, storage);
        
        assertTrue(result.isPresent());
        assertEquals(findResult, result.get());
    }
}