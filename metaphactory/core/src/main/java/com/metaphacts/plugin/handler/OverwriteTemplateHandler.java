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

package com.metaphacts.plugin.handler;

import java.io.File;
import java.nio.file.Path;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.metaphacts.config.Configuration;

/**
 * <strong>Overrides</strong> platform template and application pages
 * from plugin to platform template directory.
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class OverwriteTemplateHandler extends TemplateBaseInstallationHandler {
    private static final Logger logger = LogManager.getLogger(OverwriteTemplateHandler.class);
    
    public OverwriteTemplateHandler(Configuration config, Path pluginBasePath) {
        super(config, pluginBasePath);
    }

    @Override
    public void install() {
        final File templateSrcDir= getPluginTemplateDir();
        final File templateDestDir = getPlatformTemplateDir();
        
        CopyUtils.copyFromSrcDirToDstDirOverride(templateSrcDir, templateDestDir, getTemplateFileNameFilter(), logger);
    }


}