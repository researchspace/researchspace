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
import java.io.InputStream;
import java.util.Map;
import java.util.jar.Manifest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.servlet.ServletContext;

import com.github.jknack.handlebars.Context;
import com.google.common.base.Throwables;
import com.google.inject.Provider;
import com.metaphacts.config.Configuration;
import com.metaphacts.ui.templates.ST.TEMPLATES;

/**
 *         Main application template with basic html skeleton and main js/css
 *         imports. While other ST templates can be loaded from different
 *         locations (i.e. classpath, app folder), the main template shouldn't be "overwritten".
 *
 * @author Artem Kozlov <ak@metaphats.com>
 * @author Johannes Trame <jt@metaphats.com>
 */
@Singleton
public class MainTemplate {
    @Inject
    private Provider<ServletContext> sc;

    @Inject
    private ST st;

    @Inject
    private Configuration config;

    @Inject @Named("ASSETS_MAP")
    private Map<String, String> assetsMap;

    public String getMainTemplate() throws IOException {
        MainTemplateOpts opts = new MainTemplateOpts(this.getVersion(), this.assetsMap, config);
        String html_head = st.renderPageLayoutTemplate(TEMPLATES.HTML_HEAD, opts);
        Context context = Context.newBuilder(opts)
            .combine("html-head", html_head).build();
        return st.renderPageLayoutTemplate(TEMPLATES.MAIN, context);
    }

    public String renderMainPageLayout(String templateName) throws IOException {
        MainTemplateOpts opts = new MainTemplateOpts(this.getVersion(), this.assetsMap, config);
        Context context = Context.newBuilder(opts).build();
        return st.renderPageLayoutTemplate(templateName, context);
    }

    private class MainTemplateOpts {
        public String version;
        public String deploymentTitle;

		public Map<String, String> assetsMap;

        public MainTemplateOpts(String version, Map<String, String> assetsMap, Configuration config) {
            this.version = version;
            this.assetsMap = assetsMap;
            this.deploymentTitle = config.getUiConfig().getDeploymentTitle();
        }

        @SuppressWarnings("unused")
        public String getVersion() {
            return version;
        }

        @SuppressWarnings("unused")
        public String getDeploymentTitle() {
			return deploymentTitle;
		}

        /**
         * Getter for the template context bean. See main.hbs
         * @return whether platform is started in development modus
         */
        @SuppressWarnings("unused")
        public boolean isDev() {
            // if there is hot bundle in the assets then we're in the dev mode
            return !this.assetsMap.get("hot").equals("");
        }

        /**
         * Getter for the template context bean. See main.hbs
         *
         * @return a map with all assets and respective asset locations to be
         *         loaded by the front-end. The location is different in
         *         development mode, where assets are served by the webpack
         *         server.
         */
        @SuppressWarnings("unused")
        public Map<String, String> getAssetsMap() {
            return assetsMap;
        }
    }

    private String platformVersion;

    private String getVersion() {
        if (platformVersion == null) {
            platformVersion = this.getVersionFromManifest();
        }
        return platformVersion;
    }

    /**
     * Get platform version from the MANIFEST.MF file in the WAR. We get it through ServletContext.
     */
    private String getVersionFromManifest() {
        InputStream inputStream = sc.get().getResourceAsStream("/META-INF/MANIFEST.MF");
        if (inputStream != null) {
            Manifest manifest;
            try {
                manifest = new Manifest(inputStream);
            } catch (IOException e) {
                throw Throwables.propagate(e);
            }
            return manifest.getMainAttributes()
                    .getValue(java.util.jar.Attributes.Name.IMPLEMENTATION_VERSION);
        } else {
            return "develop-build";
        }
    }
}
