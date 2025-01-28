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

package org.researchspace.servlet;

import static org.researchspace.config.ConfigurationUtil.createEmptyConfig;

import java.io.InputStream;
import java.net.URI;
import java.util.Map;
import java.util.Set;

import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.configuration2.CompositeConfiguration;
import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.ConfigurationConverter;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.SystemConfiguration;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.mitre.dsmiley.httpproxy.ProxyServlet;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.secrets.SecretsHelper;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;
import org.researchspace.services.storage.api.PlatformStorage.FindResult;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

/**
 * Loads proxy configuration from proxy.prop.
 * 
 * <p>
 * The following configuration values are subject to secret resolution (see
 * {@link SecretResolver} for details):
 * <ul>
 * <li>username for system user</li>
 * <li>password for system user</li>
 * </ul>
 * </p>
 */
public class ProxyConfigs {
    private static final StoragePath PROXY_CONFIG_OBJECT_ID = ObjectKind.CONFIG.resolve("proxy.prop");

    private static final Logger logger = LogManager.getLogger(ProxyConfigs.class);

    private ProxyConfigs() {
    }

    public static class ProxyConfig {
        private String targetUri;
        private String loginName;
        private String loginPassword;
        private String loginBase64;

        private String preserveCookies;
        private String handleRedirects;
        private String socketTimeout;
        private String forwardip;
        private String preserveHost;

        public String getPreserveHost() {
            return preserveHost;
        }

        public void setPreserveHost(String preserveHost) {
            this.preserveHost = preserveHost;
        }

        public String getPreserveCookies() {
            return preserveCookies;
        }

        public void setPreserveCookies(String preserveCookies) {
            this.preserveCookies = preserveCookies;
        }

        public String getSocketTimeout() {
            return socketTimeout;
        }

        public void setSocketTimeout(String socketTimeout) {
            this.socketTimeout = socketTimeout;
        }

        public String getForwardip() {
            return forwardip;
        }

        public void setForwardip(String forwardip) {
            this.forwardip = forwardip;
        }

        public String getTargetUri() {
            return targetUri;
        }

        public void setTargetUri(String targetUri) {
            this.targetUri = targetUri;
        }

        public String getLoginName() {
            return loginName;
        }

        public void setLoginName(String proxyLoginName) {
            this.loginName = proxyLoginName;
        }

        public String getLoginPassword() {
            return loginPassword;
        }

        public void setLoginPassword(String proxyLoginPassword) {
            this.loginPassword = proxyLoginPassword;
        }

        public String getLoginBase64() {
            return loginBase64;
        }

        public void setLoginBase64(String loginBase64) {
            this.loginBase64 = loginBase64;
        }
    }

    public static Map<String, Map<String, String>> getConfigs(PlatformStorage platformStorage,
            SecretResolver secretResolver) {
        Map<String, Map<String, String>> proxyMap = Maps.newHashMap();

        try {
            CompositeConfiguration config = new CompositeConfiguration();
            config.addConfiguration(new SystemConfiguration());

            for (FindResult findResult : platformStorage.findOverrides(PROXY_CONFIG_OBJECT_ID)) {
                logger.info("Loading proxy configuration from storage '{}' at path: {}", findResult.getAppId(),
                        findResult.getRecord().getPath());

                PropertiesConfiguration params = createEmptyConfig();
                FileHandler handler = new FileHandler(params);
                try (InputStream content = findResult.getRecord().getLocation().readContent()) {
                    handler.load(content);
                }

                config.addConfiguration(params);
            }

            Configuration proxiesSubset = config.subset("config.proxy");
            Set<String> proxies = Sets.newHashSet();
            proxiesSubset.getKeys().forEachRemaining(k -> proxies.add(StringUtils.substringBefore(k, ".")));

            for (String proxyKey : proxies) {
                Configuration proxyProperties = proxiesSubset.subset(proxyKey);
                ProxyConfig proxyConfig = new ProxyConfig();
                Map<String, Object> map = Maps.newHashMap();
                ConfigurationConverter.getMap(proxyProperties).entrySet()
                        .forEach(entry -> map.put((String) entry.getKey(), entry.getValue()));
                BeanUtils.populate(proxyConfig, map);

                Map<String, String> pmap = Maps.newHashMap();
                pmap.put("targetUri", proxyConfig.targetUri);
                pmap.put("loginName", SecretsHelper.resolveSecretOrFallback(secretResolver, proxyConfig.loginName));
                pmap.put("loginPassword",
                        SecretsHelper.resolveSecretOrFallback(secretResolver, proxyConfig.loginPassword));
                pmap.put("loginBase64", SecretsHelper.resolveSecretOrFallback(secretResolver, proxyConfig.loginBase64));
                pmap.put("log", "true");

                pmap.put(ProxyServlet.P_PRESERVEHOST, proxyConfig.preserveHost);
                pmap.put(ProxyServlet.P_PRESERVECOOKIES, proxyConfig.preserveCookies);
                pmap.put(ProxyServlet.P_HANDLEREDIRECTS, proxyConfig.handleRedirects);
                pmap.put(ProxyServlet.P_CONNECTTIMEOUT, proxyConfig.socketTimeout);
                pmap.put(ProxyServlet.P_FORWARDEDFOR, proxyConfig.forwardip);

                URI uri = null;
                uri = new URI(proxyConfig.targetUri);
                if (uri.getHost() == null) {
                    throw new IllegalArgumentException("Missing host for the proxy target URL: " + proxyConfig.targetUri
                            + ". Relative paths for proxies are not supported.");
                }

                proxyMap.put(proxyKey, pmap);

            }

        } catch (Exception e) {
            logger.warn("Error while loading proxies configuration in PlatformGuiceModule:" + e.getMessage());
            logger.debug("Details: ", e);
            throw new RuntimeException(e);
        }
        return proxyMap;
    }
}
