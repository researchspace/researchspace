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

package com.metaphacts.ui.templates;

import java.io.IOException;
import java.util.Map;

import javax.inject.Inject;

import com.google.common.collect.Maps;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.cache.ConcurrentMapTemplateCache;
import com.github.jknack.handlebars.io.TemplateLoader;
import com.google.inject.Singleton;
import com.metaphacts.config.Configuration;
import com.metaphacts.rest.endpoint.TemplateEndpoint;
import com.metaphacts.services.storage.api.ObjectKind;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.services.storage.api.StoragePath;
import com.metaphacts.templates.FromStorageLoader;

/**
 * Provides ability to render page layout templates (i.e. header, footer, etc) with different input
 * properties. Page layout templates are resolved from {@link PlatformStorage} as
 * {@link ObjectKind#CONFIG} objects with {@link #TEMPLATE_OBJECT_PREFIX} and ".hbs" extension.
 *
 * @author Artem Kozlov <ak@metaphats.com>
 * @author Johannes Trame <jt@metaphats.com>
 */
@Singleton
public class ST {
    private static final StoragePath TEMPLATE_OBJECT_PREFIX =
        ObjectKind.CONFIG.resolve("page-layout");

    private final Configuration config;
    private final Handlebars handlebars;

    @Inject
    public ST(Configuration config, PlatformStorage platformStorage) {
        this.config = config;
        TemplateLoader templateLoader = new FromStorageLoader(platformStorage) {
            @Override
            protected StoragePath resolveLocation(String location) {
                return objectIdForTemplate(location);
            }
        };
        this.handlebars = new Handlebars()
            .with(new ConcurrentMapTemplateCache())
            .with(templateLoader);
    }

    public static class TEMPLATES {
        public static final String MAIN = "main";
        public static final String HEADER = "header";
        public static final String FOOTER = "footer";
        public static final String LOGIN_PAGE = "login";
        public static final String HTML_HEAD = "html-head";
        public static final String NO_PERMISSIONS_PAGE = "no-permissions-page";
    }

    public static StoragePath objectIdForTemplate(String name) {
        return TEMPLATE_OBJECT_PREFIX.resolve(name).addExtension(".hbs");
    }

    public String renderPageLayoutTemplate(String path) throws IOException {
        return renderPageLayoutTemplate(path, getDefaultPageLayoutTemplateParams());
    }
    
    public Map<String, Object> getDefaultPageLayoutTemplateParams() {
    	Map<String,Object> params = Maps.newHashMap();
    	params.put("deploymentTitle", config.getUiConfig().getDeploymentTitle());
    	return params;
    }

    /**
	 * Returns a compiled template string. The template is loaded from either
	 * the app folder or the classpath via the specified path string.
	 * 
	 * The {@link MainTemplate} will call this method with a special
	 * {@code MainTemplateOps} objects as params, whereas the methods
	 * {@link TemplateEndpoint#getFooter()} and
	 * {@link TemplateEndpoint#getFooter()} will call this method via
	 * {@link #renderPageLayoutTemplate(String)} which will
	 * automatically inject some configuration parameters as params.
	 */
    public String renderPageLayoutTemplate(String path, Object params) throws IOException {
        return handlebars.compile(path).apply(params);
    }
}
