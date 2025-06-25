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

import java.util.Optional;

import static org.junit.Assert.*;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TemplateByIriLoader.
 */
public class TemplateByIriLoaderTest {
    
    @Mock
    private PlatformStorage storage;
    
    @Mock
    private NamespaceRegistry namespaceRegistry;
    
    @Mock
    private PlatformStorage.FindResult findResult;
    
    private TemplateByIriLoader loader;
    private ValueFactory vf;
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        vf = SimpleValueFactory.getInstance();
        loader = new TemplateByIriLoader(storage, namespaceRegistry);
        
        // Setup common mock behaviors
        when(namespaceRegistry.getDefaultNamespace()).thenReturn("http://example.org/");
        when(namespaceRegistry.resolveToIRI("test:Person"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Person")));
    }
    
    @Test
    public void testTemplatePathFromIri() {
        IRI templateIri = vf.createIRI("http://example.org/resource/Test");
        StoragePath result = TemplateByIriLoader.templatePathFromIri(templateIri);
        
        assertNotNull(result);
        assertTrue(result.toString().endsWith(".html"));
        assertTrue(result.toString().contains("http%3A%2F%2Fexample.org%2Fresource%2FTest"));
    }
    
    @Test
    public void testTemplateIriFromPath_RootLevel_IriEncoded() {
        StoragePath path = StoragePath.parse("data/templates/http%3A%2F%2Fexample.org%2Fresource%2FTest.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertTrue(result.isPresent());
        assertEquals("http://example.org/resource/Test", result.get().stringValue());
    }
    
    @Test
    public void testTemplateIriFromPath_RootLevel_PrefixedName() {
        StoragePath path = StoragePath.parse("data/templates/test:Person.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        // Prefixed names cannot be decoded to IRIs, should return empty
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_Subfolder_IriEncoded() {
        StoragePath path = StoragePath.parse("data/templates/subfolder/http%3A%2F%2Fexample.org%2Fresource%2FTest.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertTrue(result.isPresent());
        assertEquals("http://example.org/resource/Test", result.get().stringValue());
    }
    
    @Test
    public void testTemplateIriFromPath_Subfolder_PrefixedName() {
        StoragePath path = StoragePath.parse("data/templates/subfolder/forms/test:Person.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        // Prefixed names cannot be decoded to IRIs, should return empty
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_DeepNested_IriEncoded() {
        StoragePath path = StoragePath.parse("data/templates/deep/nested/folder/http%3A%2F%2Fexample.org%2Fresource%2FDeep.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertTrue(result.isPresent());
        assertEquals("http://example.org/resource/Deep", result.get().stringValue());
    }
    
    @Test
    public void testTemplateIriFromPath_NonHtmlFile() {
        StoragePath path = StoragePath.parse("data/templates/test:Person.txt");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_NullPath() {
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(null);
        
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_InvalidPath() {
        StoragePath path = StoragePath.parse("not-templates/test:Person.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        // Should return empty if not under templates directory
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_TemplatePrefix() {
        StoragePath path = StoragePath.parse("data/templates/Template%3Ahttp%3A%2F%2Fexample.org%2Fresource%2FTest.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertTrue(result.isPresent());
        assertEquals("Template:http://example.org/resource/Test", result.get().stringValue());
    }
    
    @Test
    public void testTemplateIriFromPath_ComplexIri() {
        String complexIri = "http://example.org/resource/Test?param=value&other=123";
        String encodedIri = "http%3A%2F%2Fexample.org%2Fresource%2FTest%3Fparam%3Dvalue%26other%3D123";
        StoragePath path = StoragePath.parse("data/templates/" + encodedIri + ".html");
        
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        assertTrue(result.isPresent());
        assertEquals(complexIri, result.get().stringValue());
    }
    
    @Test
    public void testTemplateIriFromPath_InvalidIriEncoding() {
        // Test with invalid URL encoding that can't be decoded
        StoragePath path = StoragePath.parse("data/templates/invalid%encoding.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        
        // Should handle gracefully and return empty
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testTemplateIriFromPath_EdgeCases() {
        // Test empty filename
        StoragePath path = StoragePath.parse("data/templates/.html");
        Optional<IRI> result = TemplateByIriLoader.templateIriFromPath(path);
        assertFalse(result.isPresent());
        
        // Test filename with only extension
        path = StoragePath.parse("data/templates/subfolder/.html");
        result = TemplateByIriLoader.templateIriFromPath(path);
        assertFalse(result.isPresent());
    }
    
    @Test
    public void testResolveLocation() {
        // This tests the protected method indirectly through the loader's behavior
        // The actual template resolution is handled by TemplateResolver
        // so we just verify the path construction works
        
        StoragePath result = loader.resolveLocation("test:Person");
        assertNotNull(result);
        assertTrue(result.toString().endsWith(".html"));
    }
    
    @Test
    public void testTemplatePathFromIri_StaticMethod() {
        // Test the static utility method
        IRI templateIri = vf.createIRI("Template:http://example.org/resource/Test");
        StoragePath result = TemplateByIriLoader.templatePathFromIri(templateIri);
        
        assertNotNull(result);
        assertTrue(result.toString().endsWith(".html"));
        assertTrue(result.toString().contains("Template%3Ahttp%3A%2F%2Fexample.org%2Fresource%2FTest"));
    }
}