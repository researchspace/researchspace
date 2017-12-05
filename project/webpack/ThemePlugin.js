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

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    crypto = require('crypto');

module.exports = class {
    constructor(config, defaults) {
        this.config = config;
        this.defaults = defaults;
        this.runtimeThemeFile = path.join(defaults.METAPHACTORY_DIRS.src, 'styling/runtime_theme.scss');
        this.runtimeGlobalsFile = path.join(defaults.METAPHACTORY_DIRS.src, 'styling/runtime_globals.scss');
        const projectTheme =
            this.config.overrides.map(
              project => [
                project,
                path.join(project.rootFolder, 'web/src/main/styling/theme.scss'),
                path.join(project.rootFolder, 'web/src/main/styling/globals.scss')
              ]
            ).find(
                ([project, themeFile]) => fs.lstatSync(themeFile).isFile && project.includeStyles
            );
        this.themeFile = projectTheme ? projectTheme[1] : path.join(defaults.METAPHACTORY_DIRS.src, 'styling/theme.scss');
        this.globalStylesFile = projectTheme ? projectTheme[2] : path.join(defaults.METAPHACTORY_DIRS.src, 'styling/globals.scss');
        console.log('Using theme file: ' + this.themeFile);
        this.checksum = this.getFileHash();
        this.updateRuntimeThemeFile();
    }

    apply(compiler) {
        compiler.plugin('compilation', (compilation) => {
            if (this.checksum !== this.getFileHash()) {
                this.updateRuntimeThemeFile();
                this.checksum = this.getFileHash();
            }
        });
    }

    updateRuntimeThemeFile() {
        fs.writeFileSync(this.runtimeThemeFile, fs.readFileSync(this.themeFile));
        fs.writeFileSync(this.runtimeGlobalsFile, fs.readFileSync(this.globalStylesFile));
    }

    getFileHash() {
        return this.checksumFn(fs.readFileSync(this.themeFile));
    }

    checksumFn(str) {
        return crypto
            .createHash('md5')
            .update(str, 'utf8')
            .digest('hex');
    }
};
