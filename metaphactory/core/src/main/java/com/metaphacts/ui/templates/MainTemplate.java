/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import java.util.Map;

import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;

import com.github.jknack.handlebars.Context;
import com.google.common.base.Throwables;
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
    /**
     * Location of the main app html template.
     */
    private static final String MAIN_HTML_TEMPLATE = "/com/metaphacts/ui/templates/main";
    
    private static String platformVersion = MainTemplate.class.getPackage().getImplementationVersion();

    @Inject
    private ST st;
    
    @Inject 
    private Configuration config;

    @Inject @Named("ASSETS_MAP")
    private Map<String, String> assetsMap;

    public String getMainTemplate() {
        try {
            MainTemplateOpts opts = new MainTemplateOpts(platformVersion, this.assetsMap, config);
            String html_head = st.getTemplateFromAppOrClasspath(TEMPLATES.HTML_HEAD, opts);
            Context context = Context.newBuilder(opts).combine("html-head", html_head).build();
            return st.handlebars.compile(MAIN_HTML_TEMPLATE).apply(
                context
            );
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
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

}
