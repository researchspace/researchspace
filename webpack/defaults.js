/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2018, metaphacts GmbH
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

const path = require('path');
const fs = require('fs');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = function() {
    const ROOT_DIR = path.join(__dirname, '../');
    const DIST = path.join(ROOT_DIR, 'src/main/webapp/assets');
    const SRC = path.join(ROOT_DIR, 'src/main/web');
    const TEST = path.join(ROOT_DIR, 'src/test/web');

    const PROJECT = {
        "aliases": {
            "platform/app": "app",
            "platform/api": "api",
            "platform/components": "components",
            "platform/styling": "styling",
            "platform": "",
            "basic-styles.scss": "styling/basic.scss"
        },
        "cssModulesBasedComponents": [
            "src/main/web/components/admin/config-manager",
            "src/main/web/components/admin/namespace-manager",
            "src/main/web/components/admin/repositories",
            "src/main/web/components/admin/log-browser",
            "src/main/web/components/3-rd-party/ontodia",
            "src/main/web/components/dnd",
            "src/main/web/components/documentation",
            "src/main/web/components/language-switch",
            "src/main/web/components/persistence",
            "src/main/web/components/semantic/lazy-tree",
            "src/main/web/components/semantic/radar-plot",
            "src/main/web/components/semantic/tree",
            "src/main/web/components/sets/views",
            "src/main/web/components/ui/highlight",
            "src/main/web/components/ui/reorderable-list",
            "src/main/web/components/forms/file-manager",
            "src/main/web/components/workflow",
            "src/main/web/components/sparql-editor",
            "src/main/components/alignment",
            "src/main/components/arguments",
            "src/main/components/arguments/premise",
            "src/main/components/collapsible",
            "src/main/components/panel-system",
            "src/main/components/search/configuration",
            "src/main/components/search/date",
            "src/main/components/search/facet/breadcrumbs",
            "src/main/components/search/facet/slider",
            "src/main/components/search/query-builder",
            "src/main/components/search/web-components",
            "src/main/components/text-annotation",
            "src/main/components/timeline",
            "src/main/components/dashboard"
        ]
    };

    // resolve aliases path
    Object.keys(PROJECT.aliases).forEach(key => {
        const alias = PROJECT.aliases[key];
        PROJECT.aliases[key] = path.join(SRC, alias);
    });

    // resolve css modules path
    const cssModulesBasedComponents = [];
    for (const componentDir of PROJECT.cssModulesBasedComponents) {
        cssModulesBasedComponents.push(
            path.resolve(SRC, componentDir)
        );
    }
    PROJECT.cssModulesBasedComponents = cssModulesBasedComponents;

    function tsTypeCheck(failOnError) {
        return new ForkTsCheckerWebpackPlugin({
            useTypescriptIncrementalApi: true,
            watch: SRC,
            tsconfig: path.resolve(__dirname, '../tsconfig.json'),
            blockEmit: failOnError,
            checkSyntacticErrors: true,
            tslint: false
        });
    }

    return {
        ROOT_DIR,
        DIST,
        SRC,
        TEST,
        PROJECT,
        tsTypeCheck: tsTypeCheck,
    };
};
