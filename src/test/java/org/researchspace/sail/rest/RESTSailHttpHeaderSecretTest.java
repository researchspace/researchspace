package org.researchspace.sail.rest;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.researchspace.federation.repository.service.ServiceDescriptor;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.secrets.MapSecretResolver;
import org.researchspace.secrets.SecretResolver;

import com.google.inject.Provider;

/**
 * Test class for HTTP header secret resolution in RESTSail.
 * 
 * Tests various scenarios:
 * - Secret resolution with fallback
 * - Secret resolution without fallback
 * - Multiple headers with secrets
 * - Headers without secrets (plain values)
 * - Mixed headers (some with secrets, some without)
 */
public class RESTSailHttpHeaderSecretTest {

    private static final SimpleValueFactory VF = SimpleValueFactory.getInstance();
    private RESTSailConfig config;
    private RESTSail sail;
    private MapSecretResolver secretResolver;

    @Before
    public void setUp() {
        // Set up secret resolver with test secrets
        Map<String, String> secrets = new HashMap<>();
        secrets.put("secret.api.token", "test-token-12345");
        secrets.put("secret.auth.key", "Bearer my-secret-key");
        secrets.put("secret.custom.header", "custom-value");
        
        secretResolver = new MapSecretResolver(secrets);
        
        config = new RESTSailConfig();
        config.setUrl("http://localhost:8080/api");
        config.setHttpMethod("GET");
    }

    @After
    public void tearDown() {
        if (sail != null) {
            try {
                sail.shutDown();
            } catch (Exception e) {
                // Ignore shutdown errors in tests
            }
        }
    }

    /**
     * Test secret resolution with fallback value.
     * Format: ${secret.key:fallback}
     */
    @Test
    public void testSecretResolutionWithFallback() throws Exception {
        // Create config with secret placeholder and fallback
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("Authorization"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.api.token:fallback-token}"));
        
        config.parse(model, implNode);
        
        // Verify unresolved value is stored
        assertEquals("${secret.api.token:fallback-token}",
            config.getUnResolvedHttpHeaders().get("Authorization"));
        
        // Initialize sail to trigger secret resolution
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify secret was resolved
        assertEquals("test-token-12345", config.getHttpHeaders().get("Authorization"));
    }

    /**
     * Test secret resolution without fallback value.
     * Format: ${secret.key}
     */
    @Test
    public void testSecretResolutionWithoutFallback() throws Exception {
        // Create config with secret placeholder without fallback
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("X-API-Key"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.auth.key}"));
        
        config.parse(model, implNode);
        
        // Initialize sail to trigger secret resolution
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify secret was resolved
        assertEquals("Bearer my-secret-key", config.getHttpHeaders().get("X-API-Key"));
    }

    /**
     * Test secret resolution when secret is not found and no fallback is provided.
     * Should keep the original placeholder (fail-safe behavior).
     */
    @Test
    public void testSecretNotFoundWithoutFallback() throws Exception {
        // Create config with non-existent secret
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("X-Missing"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.nonexistent}"));
        
        config.parse(model, implNode);
        
        // Initialize sail to trigger secret resolution
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify placeholder is kept when secret not found (fail-safe behavior)
        assertEquals("${secret.nonexistent}", config.getHttpHeaders().get("X-Missing"));
    }

    /**
     * Test secret resolution when secret is not found but fallback is provided.
     * Should return the fallback value.
     */
    @Test
    public void testSecretNotFoundWithFallback() throws Exception {
        // Create config with non-existent secret but with fallback
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("X-Fallback"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.nonexistent:fallback-value}"));
        
        config.parse(model, implNode);
        
        // Initialize sail to trigger secret resolution
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify fallback value is used
        assertEquals("fallback-value", config.getHttpHeaders().get("X-Fallback"));
    }

