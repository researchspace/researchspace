/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
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

package org.researchspace.sail.rest;

import java.util.HashMap;
import java.util.Map;

import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.sail.SailException;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;
import org.researchspace.rest.filters.RequestRateLimitFilter;
import org.researchspace.rest.filters.UserAgentFilter;
import org.researchspace.secrets.SecretsHelper;

/**
 * 
 * @author Janmaruko Hōrensō <@gspinaci>
 *
 */
public class RESTSail extends AbstractServiceWrappingSail<RESTSailConfig> {

  private static final Logger logger = LogManager.getLogger(RESTSail.class);

  /**
   * According to the documentation of JAX-RS, "initialization as well as disposal
   * of client may be a rather expensive operation", so we want to make sure that
   * we reuse the same client instance for all calls for the specific service.
   *
   * In Jersey Client is threadsafe, so it is fine to have the single instance in
   * the sail and access it from multiple sail connections.
   */
  private Client client;

  public RESTSail(RESTSailConfig config) {
    super(config);
  }

  @Override
  protected RESTSailConnection getConnectionInternal() throws SailException {
    return new RESTSailConnection(this);
  }

  @Override
  protected void initializeInternal() throws SailException {
    super.initializeInternal();
    RESTSailConfig config = this.getConfig();

    // Resolve HTTP header secrets
    resolveHttpHeaderSecrets(config);

    // client Jersey HTTP client with Request Rate Limiter filter if request limit
    // is specified in the config
    var clientBuilder = ClientBuilder.newBuilder();
    if (config.getRequestRateLimit() != null) {
      clientBuilder = clientBuilder.register(new RequestRateLimitFilter(config.getRequestRateLimit()));
    }

    // it is a good practice to always include application user-agent into all
    // requests and somtime it can be even the requirement, e.g nominatim web
    // service from OSM
    if (config.getUserAgent() != null) {
      clientBuilder = clientBuilder.register(new UserAgentFilter(config.getUserAgent()));
    } else {
      clientBuilder = clientBuilder.register(new UserAgentFilter());
    }

    // if we have username and password in the config then configure basic auth
    if (config.getUsername() != null && config.getPassword() != null) {
      HttpAuthenticationFeature basicAuthFeature = HttpAuthenticationFeature.basic(config.getUsername(),
          config.getPassword());
      clientBuilder = clientBuilder.register(basicAuthFeature);
    }

    this.client = clientBuilder.build();
  }

  /**
   * Resolve secrets in HTTP headers using the SecretResolver.
   * This method processes unresolved header values that may contain secret
   * placeholders
   * in the format ${secret.key:fallback} and resolves them to actual values.
   * Supports both standalone secrets and secrets embedded within strings.
   *
   * @param config the RESTSailConfig containing unresolved HTTP headers
   */
  private void resolveHttpHeaderSecrets(RESTSailConfig config) {
    Map<String, String> resolvedHeaders = new HashMap<>();

    logger.debug("=== Starting HTTP header secret resolution ===");
    logger.debug("SecretResolver available: {}", secretResolver != null && secretResolver.get() != null);

    // Debug: Log some system properties to verify they're set
    if (logger.isDebugEnabled()) {
      logger.debug("Sample system properties:");
      System.getProperties().stringPropertyNames().stream()
          .filter(name -> name.startsWith("secret."))
          .forEach(name -> logger.debug("  {} = {}", name,
              System.getProperty(name).length() > 20 ? System.getProperty(name).substring(0, 20) + "..."
                  : System.getProperty(name)));
    }

    for (Map.Entry<String, String> entry : config.getUnResolvedHttpHeaders().entrySet()) {
      String headerName = entry.getKey();
      String headerValue = entry.getValue();

      logger.debug("Header '{}' - Unresolved value: '{}'", headerName, headerValue);

      // Resolve the header value - handles both standalone and embedded secrets
      String resolvedValue = resolveEmbeddedSecrets(headerValue);

      logger.debug("Header '{}' - Resolved value: '{}'", headerName,
          resolvedValue != null ? (resolvedValue.length() > 20 ? resolvedValue.substring(0, 20) + "..." : resolvedValue)
              : "null");

      resolvedHeaders.put(headerName, resolvedValue);
    }

    logger.debug("Resolved {} HTTP headers", resolvedHeaders.size());
    logger.debug("=== Finished HTTP header secret resolution ===");
    config.setHttpHeaders(resolvedHeaders);
  }

  /**
   * Resolve secrets that may be embedded within a string.
   * Handles both cases:
   * - Entire string is a secret: "${secret.key}" or "${secret.key:fallback}"
   * - Secret embedded in string: "Bearer ${secret.key}" or "prefix
   * ${secret.key:fallback} suffix"
   *
   * @param value the string that may contain secret placeholders
   * @return the string with all secrets resolved
   */
  private String resolveEmbeddedSecrets(String value) {
    if (value == null) {
      return null;
    }

    logger.debug("Resolving embedded secrets in: '{}'", value);

    // Pattern to find ${...} placeholders anywhere in the string
    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\$\\{([^:}]+):?([^}]*)\\}");
    java.util.regex.Matcher matcher = pattern.matcher(value);

    StringBuffer result = new StringBuffer();
    while (matcher.find()) {
      String key = matcher.group(1);
      String fallback = matcher.group(2);

      String secretPlaceholder = fallback.isEmpty() ? "${" + key + "}" : "${" + key + ":" + fallback + "}";
      logger.debug("Found placeholder: '{}', key: '{}', fallback: '{}'",
          matcher.group(0), key, fallback.isEmpty() ? "(none)" : fallback);

      // Resolve the secret
      String resolvedSecret = SecretsHelper.resolveSecretOrFallback(
          secretResolver.get(),
          secretPlaceholder);

      logger.debug("Resolved '{}' to: '{}'", secretPlaceholder,
          resolvedSecret != null
              ? (resolvedSecret.length() > 20 ? resolvedSecret.substring(0, 20) + "..." : resolvedSecret)
              : "null");

      // Replace the placeholder with the resolved value
      // If resolution returns null, keep the original placeholder
      if (resolvedSecret != null) {
        matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(resolvedSecret));
      } else {
        // Keep original placeholder if secret couldn't be resolved
        logger.debug("Secret not resolved, keeping placeholder");
        matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(matcher.group(0)));
      }
    }
    matcher.appendTail(result);

    String finalResult = result.toString();
    logger.debug("Final resolved value: '{}'", finalResult);
    return finalResult;
  }

  protected Client getClient() {
    return client;
  }
}
