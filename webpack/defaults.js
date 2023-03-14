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
            "basic-styles.scss": "styling/basic.scss",
            "ontodia": "ontodia/src/ontodia"
        },
        "cssModulesBasedComponents": [
            "components/admin/config-manager",
            "components/admin/namespace-manager",
            "components/admin/repositories",
            "components/admin/log-browser",
            "components/3-rd-party/ontodia",
            "components/dnd",
            "components/documentation",
            "components/language-switch",
            "components/persistence",
            "components/semantic/lazy-tree",
            "components/semantic/radar-plot",
            "components/semantic/tree",
            "components/sets/views",
            "components/ui/highlight",
            "components/ui/reorderable-list",
            "components/forms/file-manager",
            "components/workflow",
            "components/sparql-editor",
            "components/alignment",
            "components/arguments",
            "components/arguments/premise",
            "components/collapsible",
            "components/panel-system",
            "components/search/configuration",
            "components/search/date",
            "components/search/facet/breadcrumbs",
            "components/search/facet/slider",
            "components/search/query-builder",
            "components/search/web-components",
            "components/text-annotation",
            "components/timeline",
            "components/dashboard",
            "components/text-editor",
            "components/forms/inputs/drop"
        ],
        jsonSchemTypes: [
            "TextAnnotationTemplateBindings",
            "TextAnnotationTypeOptions",
            "TextAnnotationWorkspaceProps",
            "SemanticConfigProps",
            "ChartTooltipData",
            "FileInputConfig",
            "OntodiaConfig",
            "OntodiaEventData",
            "OntodiaFieldConfigurationConfig",
            "OntodiaEntityMetadataProps",
            "SemanticCarouselConfig",
            "SemanticChartConfig",
            "SemanticFacetConfig",
            "SemanticFormBasedQueryConfig",
            "SemanticGraphBreadthFirstLayoutConfig",
            "SemanticGraphCircleLayoutConfig",
            "SemanticGraphConcentricLayoutConfig",
            "SemanticGraphConfig",
            "SemanticGraphCoseBilkentLayoutConfig",
            "SemanticGraphCoseLayoutConfig",
            "SemanticGraphExpandCollapseExtensionConfig",
            "SemanticGraphNavigatorExtensionConfig",
            "SemanticGraphPanZoomExtensionConfig",
            "SemanticGraphPresetLayoutConfig",
            "SemanticMapConfig",
            "SemanticQueryBuilderConfig",
            "SemanticQueryConfig",
            "SemanticSearchConfig",
            "SemanticSearchKeywordConfig",
            "SemanticSearchQueryConstantConfig",
            "SemanticSimpleSearchConfig",
            "SemanticTableConfig",
            "SemanticTimelineConfig",
            "SemanticTreeConfig",
            "SigmaGraphConfig",
            "SplitPaneConfig",
            "BuiltInEventData",
            "EventProxyConfig",
            "EventTargetRefreshConfig",
            "EventTargetTemplateRenderConfig",
            "EventTriggerConfig",
            "RedirectActionProps",
            "DashboardLinkedViewConfig",
            "DashboardViewConfig",
            "FieldInputOverrideConfig",
            "ImageGraphAuthoringConfig",
            "WorkflowCreateConfig"
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
