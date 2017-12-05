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
    glob = require('glob'),
    fs = require('fs'),
    _ = require('lodash'),
    HappyPack = require('happypack'),
    ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = function(buildConfig) {
  const ROOT_DIR = path.join(__dirname, '../..'); // folder with metaphactory and all extensions
  const METAPHACTORY_ROOT_DIR = path.join(ROOT_DIR, 'metaphactory/web'); // metaphactory code root
  const METAPHACTORY_DIRS = {
    src: path.join(METAPHACTORY_ROOT_DIR, 'src/main'),
    test: path.join(METAPHACTORY_ROOT_DIR, 'src/test')
  };
  const DIST = path.join(__dirname, 'assets');

  const extensionsProjects = buildConfig.projects.filter(p => p.name !== 'metaphactory');
  const extensionsRootDirs = extensionsProjects.map(p => p.rootDir);
  const extensionsWebDirs = extensionsRootDirs.map(dir => path.join(dir, 'web'));
  const extensionAliases =
        _.fromPairs(
          _.map(
            _.zip(extensionsProjects.map(p => p.name), extensionsWebDirs),
            ([extensionName, webDir]) => [extensionName, path.join(webDir, "src/main")]
          )
        );
  extensionAliases['metaphactory'] = METAPHACTORY_DIRS.src;
  const allRootDirs = [METAPHACTORY_ROOT_DIR].concat(extensionsWebDirs);
  const srcs = allRootDirs.map(dir => path.join(dir, 'src/main'));
  const tests = allRootDirs.map(dir => path.join(dir, 'src/test'));
  function tsHappyPack(tsLoader) {
    const tsOptions = tsLoader.options;
    tsLoader.loader = 'happypack/loader?id=ts';
    delete tsLoader.options;

    return new HappyPack({
      id: 'ts',
      threads: 2,
      loaders: [ 'ts-loader?' + JSON.stringify(tsOptions)]
    });
  }

  function tsTypeCheck(failOnError) {
    return new ForkTsCheckerWebpackPlugin({
      watch: srcs,
      tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
      blockEmit: failOnError,
      tslint: false
    });
  }

  return {
    EXTENSION_ALIASES: extensionAliases,
    ALL_ROOT_DIRS: allRootDirs,
    ROOT_DIR: ROOT_DIR,
    METAPHACTORY_ROOT_DIR: METAPHACTORY_ROOT_DIR,
    METAPHACTORY_DIRS: METAPHACTORY_DIRS,
    DIST: DIST,
    EXTENSIONS_WEB_DIRS: extensionsWebDirs,
    SRC_DIRS: srcs,
    TEST_DIRS: tests,

    tsTypeCheck: tsTypeCheck,
    tsHappyPack: tsHappyPack
  };
};
