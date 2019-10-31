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

package com.metaphacts.config.groups;

import com.google.common.collect.Lists;
import com.metaphacts.config.ConfigurationParameter;
import com.metaphacts.config.InvalidConfigurationException;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.services.storage.api.PlatformStorage;

import java.util.List;

import javax.inject.Inject;

/**
 * Configuration group for global system configuration, affecting system
 * startup and global system functionality.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class GlobalConfiguration extends ConfigurationGroupBase {

    private final static String ID = "global";

    // TODO: outline using locale
    private final static String DESCRIPTION =
        "Global system configuration, affecting system startup and global system functionality.";

    @Inject
    public GlobalConfiguration(PlatformStorage platformStorage) throws InvalidConfigurationException {
        super(ID, DESCRIPTION, platformStorage);
    }


    /***************************************************************************
     ************************ CONFIGURATION OPTIONS ****************************
     **************************************************************************/
    @ConfigurationParameter
    public String getHomePage() {
        // TODO: reconsider start page once we have /page servlet in place
        return getString("homePage", ":Start");
    }


    /****************************** VALIDATION ********************************/
    @Override
    public void assertConsistency() {
        // nothing to be done here for now, may implement some sophisticated
        // syntactic checks on strings or interdependencies
    }

    /****************************** LDP ASSETS ********************************/
    @ConfigurationParameter
    public List<String> getRepositoriesLDPSave() {
        return getStringList(
                "repositoriesLDPSave",
                Lists.newArrayList(RepositoryManager.ASSET_REPOSITORY_ID)
            );
    }
    
    @ConfigurationParameter
    public List<String> getRepositoriesLDPLoad() {
        return getStringList(
                "repositoriesLDPLoad",
                Lists.newArrayList(RepositoryManager.ASSET_REPOSITORY_ID)
            );
    }
    
}
