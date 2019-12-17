package com.metaphacts.secrets;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Optional;

import javax.inject.Inject;

import org.junit.After;
import org.junit.Test;

import com.metaphacts.junit.AbstractIntegrationTest;

public class SecretsTest extends AbstractIntegrationTest {

    @Inject
    protected SecretResolver secretResolver;
    
    @Inject
    protected SecretsStore secretsStore;
    
    @After
    public void cleanup() {
        secretsStore.removeAllSecretResolvers();
    }
    
    @Test
    public void testFixedSecretResolver() {
        final String fixedPassword = "password"; 
        SecretResolver resolver = (lookup) -> Optional.of(Secret.fromString(fixedPassword));
        secretsStore.addSecretResolver(resolver);
        Optional<String> secret;
        secret = SecretsHelper.resolveSecretAsString(secretResolver, "${key}");
        assertTrue(secret.isPresent());
        assertEquals(fixedPassword, secret.get());
    }
    
    @Test
    public void testMapSecretResolver() {
        MapSecretResolver resolver = new MapSecretResolver()
                        .addSecret("key", "password")
                        .addSecret("key2", "password2");
        secretsStore.addSecretResolver(resolver);
        Optional<String> secret;
        
        // test simple resolving
        secret = SecretsHelper.resolveSecretAsString(secretResolver, "${key}");
        assertTrue(secret.isPresent());
        assertEquals("password", secret.get());
        
        secret = SecretsHelper.resolveSecretAsString(secretResolver, "${key2}");
        assertTrue(secret.isPresent());
        assertEquals("password2", secret.get());
        
        // test fallback
        secret = SecretsHelper.resolveSecretAsString(secretResolver, "${key3:fallback}");
        assertTrue(secret.isPresent());
        assertEquals("fallback", secret.get());
    }

    @Test
    public void testSecretKeyPatterns() {
        assertFalse(SecretsHelper.isResolvableSecret("my.key"));
        assertFalse(SecretsHelper.isResolvableSecret("my-key"));
        assertFalse(SecretsHelper.isResolvableSecret("123456789"));
        assertFalse(SecretsHelper.isResolvableSecret("v\\'qGyeGRxCK"));
        assertFalse(SecretsHelper.isResolvableSecret("-FZ7LEt#.T8W"));
        // starting with dollar, but no curly braces
        assertFalse(SecretsHelper.isResolvableSecret("$-FZ7LEt#.T8W"));
        // not starting with dollar, but wrapped in curly braces
        assertFalse(SecretsHelper.isResolvableSecret("{-FZ7LEt#.T8W}"));
        // containing dollar or curly braces
        assertFalse(SecretsHelper.isResolvableSecret("-FZ$7LEt#.T8W"));
        assertFalse(SecretsHelper.isResolvableSecret("-FZ{}7LEt#.T8W"));
        assertFalse(SecretsHelper.isResolvableSecret("-FZ}7LE{t#.T8W"));
        assertFalse(SecretsHelper.isResolvableSecret("${}"));
        
        assertTrue(SecretsHelper.isResolvableSecret("${abc}"));
        assertTrue(SecretsHelper.isResolvableSecret("${my.key}"));
        assertTrue(SecretsHelper.isResolvableSecret("${my-key}"));
        assertTrue(SecretsHelper.isResolvableSecret("${123456789}"));
        assertTrue(SecretsHelper.isResolvableSecret("${-FZ7LEt#.T8W}"));
    }
    
    @Test
    public void testKeyValue() {
        assertEquals("abc", SecretLookup.getLookupKey("${abc}").orElse("XXX"));
        assertEquals("my.key", SecretLookup.getLookupKey("${my.key}").orElse("XXX"));
        assertEquals("my-key", SecretLookup.getLookupKey("${my-key}").orElse("XXX"));
        assertEquals("abc", SecretLookup.getLookupKey("${abc:}").orElse("XXX"));
        assertEquals("my.key", SecretLookup.getLookupKey("${my.key:}").orElse("XXX"));
        assertEquals("my-key", SecretLookup.getLookupKey("${my-key:}").orElse("XXX"));
    }
    
    @Test
    public void testFallbackValue() {
        assertEquals("def", SecretLookup.getFallbackValue("${abc:def}").orElse("XXX"));
        assertEquals("123456", SecretLookup.getFallbackValue("${my.key:123456}").orElse("XXX"));
        assertEquals("-FZ}7LE{t#.T8W", SecretLookup.getFallbackValue("${my-key:-FZ}7LE{t#.T8W}").orElse("XXX"));
        assertEquals("", SecretLookup.getFallbackValue("${abc:}").orElse("XXX"));
        assertEquals("", SecretLookup.getFallbackValue("${my.key:}").orElse("XXX"));
        assertEquals("", SecretLookup.getFallbackValue("${my-key:}").orElse("XXX"));
        assertFalse(SecretLookup.getFallbackValue("${abc}").isPresent());
    }

}
