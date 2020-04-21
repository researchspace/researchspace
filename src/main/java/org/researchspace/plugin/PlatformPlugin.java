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

package org.researchspace.plugin;

import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Iterator;
import java.util.ServiceLoader;
import java.util.function.Function;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.lang.service.ServiceRegistry;
import org.eclipse.rdf4j.repository.config.RepositoryFactory;
import org.eclipse.rdf4j.repository.config.RepositoryRegistry;
import org.eclipse.rdf4j.sail.config.SailFactory;
import org.eclipse.rdf4j.sail.config.SailRegistry;
import org.researchspace.config.Configuration;
import org.researchspace.config.groups.ConfigurationGroup;
import org.researchspace.plugin.extension.ConfigurationExtension;
import org.researchspace.plugin.extension.RestExtension;
import org.researchspace.sail.rest.sql.MpJDBCDriverManager;

import ro.fortsoft.pf4j.PluginException;
import ro.fortsoft.pf4j.PluginWrapper;

/**
 * <p>
 * This class will be instantiated by all plugins and serve as the common class
 * between a plugin (aka app) and the platform.
 * </p>
 * <strong> Please note: </strong>
 * <p>
 * In most cases it should not be required to extend this class i.e. it should
 * be sufficient to implement or extend the extension points. In particular,
 * {@link RestExtension} and {@link ConfigurationExtension}.
 * </p>
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PlatformPlugin extends ro.fortsoft.pf4j.Plugin {

    private static final Logger logger = LogManager.getLogger(PlatformPlugin.class);

    // set via init() via external call
    private Configuration config;

    // set via init() via external call
    private MpJDBCDriverManager jdbcDriverManager;

    public PlatformPlugin(final PluginWrapper wrapper) {
        super(wrapper);
    }

    /**
     * Initializes the plugin with relevant information (such as configuration). Is
     * called once internally *prior* to start being executed.
     */
    public void init(Configuration config, MpJDBCDriverManager jdbcDriverManager) {
        this.config = config;
        this.jdbcDriverManager = jdbcDriverManager;
    }

    /**
     * Adds a custom configuration group. The configuration group must be registered
     * *prior* to the start() call of the method. It will then be automatically
     * registered to the platform configuration, where it can be looked up using
     * {@link Configuration#getCustomConfigurationGroup(String, Class)} using the ID
     * as parameter.
     */
    public void registerCustomConfigurationGroup(final Class<? extends ConfigurationGroup> configGroupClass) {
        // instantiate the class
        try {
            final ConfigurationGroup configurationGroup = configGroupClass.newInstance();

            final boolean success = config.registerCustomConfigurationGroup(configurationGroup);
            if (success) {
                logger.info("Registered configuration group " + configurationGroup.getId());
            } else {
                logger.warn("Registration of configuration group " + configurationGroup.getId() + " failed."
                        + "This is probably due to an ID clash, make sure you use a unique ID for your config group. ");
            }

        } catch (Exception e) {

            logger.warn("Error instantiating configuration group from class " + configGroupClass.getName()
                    + ". Config class will not be available. "
                    + "One problem might be that the configuration file is not included in the plugin."
                    + "Please make sure that the configuration file is present.");

        }
    }

    /**
     * Start method is called by the application when the plugin is loaded.
     * 
     * @see ro.fortsoft.pf4j.Plugin#start()
     */
    @Override
    public final void start() throws PluginException {

        // install/bootstrap the artifacts from the plugin
        handleRepositoryInstallation();
        handleJDBCDrivers();

        // and delegate to super start() method
        super.start();
    }

    private void handleRepositoryInstallation() throws PluginException {
        handleServiceInstallation(SailRegistry.getInstance(), SailFactory.class, SailFactory::getSailType);
        handleServiceInstallation(RepositoryRegistry.getInstance(), RepositoryFactory.class,
                RepositoryFactory::getRepositoryType);
    }

    private <S> void handleServiceInstallation(ServiceRegistry<String, S> parentRegistry, Class<S> serviceClass,
            Function<S, String> serviceIdFunction) throws PluginException {
        // Collects all services available on the classpath: both those added in the
        // plugin
        // and those available in the main codebase and dependencies.
        ServiceLoader<S> loader = java.util.ServiceLoader.load(serviceClass, this.getWrapper().getPluginClassLoader());

        Iterator<S> services = loader.iterator();
        while (services.hasNext()) {
            try {
                S service = services.next();

                // We should only add the new services defined in this plugin
                if (!parentRegistry.get(serviceIdFunction.apply(service)).isPresent()) {
                    parentRegistry.add(service);
                    logger.debug("Registered service class {}", service.getClass().getName());
                }
            } catch (Error e) {
                logger.error("Failed to instantiate service", e);
            }
        }
    }

    private void handleJDBCDrivers() throws PluginException {
        ServiceLoader<Driver> loader = java.util.ServiceLoader.load(Driver.class,
                this.getWrapper().getPluginClassLoader());

        Iterator<Driver> services = loader.iterator();
        while (services.hasNext()) {
            Driver driver = services.next();
            try {
                DriverManager.registerDriver(driver);
                jdbcDriverManager.registerDriver(driver);
            } catch (SQLException e) {
                logger.error("Failed to register the JDBC driver " + driver.getClass().getCanonicalName(), e);
            }
        }
    }

    /**
     * Util to cast the descriptor to {@link PlatformPluginDescriptor}
     * 
     * @return
     */
    public PlatformPluginDescriptor getPluginDescriptor() {
        return (PlatformPluginDescriptor) getWrapper().getDescriptor();
    }
}
