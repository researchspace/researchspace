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

package com.metaphacts.plugin;

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
