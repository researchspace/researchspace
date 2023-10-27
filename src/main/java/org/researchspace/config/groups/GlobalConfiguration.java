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

package org.researchspace.config.groups;

import java.util.List;

import javax.inject.Inject;

import org.researchspace.config.ConfigurationParameter;
import org.researchspace.config.InvalidConfigurationException;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.storage.api.PlatformStorage;

import com.google.common.collect.Lists;

/**
 * Configuration group for global system configuration, affecting system startup
 * and global system functionality.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class GlobalConfiguration extends ConfigurationGroupBase {

    private final static String ID = "global";

    // TODO: outline using locale
    private final static String DESCRIPTION = "Global system configuration, affecting system startup and global system functionality.";

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
        return getStringList("repositoriesLDPSave", Lists.newArrayList(RepositoryManager.ASSET_REPOSITORY_ID));
    }

    @ConfigurationParameter
    public List<String> getRepositoriesLDPLoad() {
        return getStringList("repositoriesLDPLoad", Lists.newArrayList(RepositoryManager.ASSET_REPOSITORY_ID));
    }

    public List<String> getForceLDPLoadFromStorages() {
        return getStringList("forceLDPLoadFromStorages");
    }

}
