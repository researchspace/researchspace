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

package com.metaphacts.di;

import java.util.Enumeration;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;

import org.apache.log4j.Logger;
import org.apache.shiro.guice.web.ShiroWebModule;

import com.google.inject.CreationException;
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.servlet.GuiceServletContextListener;
import com.google.inject.spi.Message;
import com.metaphacts.data.rdf.container.LDPAssetsLoader;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.security.ShiroGuiceModule;
import com.metaphacts.services.storage.MainPlatformStorage;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class GuiceServletConfig extends GuiceServletContextListener {

    private static final Logger logger = Logger
            .getLogger(GuiceServletConfig.class.getName());

    protected ServletContext servletContext;

    public static Injector injector;

    @Override
    public void contextInitialized(ServletContextEvent event) {
        this.servletContext = event.getServletContext();

        /**
         * Set context param properties as System properties. This allow
         * override of platform config properties using context-param in web.xml
         */
        propagateContextProperties(this.servletContext);

        try {
            super.contextInitialized(event);
        } catch (CreationException e) {
            logger.error("Failed to initialize web application");
            for (Message message : e.getErrorMessages()) {
                logger.error(message.getMessage());
                logger.debug("Details: ", message.getCause());
            }
            throw new IllegalStateException("Failed to initialize webapp context. See error log for details.");
        } catch (Throwable e) {
            logger.error("Failed to initialize web application: " + e.getMessage());
            logger.debug("Details: ", e);
            throw new IllegalStateException("Failed to initialize webapp context. See error log for details.");
        }
        
        logger.info("Main platform servlet context initialized.");
        System.out.println("\n"
                + "*************************************************************************************\n"
                + "* Main platform servlet context initialized. Press CTRL+C to terminate the process. *\n"
                + "*************************************************************************************\n"
        );
        
        // Replace with proper onContextInitialized hook
        injector.getInstance(RepositoryManager.class).sentTestQueries();
        
        try {
            injector.getInstance(LDPAssetsLoader.class).load();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        logger.info("Main platform servlet context in process of shutting down.");
        System.out.println("\n"
                + "*************************************************************************************\n"
                + "* Main platform servlet context in process of shutting down.                        *\n"
                + "*************************************************************************************\n"
        );
        
        logger.info("Shutting down repositories.");
        injector.getInstance(RepositoryManager.class).shutdown();
        
        logger.info("Shutting down main platform storage.");
        try {
            injector.getInstance(MainPlatformStorage.class).shutdown();
        } catch (Throwable t) {
            logger.warn("Error while shutting down main platform storage: " + t.getMessage());
            logger.debug("Details:", t);
        }

        super.contextDestroyed(sce);
    }

    @Override
    protected Injector getInjector() {
        Injector platformBaseInjector = Guice.createInjector(new ConfigurationModule());
        GuiceServletConfig.injector = platformBaseInjector.createChildInjector(
                new MainGuiceModule(this.servletContext, platformBaseInjector), 
                new ShiroGuiceModule(this.servletContext, platformBaseInjector), 
                ShiroWebModule.guiceFilterModule(), 
                new PlatformGuiceModule(platformBaseInjector)
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
