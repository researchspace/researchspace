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

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import ro.fortsoft.pf4j.DefaultPluginRepository;
import ro.fortsoft.pf4j.PluginException;
import ro.fortsoft.pf4j.util.ZipFileFilter;

public class PlatformPluginRepository extends DefaultPluginRepository {
    public PlatformPluginRepository(Path pluginsRoot, boolean development) {
        super(pluginsRoot, development);
    }

    private static final Logger logger = LogManager.getLogger(PlatformPluginRepository.class);

    @Override
    public List<Path> getPluginPaths() {
        // expand plugins zip files
        File[] pluginZips = pluginsRoot.toFile().listFiles(new ZipFileFilter());
        if ((pluginZips != null) && pluginZips.length > 0) {
            for (File pluginZip : pluginZips) {
                try {
                    PluginZipUtils.expandAndDeleteIfValidZipApp(pluginZip.toPath());
                } catch (IOException | PluginException e) {
                    logger.error("Cannot expand plugin zip '{}'", pluginZip);
                    logger.error(e.getMessage());
                    logger.debug("Details: {}", e);
                }
            }
        }

        return super.getPluginPaths();
    }

}
