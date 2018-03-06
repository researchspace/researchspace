Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var moment = require("moment");
var uuid = require("uuid");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var Model = require("./Model");
var SearchConfig_1 = require("../../config/SearchConfig");
var XSD_DATE_FORMAT = 'YYYY-MM-DD';
function DEFAULT_QUERY_PATTERN(resultProjectinVar) {
    return resultProjectinVar + " ?" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_VAR + " ?" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR + " .";
}
var DEFAULT_SET_QUERY_PATTERN = "\n   ?" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.SET_VAR + " " + rdf_1.vocabularies.ldp.contains + "/" + rdf_1.vocabularies.VocabPlatform.setItem + " ?" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR + " .\n";
function resourceDisjunct(disjunct) {
    return _a = {}, _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR] = disjunct.value.iri, _a;
    var _a;
}
function setDisjunct(disjucnct) {
    return _a = {}, _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.SET_VAR] = disjucnct.value.iri, _a;
    var _a;
}
function textDisjunct(config, conjunct) {
    var patternConfig = SearchConfig_1.getConfigPatternForCategory(config, conjunct.range.iri);
    var escapeLuceneSyntax = !(patternConfig && patternConfig.escapeLuceneSyntax === false);
    return function (disjunct) {
        var val = escapeLuceneSyntax ? sparql_1.SparqlUtil.makeLuceneQuery(disjunct.value) : rdf_1.Rdf.literal(disjunct.value);
        return _a = {}, _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR] = val, _a;
        var _a;
    };
}
function dateDisjunct(disjunct) {
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(disjunct.value),
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(disjunct.value),
        _a;
    var _a;
}
function dateRangeDisjunct(disjunct) {
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(disjunct.value.begin),
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(disjunct.value.end),
        _a;
    var _a;
}
function dateDeviationDisjunct(disjunct) {
    var _a = disjunct.value, date = _a.date, deviation = _a.deviation;
    return _b = {},
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(date.clone().subtract(deviation, 'days')),
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(date.clone().add(deviation, 'days')),
        _b;
    var _b;
}
function yearDisjunct(disjunct) {
    var _a = disjunct.value, year = _a.year, epoch = _a.epoch;
    var yearValue = year * (epoch === 'AD' ? 1 : -1);
    var begin = moment({ year: yearValue, month: 0, day: 1 });
    var end = moment({ year: yearValue, month: 11, day: 31 });
    return _b = {},
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(begin),
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(end),
        _b;
    var _b;
}
function yearRangeDisjunct(disjunct) {
    var _a = disjunct.value, begin = _a.begin, end = _a.end;
    var yearStartValue = begin.year * (begin.epoch === 'AD' ? 1 : -1);
    var beginValue = moment({ year: yearStartValue, month: 0, day: 1 });
    var yearEndValue = end.year * (end.epoch === 'AD' ? 1 : -1);
    var endValue = moment({ year: yearEndValue, month: 11, day: 31 });
    return _b = {},
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(beginValue),
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(endValue),
        _b;
    var _b;
}
function yearDeviationDisjunct(disjunct) {
    var _a = disjunct.value, year = _a.year, deviation = _a.deviation;
    var yearValue = year.year * (year.epoch === 'AD' ? 1 : -1);
    var yearFullDate = moment({ year: yearValue });
    var begin = yearFullDate.clone().startOf('year').subtract(deviation, 'years');
    var end = yearFullDate.clone().endOf('year').add(deviation, 'years');
    return _b = {},
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR] = createDateLiteral(begin),
        _b[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR] = createDateLiteral(end),
        _b;
    var _b;
}
function distanceDisjunct(disjunct) {
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.GEO_CENTER_VAR] = coordToBlazegraphLiteral(disjunct.value.center),
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.GEO_DISTANCE_VAR] = rdf_1.Rdf.literal(disjunct.value.distance),
        _a;
    var _a;
}
function boundingBoxDisjunct(disjunct) {
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.GEO_SOUTH_WEST] = coordToBlazegraphLiteral(disjunct.value.southWest),
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.GEO_NORTH_EAST] = coordToBlazegraphLiteral(disjunct.value.northEast),
        _a;
    var _a;
}
function literalDisjunct(disjunct) {
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.LITERAL_VAR] = disjunct.value.literal,
        _a;
    var _a;
}
function numericRangeDisjunct(disjunct) {
    var doubleType = rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema#double');
    return _a = {},
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.NUMERIC_RANGE_BEGIN_VAR] = rdf_1.Rdf.literal('' + disjunct.value.begin, doubleType),
        _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.NUMERIC_RANGE_END_VAR] = rdf_1.Rdf.literal('' + disjunct.value.end, doubleType),
        _a;
    var _a;
}
function createDateLiteral(date) {
    return rdf_1.Rdf.literal(fixZeroYearIssue(date).format(XSD_DATE_FORMAT), rdf_1.vocabularies.xsd.date);
}
function coordToBlazegraphLiteral(coord) {
    return rdf_1.Rdf.literal(coord.lat + "#" + coord.long);
}
function fixZeroYearIssue(date) {
    return date.year() === 0 ? date.subtract(1, 'year') : date;
}
function disjunctToVariables(config, conjunct) {
    return Model.matchDisjunct({
        Resource: resourceDisjunct,
        Set: setDisjunct,
        Search: function () { return ({}); },
        SavedSearch: function () { return ({}); },
        Date: dateDisjunct,
        DateRange: dateRangeDisjunct,
        DateDeviation: dateDeviationDisjunct,
        Year: yearDisjunct,
        YearRange: yearRangeDisjunct,
        YearDeviation: yearDeviationDisjunct,
        Text: textDisjunct(config, conjunct),
        Distance: distanceDisjunct,
        BoundingBox: boundingBoxDisjunct,
        Literal: literalDisjunct,
        NumericRange: numericRangeDisjunct,
    });
}
function tryGetRelationPatterns(config, relation, range) {
    if (range === void 0) { range = relation.hasRange; }
    if (_.has(config.relations, relation.iri.toString())) {
        return config.relations[relation.iri.toString()];
    }
    else if (_.has(config.categories, range.iri.toString())) {
        return config.categories[range.iri.toString()];
    }
    else {
        return [];
    }
}
exports.tryGetRelationPatterns = tryGetRelationPatterns;
function getMatchingPattern(config, projectionVariable, conjunct, disjunct) {
    var range = conjunct.range;
    return Model.matchConjunct({
        Relation: function (conj) {
            var relation = conj.relation;
            var patterns = tryGetRelationPatterns(config, relation, range);
            if (patterns.length === 0) {
                if (Model.isSetDisjunct(disjunct)) {
                    return applySetPattern(DEFAULT_QUERY_PATTERN(projectionVariable), DEFAULT_SET_QUERY_PATTERN);
                }
                else {
                    return DEFAULT_QUERY_PATTERN(projectionVariable);
                }
            }
            if (Model.isTemporalDisjunct(disjunct)) {
                return _.find(patterns, function (pattern) { return pattern.kind = 'date-range'; }).queryPattern;
            }
            else if (Model.isSpatialDisjunct(disjunct)) {
                switch (disjunct.kind) {
                    case Model.SpatialDisjunctKinds.Distance:
                        return _.find(patterns, function (pattern) { return pattern.kind === 'place'; })['distanceQueryPattern'];
                    case Model.SpatialDisjunctKinds.BoundingBox:
                        return _.find(patterns, function (pattern) { return pattern.kind === 'place'; })['boundingBoxQueryPattern'];
                }
            }
            else {
                var hierarchyPattern = _.find(patterns, function (pattern) { return pattern.kind === 'hierarchy'; });
                var resourcePattern = _.find(patterns, function (pattern) { return pattern.kind === 'resource'; });
                var setPattern = _.find(patterns, function (pattern) { return pattern.kind === 'set'; });
                var literalPattern = _.find(patterns, function (pattern) { return pattern.kind === 'literal'; });
                var numericRangePattern = _.find(patterns, function (pattern) { return pattern.kind === 'numeric-range'; });
                if (Model.isSetDisjunct(disjunct)) {
                    if (hierarchyPattern) {
                        return applySetPattern(hierarchyPattern.queryPattern, setPattern ? setPattern.queryPattern : DEFAULT_SET_QUERY_PATTERN);
                    }
                    else if (resourcePattern) {
                        return applySetPattern(resourcePattern.queryPattern, setPattern ? setPattern.queryPattern : DEFAULT_SET_QUERY_PATTERN);
                    }
                    else {
                        return applySetPattern(DEFAULT_QUERY_PATTERN(projectionVariable), DEFAULT_SET_QUERY_PATTERN);
                    }
                }
                else {
                    if (hierarchyPattern) {
                        return hierarchyPattern.queryPattern;
                    }
                    else if (resourcePattern) {
                        return resourcePattern.queryPattern;
                    }
                    else if (literalPattern) {
                        return literalPattern.queryPattern;
                    }
                    else if (numericRangePattern) {
                        return numericRangePattern.queryPattern;
                    }
                    else {
                        return DEFAULT_QUERY_PATTERN(projectionVariable);
                    }
                }
            }
        },
        Text: function () { return SearchConfig_1.getConfigPatternForCategory(config, range.iri).queryPattern; },
    })(conjunct);
}
function applySetPattern(relationPattern, setPattern) {
    return setPattern + relationPattern;
}
function getGenericVariables(domain, conjunct) {
    return Model.matchConjunct({
        Relation: function (conj) {
            return (_a = {},
                _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR] = domain.iri,
                _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RANGE_VAR] = conj.range.iri,
                _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_VAR] = conj.relation.iri,
                _a);
            var _a;
        },
        Text: function () {
            return (_a = {}, _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR] = domain.iri, _a);
            var _a;
        },
    })(conjunct);
}
function parseQueryPattern(queryPattern, projectionVariable) {
    var query = sparql_1.SparqlUtil.parseQuerySync("SELECT * {{ " + queryPattern + " }}");
    return rewriteProjectionVariable(query, projectionVariable);
}
var Randomizer = (function (_super) {
    tslib_1.__extends(Randomizer, _super);
    function Randomizer(subjectVariable, rewriteSubjectVariable) {
        var _this = _super.call(this) || this;
        _this.variablesMap = {};
        _this.subjectVariable = subjectVariable;
        _this.rewriteSubjectVariable = rewriteSubjectVariable;
        return _this;
    }
    Randomizer.prototype.variableTerm = function (variable) {
        if (variable === this.subjectVariable) {
            return this.rewriteSubjectVariable ? this.rewriteSubjectVariable : variable;
        }
        if (!_.has(this.variablesMap, variable)) {
            this.variablesMap[variable] = variable + '_' + uuid.v4().replace(/-/g, '_');
        }
        return this.variablesMap[variable];
    };
    return Randomizer;
}(sparql_1.QueryVisitor));
function randomizeVariables(query, subjectVariable, rewriteSubjectVariable) {
    (new Randomizer(subjectVariable, rewriteSubjectVariable)).query(query);
    return query;
}
function disjunctToQueryPattern(config, projectionVariable, domain) {
    return function (conjunct) {
        return function (disjunct) {
            if (disjunct.kind === Model.EntityDisjunctKinds.Search) {
                return complexDisjunctToQueryPattern(config, projectionVariable, domain, conjunct, disjunct);
            }
            if (disjunct.kind === Model.EntityDisjunctKinds.SavedSearch) {
                return nestedQueryPattern(config, projectionVariable, domain, disjunct.value.query, conjunct, disjunct);
            }
            else {
                return simpleDisjunctToQueryPattern(config, projectionVariable, domain, conjunct, disjunct);
            }
        };
    };
}
exports.disjunctToQueryPattern = disjunctToQueryPattern;
function complexDisjunctToQueryPattern(config, projectionVariable, domain, conjunct, disjunct) {
    var nestedQuery = generateSelectQueryPattern(projectionVariable, config, disjunct.value);
    return nestedQueryPattern(config, projectionVariable, domain, nestedQuery, conjunct, disjunct);
}
function nestedQueryPattern(config, projectionVariable, domain, nestedQuery, conjunct, disjunct) {
    var patternQuery = simpleDisjunctPatternQuery(config, projectionVariable, domain, conjunct, disjunct);
    var patterns = patternQuery.where;
    patterns.unshift.apply(patterns, randomizeVariables(nestedQuery, projectionVariable, '?' + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR).where);
    patternQuery.where = [{ 'type': 'group', patterns: patterns }];
    return randomizeVariables(patternQuery, projectionVariable).where[0];
}
function simpleDisjunctToQueryPattern(config, projectionVariable, domain, conjunct, disjunct) {
    var patternQuery = simpleDisjunctPatternQuery(config, projectionVariable, domain, conjunct, disjunct);
    return randomizeVariables(patternQuery, projectionVariable).where[0];
}
function simpleDisjunctPatternQuery(config, projectionVariable, domain, conjunct, disjunct) {
    var pattern = getMatchingPattern(config, projectionVariable, conjunct, disjunct);
    var parsedPattern = parseQueryPattern(pattern, projectionVariable);
    var parameters = _.assign(getGenericVariables(domain, conjunct), disjunctToVariables(config, conjunct)(disjunct));
    return sparql_1.SparqlClient.setBindings(parsedPattern, parameters);
}
function conjunctToQueryPattern(config, projectionVariable, domain) {
    return function (conjunct) {
        var patterns = _.map(conjunct.disjuncts, disjunctToQueryPattern(config, projectionVariable, domain)(conjunct));
        var flattenedPatterns = _.map(patterns, function (pattern) {
            if (sparql_1.SparqlTypeGuards.isBlockPattern(pattern) && pattern.patterns.length === 1) {
                return pattern.patterns[0];
            }
            else {
                return pattern;
            }
        });
        if (flattenedPatterns.length === 1) {
            return flattenedPatterns[0];
        }
        else {
            return {
                'type': 'union',
                'patterns': flattenedPatterns,
            };
        }
    };
}
exports.conjunctToQueryPattern = conjunctToQueryPattern;
function conjunctsToQueryPatterns(config, projectionVariable, domain, conjuncts) {
    var patterns = _.map(conjuncts, conjunctToQueryPattern(config, projectionVariable, domain));
    return _.flatten(_.map(patterns, function (pattern) {
        if (sparql_1.SparqlTypeGuards.isGroupPattern(pattern)) {
            return pattern.patterns;
        }
        else {
            return pattern;
        }
    }));
}
exports.conjunctsToQueryPatterns = conjunctsToQueryPatterns;
function generateSelectQueryPattern(projectionVariable, config, search) {
    var patterns = conjunctsToQueryPatterns(config, projectionVariable, search.domain, search.conjuncts);
    return {
        prefixes: {},
        type: 'query',
        'queryType': 'SELECT',
        'variables': [projectionVariable],
        'where': patterns,
    };
}
function rewriteProjectionVariable(query, projectionVariable) {
    var result = sparql_1.cloneQuery(query);
    (new (function (_super) {
        tslib_1.__extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.variableTerm = function (variable) {
            if (variable.substring(1) === SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.PROJECTION_ALIAS_VAR) {
                return projectionVariable;
            }
        };
        return class_1;
    }(sparql_1.QueryVisitor))).query(result);
    return result;
}
exports.rewriteProjectionVariable = rewriteProjectionVariable;
function generateSelectQuery(config, projectionVariableName, search) {
    var projectionVariable = '?' + projectionVariableName;
    var patterns = conjunctsToQueryPatterns(config, projectionVariable, search.domain, search.conjuncts);
    return {
        prefixes: {},
        type: 'query',
        'queryType': 'SELECT',
        distinct: true,
        'variables': [projectionVariable],
        'where': patterns,
        'limit': config.limit,
    };
}
exports.generateSelectQuery = generateSelectQuery;
function blazegraphNoOptimizePattern() {
    return {
        type: 'bgp',
        triples: [{
                subject: 'http://www.bigdata.com/queryHints#Query',
                predicate: 'http://www.bigdata.com/queryHints#optimizer',
                object: '"None"',
            }],
    };
}
exports.blazegraphNoOptimizePattern = blazegraphNoOptimizePattern;
