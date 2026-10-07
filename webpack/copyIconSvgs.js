/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Knowledge map export cannot use the icon font, so it looks icons up as
// shipped SVG paths instead — see
// src/main/web/components/3-rd-party/ontodia/ExportIcons.ts.
// Only the styles knowledge map cards render are copied.

const fs = require('fs');
const path = require('path');

const STYLES = ['rounded'];
const PACKAGE = '@material-symbols/svg-400';

const ROOT_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'src', 'main', 'webapp', 'assets', 'material-symbols');

let sourceDir;
try {
  sourceDir = path.dirname(require.resolve(`${PACKAGE}/package.json`, {paths: [ROOT_DIR]}));
} catch (err) {
  console.warn(`${PACKAGE} is not installed, skipping icon SVGs for knowledge map export`);
  process.exit(0);
}

fs.rmSync(TARGET_DIR, {recursive: true, force: true});
for (const style of STYLES) {
  fs.cpSync(path.join(sourceDir, style), path.join(TARGET_DIR, style), {
    recursive: true,
    filter: source => !source.endsWith('-fill.svg'),
  });
}
