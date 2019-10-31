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

package com.metaphacts.security;

import com.metaphacts.config.Configuration;

public enum SecurityConfigType {
    ShiroConfig("shiroConfig", "shiro.ini"),
    ShiroLDAPConfig("shiroLDAPConfig", "shiro-ldap.ini"),
    OauthParameters("oauthParameters", "shiro-sso-oauth-params.ini"),
    SamlParameters("samlParameters", "shiro-sso-saml-params.ini"),
    SsoAuthConfigOverride("ssoFactorAuthOverride", "shiro-sso.ini"),
    SsoUsersConfig("ssoUserConfig", "shiro-sso-users.ini");

    private String paramKey;
    private String fileName;

    SecurityConfigType(String paramKey, String fileName) {
        this.paramKey = paramKey;
        this.fileName = fileName;
    }

    public String getParamKey() {
        return paramKey;
    }

    public String getFileName() {
        return fileName;
    }

    public String getDefaultPath() {
        return Configuration.getConfigBasePath() + fileName;
    }
}
