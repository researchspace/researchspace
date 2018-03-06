Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ontodia_1 = require("ontodia");
var sparql_1 = require("platform/api/sparql");
var defaults = {
    dataLabelProperty: sparql_1.SparqlUtil.preferredLabelPattern(),
    extractLabel: false,
};
function noStatsConfig(settings) {
    return {
        getDataProvider: function (options) { return new OptimizingDataProvider(options, tslib_1.__assign({}, ontodia_1.OWLRDFSSettings, defaults, settings)); },
        customizeWorkspace: function (workspace) { },
    };
}
function dBPediaConfig(settings) {
    return {
        getDataProvider: function (options) { return new OptimizingDataProvider(options, tslib_1.__assign({}, ontodia_1.DBPediaSettings, settings)); },
        customizeWorkspace: function (workspace) { },
    };
}
function defaultConfig(settings) {
    return {
        getDataProvider: function (options) { return new OptimizingDataProvider(options, tslib_1.__assign({}, ontodia_1.OWLStatsSettings, defaults, settings)); },
        customizeWorkspace: function (workspace) { },
    };
}
function wikidataConfig(settings) {
    return {
        getDataProvider: function (options) { return new OptimizingDataProvider(options, tslib_1.__assign({}, ontodia_1.WikidataSettings, settings)); },
        customizeWorkspace: function (workspace) {
            var diagram = workspace.getDiagram();
            diagram.registerTemplateResolver(function (types) {
                if (types.indexOf('http://www.wikidata.org/entity/Q6256') !== -1) {
                    return ontodia_1.DefaultElementTemplate;
                }
                else if (types.indexOf('http://www.wikidata.org/entity/Q43229') !== -1) {
                    return ontodia_1.OrganizationTemplate;
                }
            });
            diagram.registerTemplateResolver(function (types) {
                if (types.indexOf('http://www.wikidata.org/entity/Q5') !== -1) {
                    return ontodia_1.PersonTemplate;
                }
            });
            diagram.registerElementStyleResolver(function (types) {
                if (types.indexOf('http://www.wikidata.org/entity/Q43229') !== -1) {
                    return { color: '#77ca98', icon: 'ontodia-organization-icon' };
                }
            });
            diagram.registerElementStyleResolver(function (types) {
                if (types.indexOf('http://www.wikidata.org/entity/Q5') !== -1) {
                    return { color: '#eb7777', icon: 'ontodia-person-icon' };
                }
            });
        },
    };
}
var SUPPORTED_CONFIGS = {
    'default': defaultConfig,
    'nostats': noStatsConfig,
    'wikidata': wikidataConfig,
    'dbpedia': dBPediaConfig,
};
function getConfig(configName, settings) {
    if (configName) {
        var configuration = SUPPORTED_CONFIGS[configName];
        if (!configuration) {
            throw new Error("Unknown Ontodia configuration '" + configName + "'");
        }
        return configuration(settings);
    }
    else {
        return defaultConfig(settings);
    }
}
exports.getConfig = getConfig;
var OptimizingDataProvider = (function (_super) {
    tslib_1.__extends(OptimizingDataProvider, _super);
    function OptimizingDataProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OptimizingDataProvider.prototype.executeSparqlQuery = function (query) {
        var optimizedQuery = query;
        try {
            var parsedQuery = sparql_1.SparqlUtil.parseQuery(query);
            optimizedQuery = sparql_1.SparqlUtil.serializeQuery(parsedQuery);
        }
        catch (err) {
            console.warn('Failed to optimize Ontodia query:');
            console.warn(err);
        }
        return _super.prototype.executeSparqlQuery.call(this, optimizedQuery);
    };
    ;
    return OptimizingDataProvider;
}(ontodia_1.SparqlDataProvider));
