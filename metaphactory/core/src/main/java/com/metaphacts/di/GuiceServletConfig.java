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

package com.metaphacts.di;

import java.util.Enumeration;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;

import org.apache.log4j.Logger;
import org.apache.shiro.guice.web.ShiroWebModule;

import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.servlet.GuiceServletContextListener;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.ShiroGuiceModule;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class GuiceServletConfig extends GuiceServletContextListener {

    @SuppressWarnings("unused")
    private static final Logger logger = Logger
            .getLogger(GuiceServletConfig.class.getName());

    private ServletContext servletContext;

    public static Injector injector;

    @Override
    public void contextInitialized(ServletContextEvent event) {
        this.servletContext = event.getServletContext();

        /**
         * Set context param properties as System properties. This allow
         * override of platform config properties using context-param in web.xml
         */
        propagateContextProperties(this.servletContext);

        super.contextInitialized(event);
        
        System.out.println("\n"
                + "*************************************************************************************\n"
                + "* Main platform servlet context initialized. Press CTRL+C to terminate the process. *\n"
                + "*************************************************************************************\n"
        );
        
        // Replace with proper onContextInitialized hook
        injector.getInstance(RepositoryManager.class).sentTestQueries();
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
    }

    @Override
    protected Injector getInjector() {
        Injector platformBaseInjector = Guice.createInjector(new ConfigurationModule());
        GuiceServletConfig.injector = platformBaseInjector.createChildInjector(
                new MainGuiceModule(this.servletContext, platformBaseInjector), 
                new ShiroGuiceModule(this.servletContext, platformBaseInjector), 
                ShiroWebModule.guiceFilterModule(), 
                new PlatformGuiceModule()
        );
        return injector;
    }



    /**
     * Set context param properties as System
     * properevent.getServletContext()ties. This allow override of platform
     * config properties using context-param in web.xml
     */
    private void propagateContextProperties(ServletContext context) {
        Enumeration<String> names = context.getInitParameterNames();
        while (names.hasMoreElements()) {
            String propName = names.nextElement();
            if (System.getProperty(propName) == null) {
                System.setProperty(propName, context.getInitParameter(propName));
            }
        }
    }
}