    /**
     * Test plain header values without secret placeholders.
     * Should remain unchanged.
     */
    @Test
    public void testPlainHeaderValue() throws Exception {
        // Create config with plain header value
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("Content-Type"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("application/json"));
        
        config.parse(model, implNode);
        
        // Initialize sail
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify plain value remains unchanged
        assertEquals("application/json", config.getHttpHeaders().get("Content-Type"));
    }

    /**
     * Test multiple headers with mixed secret and plain values.
     */
    @Test
    public void testMultipleHeadersMixed() throws Exception {
        // Create config with multiple headers
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        
        // Header 1: Secret with fallback
        BNode header1 = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, header1);
        model.add(header1, MpRepositoryVocabulary.NAME, VF.createLiteral("Authorization"));
        model.add(header1, MpRepositoryVocabulary.VALUE, VF.createLiteral("Bearer ${secret.api.token:default}"));
        
        // Header 2: Plain value
        BNode header2 = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, header2);
        model.add(header2, MpRepositoryVocabulary.NAME, VF.createLiteral("Content-Type"));
        model.add(header2, MpRepositoryVocabulary.VALUE, VF.createLiteral("application/json"));
        
        // Header 3: Secret without fallback
        BNode header3 = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, header3);
        model.add(header3, MpRepositoryVocabulary.NAME, VF.createLiteral("X-Custom"));
        model.add(header3, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.custom.header}"));
        
        config.parse(model, implNode);
        
        // Initialize sail
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify all headers are resolved correctly
        Map<String, String> headers = config.getHttpHeaders();
        assertEquals(3, headers.size());
        assertEquals("Bearer test-token-12345", headers.get("Authorization"));
        assertEquals("application/json", headers.get("Content-Type"));
        assertEquals("custom-value", headers.get("X-Custom"));
    }

    /**
     * Test that unresolved headers are preserved in export.
     */
    @Test
    public void testExportPreservesUnresolvedHeaders() throws Exception {
        // Create config with secret placeholder
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("Authorization"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("${secret.api.token}"));
        
        config.parse(model, implNode);
        
        // Export config
        Model exportedModel = new LinkedHashModel();
        config.export(exportedModel);
        
        // Verify unresolved value is preserved in export
        assertTrue(exportedModel.contains(null, MpRepositoryVocabulary.VALUE,
            VF.createLiteral("${secret.api.token}")));
    }

    /**
     * Test secret resolution with complex Bearer token format.
     */
    @Test
    public void testBearerTokenFormat() throws Exception {
        // Create config with Bearer token format
        Model model = createConfigModel();
        BNode implNode = VF.createBNode();
        BNode headerNode = VF.createBNode();
        model.add(implNode, MpRepositoryVocabulary.HTTP_HEADER, headerNode);
        model.add(headerNode, MpRepositoryVocabulary.NAME, VF.createLiteral("Authorization"));
        model.add(headerNode, MpRepositoryVocabulary.VALUE, VF.createLiteral("Bearer ${secret.api.token}"));
        
        config.parse(model, implNode);
        
        // Initialize sail
        sail = createSailWithSecretResolver(config, secretResolver);
        sail.initialize();
        
        // Verify Bearer prefix is preserved and token is resolved
        assertEquals("Bearer test-token-12345", config.getHttpHeaders().get("Authorization"));
    }

    // Helper methods

    private Model createConfigModel() {
        Model model = new LinkedHashModel();
        return model;
    }

    private RESTSail createSailWithSecretResolver(RESTSailConfig config, SecretResolver resolver) {
        RESTSail sail = new RESTSail(config);
        
        // Inject mock secret resolver
        sail.secretResolver = new Provider<SecretResolver>() {
            @Override
            public SecretResolver get() {
                return resolver;
            }
        };
        
        // Create minimal service descriptor with empty parameters
        ServiceDescriptor descriptor = new ServiceDescriptor();
        sail.setServiceDescriptor(descriptor);
        
        return sail;
    }
}
