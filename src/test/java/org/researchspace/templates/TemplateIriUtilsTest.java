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
import org.researchspace.services.storage.api.StoragePath;

import java.util.Optional;

import static org.junit.Assert.*;
import static org.mockito.Matchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TemplateIriUtils utility class.
 */
public class TemplateIriUtilsTest {
    
    @Mock
    private NamespaceRegistry namespaceRegistry;
    
    private ValueFactory vf;
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        vf = SimpleValueFactory.getInstance();
        
        // Setup common mock behaviors
        when(namespaceRegistry.getDefaultNamespace()).thenReturn("http://example.org/");
        when(namespaceRegistry.resolveToIRI("test:Person"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Person")));
        when(namespaceRegistry.getPrefix("http://test.org/resource/"))
            .thenReturn(Optional.of("test"));
        
        // Mock resolveToIRI to return empty for unknown prefixes (like "SimpleName")
        when(namespaceRegistry.resolveToIRI(anyString())).thenReturn(Optional.empty());
        // Override specific known prefixes
        when(namespaceRegistry.resolveToIRI("test:Person"))
            .thenReturn(Optional.of(vf.createIRI("http://test.org/resource/Person")));
    }
    
    @Test
    public void testConstructTemplateIri_WithFullIri() {
        String location = "http://example.org/resource/Test";
        IRI result = TemplateIriUtils.constructTemplateIri(location, namespaceRegistry);
        
        assertEquals("http://example.org/resource/Test", result.stringValue());
    }
    
    @Test
    public void testConstructTemplateIri_WithPrefixedForm() {
        String location = "test:Person";
        IRI result = TemplateIriUtils.constructTemplateIri(location, namespaceRegistry);
        
        assertEquals("http://test.org/resource/Person", result.stringValue());
    }
    
    @Test
    public void testConstructTemplateIri_WithTemplatePrefix() {
        String location = "Template:http://example.org/resource/Test";
        IRI result = TemplateIriUtils.constructTemplateIri(location, namespaceRegistry);
        
        assertEquals("Template:http://example.org/resource/Test", result.stringValue());
    }
    
    @Test
    public void testConstructTemplateIri_WithTemplatePrefixedForm() {
        String location = "Template:test:Person";
        IRI result = TemplateIriUtils.constructTemplateIri(location, namespaceRegistry);
        
        assertEquals("Template:http://test.org/resource/Person", result.stringValue());
    }
    
    @Test
    public void testConstructTemplateIri_WithSimpleName() {
        String location = "SimpleName";
        IRI result = TemplateIriUtils.constructTemplateIri(location, namespaceRegistry);
        
        assertEquals("http://example.org/SimpleName", result.stringValue());
    }
    
    @Test(expected = IllegalArgumentException.class)
    public void testConstructTemplateIri_WithNullLocation() {
        TemplateIriUtils.constructTemplateIri(null, namespaceRegistry);
    }
    
    @Test(expected = IllegalArgumentException.class)
    public void testConstructTemplateIri_WithNullNamespaceRegistry() {
        TemplateIriUtils.constructTemplateIri("test:Person", null);
    }
    
    @Test
    public void testTemplatePathFromIri() {
        IRI templateIri = vf.createIRI("http://example.org/resource/Test");
        StoragePath result = TemplateIriUtils.templatePathFromIri(templateIri);
        
        assertTrue(result.toString().endsWith(".html"));
        assertTrue(result.toString().contains("http%3A%2F%2Fexample.org%2Fresource%2FTest"));
    }
    
    @Test(expected = IllegalArgumentException.class)
    public void testTemplatePathFromIri_WithNullIri() {
        TemplateIriUtils.templatePathFromIri(null);
    }
    
    @Test
    public void testUrlEncodeIri() {
        String iri = "http://example.org/resource/Test";
        String result = TemplateIriUtils.urlEncodeIri(iri);
        
        assertEquals("http%3A%2F%2Fexample.org%2Fresource%2FTest", result);
    }
    
    @Test
    public void testUrlEncodeIri_WithNull() {
        String result = TemplateIriUtils.urlEncodeIri(null);
        assertNull(result);
    }
    
    @Test
    public void testHasTemplatePrefix() {
        assertTrue(TemplateIriUtils.hasTemplatePrefix("Template:test:Person"));
        assertTrue(TemplateIriUtils.hasTemplatePrefix("Template:http://example.org/Test"));
        assertTrue(TemplateIriUtils.hasTemplatePrefix("  Template:test:Person  "));
        
        assertFalse(TemplateIriUtils.hasTemplatePrefix("test:Person"));
        assertFalse(TemplateIriUtils.hasTemplatePrefix("http://example.org/Test"));
        assertFalse(TemplateIriUtils.hasTemplatePrefix(""));
        assertFalse(TemplateIriUtils.hasTemplatePrefix(null));
    }
    
    @Test
    public void testWithoutTemplatePrefix() {
        assertEquals("test:Person", TemplateIriUtils.withoutTemplatePrefix("Template:test:Person"));
        assertEquals("http://example.org/Test", TemplateIriUtils.withoutTemplatePrefix("Template:http://example.org/Test"));
        assertEquals("test:Person", TemplateIriUtils.withoutTemplatePrefix("test:Person"));
        assertEquals("test:Person", TemplateIriUtils.withoutTemplatePrefix("  Template:test:Person  "));
        
        assertNull(TemplateIriUtils.withoutTemplatePrefix(null));
    }
    
    @Test
    public void testWithTemplatePrefix() {
        assertEquals("Template:test:Person", TemplateIriUtils.withTemplatePrefix("test:Person"));
        assertEquals("Template:http://example.org/Test", TemplateIriUtils.withTemplatePrefix("http://example.org/Test"));
        assertEquals("Template:test:Person", TemplateIriUtils.withTemplatePrefix("Template:test:Person"));
        
        assertEquals("Template:", TemplateIriUtils.withTemplatePrefix(null));
    }
    
    @Test
    public void testConstants() {
        assertEquals("Template:", TemplateIriUtils.TEMPLATE_PREFIX);
    }
}