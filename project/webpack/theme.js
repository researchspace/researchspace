/*
 * Copyright (C) 2015-2018, metaphacts GmbH
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

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

/**
 * @typedef {Object} ProjectStyle
 * @property {import('./defaults').WebProject} project
 * @property {string} themeDir
 * @property {string} themeFile
 * @property {string} globalStylesFile
 */

/**
 * @param {ReturnType<import('./defaults')>} defaults
 */
function resolveTheme(defaults) {
  /** @type {Array<ProjectStyle>} */
  const projectStyles = _.reverse(defaults.WEB_PROJECTS).map(project => {
    const themeDir = path.join(project.webDir, 'src/main/styling');
    return {
      project,
      themeDir,
      themeFile: path.join(project.webDir, 'src/main/styling/theme.scss'),
      globalStylesFile: path.join(project.webDir, 'src/main/styling/globals.scss'),
    };
  });

  /** @type {ProjectStyle} */
  let projectStyle;

  const {applyThemeFrom} = defaults.ROOT_BUILD_CONFIG;
  if (applyThemeFrom) {
    projectStyle = projectStyles.find(style => style.project.name === applyThemeFrom);
    if (!projectStyle) {
      throw new Error(`Cannot find project '${applyThemeFrom}' to apply theme from`);
    }
    if (!isThemeExists(projectStyle)) {
      throw new Error(`Project '${applyThemeFrom}' does not contain a theme`);
    }
  } else {
    projectStyle = projectStyles.find(isThemeExists);
  }

  return {
    themeDir: projectStyle ? projectStyle.themeDir : path.join(defaults.METAPHACTORY_DIRS.src, 'styling'),
  };
}

/**
 * @param {ProjectStyle} projectStyle
 */
function isThemeExists(projectStyle) {
  const {themeFile, globalStylesFile} = projectStyle;
  return fs.existsSync(themeFile) || fs.existsSync(globalStylesFile);
}

module.exports = resolveTheme;
