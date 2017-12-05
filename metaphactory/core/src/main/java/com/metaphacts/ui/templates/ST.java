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

import java.io.File;
import java.util.ArrayList;
import java.util.Map;

import javax.inject.Inject;

import com.google.common.collect.Maps;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.cache.ConcurrentMapTemplateCache;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.FileTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import com.google.common.base.Throwables;
import com.google.common.collect.Lists;
import com.google.inject.Singleton;
import com.metaphacts.config.Configuration;
import com.metaphacts.rest.endpoint.TemplateEndpoint;

/**
 * @author Artem Kozlov <ak@metaphats.com>
 * @author Johannes Trame <jt@metaphats.com>
 */
@Singleton
public class ST {
    @Inject
    private  Configuration config;

    public static class TEMPLATES{
        public static final String HEADER = "/com/metaphacts/ui/templates/header";
        public static final String FOOTER = "/com/metaphacts/ui/templates/footer";
        public static final String LOGIN_PAGE = "/com/metaphacts/ui/templates/login";
        public static final String HTML_HEAD = "/com/metaphacts/ui/templates/html-head";
    }

    public  Handlebars handlebars = new Handlebars().with(new ConcurrentMapTemplateCache());

    public String getTemplateFromAppOrClasspathWithConfig(String path){
        return getTemplateFromAppOrClasspath(path, getConfigurationPropertyMap());
    }
    
    public Map<String,Object> getConfigurationPropertyMap(){
    	Map<String,Object> params = Maps.newHashMap();
    	params.put("deploymentTitle", config.getUiConfig().getDeploymentTitle());
    	return params;
    }

    /**
	 * Returns a compiled template string. The template is loaded from either
	 * the app folder or the classpath via the specified path string.
	 * 
	 * The {@link MainTemplate} will call this method with a special
	 * {@link MainTemplateOps} objects as params, whereas the methods
	 * {@link TemplateEndpoint#getFooter()} and
	 * {@link TemplateEndpoint#getFooter()} will call this method via
	 * {@link #getTemplateFromAppOrClasspathWithConfig(String)} which will
	 * automatically inject some configuration parameters as params.
	 * 
	 * @param path
	 * @param params
	 * @return
	 */
    public String getTemplateFromAppOrClasspath(String path, Object params){
        try {
            ConcurrentMapTemplateCache cache = new ConcurrentMapTemplateCache().setReload(true);
           
            /*
             * if more than one template loader is available (i.e. not only
             * default classpath based, but also file-based ones for the application dirs)
             * handlebars will automatically create a composite
             * loader where the application file-based loader will have
             * precedence over the classpath-based ones.
             */
            return handlebars.with(getTemplateLoaders()).with(cache).compile(path)
                    .apply(params);
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
    }
    


    private TemplateLoader[] getTemplateLoaders(){
        ArrayList<TemplateLoader> list = Lists.newArrayList();

        for(File f : config.getEnvironmentConfig().getApplicationFolders()){
            File resourceDir = new File(f, "resources");
            if(resourceDir.exists())list.add(new FileTemplateLoader(resourceDir));
        }
        list.add(new ClassPathTemplateLoader());
        return list.toArray(new TemplateLoader[list.size()]);
    }

}
