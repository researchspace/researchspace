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

package org.researchspace.security.sso;

import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

import javax.inject.Inject;

import com.google.common.collect.Sets;
import com.google.inject.Injector;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.config.Ini;
import org.apache.shiro.web.env.IniWebEnvironment;
import org.pac4j.saml.client.SAML2Client;
import org.researchspace.config.Configuration;
import org.researchspace.secrets.SecretResolver;
import org.researchspace.security.SecurityConfigRecord;
import org.researchspace.security.SecurityConfigType;
import org.researchspace.security.ShiroRealmUtils;
import org.researchspace.security.ShiroTextRealm;

/**
 * @author Artem Kozlov {@literal <ak@metaphacts.com>}
 */
public class SSOEnvironment extends IniWebEnvironment {
    public static enum SSOVariant {
        oidc, keycloak, saml2
    }

    private static final Logger logger = LogManager.getLogger(SSOEnvironment.class);

    private static final String USERS = "users";
    private static final String PLATFORM_BASE_IRI = "platformBaseIri";
    private static final String TEXT_REALM = "textRealm";
    private static final String GUICE_INJECTOR = "guiceInjector";

    private SSOUsersRegistry users;
    private Configuration config;
    private ShiroTextRealm textRealm;
    private SecretResolver secretResolver;
    private final Injector injector;

    public final SSOVariant ssoVariant;

    @Inject
    public SSOEnvironment(Injector injector, Configuration config, ShiroTextRealm textRealm, SecretResolver secretResolver) {
        super();
        this.injector = injector;
        this.config = config;
        this.textRealm = textRealm;
        this.users = new SSOUsersRegistry(config);
        this.secretResolver = secretResolver;
        this.ssoVariant = SSOVariant.valueOf(config.getEnvironmentConfig().getSso());
    }

    public Optional<String> getSamlSpMetadata() {
        if (this.ssoVariant.equals(SSOVariant.saml2)) {
            SAML2Client saml2Client = this.getObject("saml2Client", SAML2Client.class);
            saml2Client.init();
            return Optional.of(saml2Client.getServiceProviderMetadataResolver().getMetadata());
        } else {
            return Optional.empty();
        }
    }

    @Override
    protected Map<String, Object> getDefaults() {
        Map<String, Object> defaults = super.getDefaults();
        defaults.put(USERS, users);
        defaults.put(TEXT_REALM, this.textRealm);

        String baseUri = this.config.getEnvironmentConfig().getPlatformBaseIri();
        if (baseUri == null) {
            logger.fatal("config.environment.platformBaseIri is undefined. When SSO is enabled platformBaseIri is required!");
            System.exit(1);
        }
        defaults.put(PLATFORM_BASE_IRI, baseUri);

        defaults.put(GUICE_INJECTOR, this.injector);
        return defaults;
    }



    @Override
    protected Ini getDefaultIni() {
        SecurityConfigRecord record = config.getEnvironmentConfig().getSecurityConfig(SecurityConfigType.SsoConfig);

        if (record.exists()) {
            Ini ini = new Ini();
            try (InputStream stream = record.readStream()) {
                ini.load(stream);
            } catch (Exception e) {
                logger.error("SSO: " + SecurityConfigType.SsoConfig.getFileName()
                        + " is missing present, but can't be read/parsed as proper ini shiro file.");
                System.exit(1);
            }
            return ini;
        } else {
            return null;
        }
    }

    @Override
    protected Ini getFrameworkIni() {
        return Ini.fromResourcePath("classpath:org/researchspace/security/sso/shiro-sso-"
                + this.ssoVariant.name() + "-default.ini");
    }

    @Override
    protected Ini parseConfig() {
        Ini mergedConfig = super.parseConfig();
        // Resolve externally defined secrets.
        ShiroRealmUtils.resolveSecrets(Sets.newHashSet("clientId.value", "clientSecret.value"), mergedConfig,
                this.secretResolver);
        return mergedConfig;
    }
}
