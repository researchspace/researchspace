Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
exports.DefaultLightweightPatterns = {
    schemePattern: '?item <http://www.w3.org/2004/02/skos/core#inScheme> ?__scheme__',
    relationPattern: '?item <http://www.w3.org/2004/02/skos/core#broader> ?parent',
};
function createDefaultTreeQueries(params) {
    if (params === void 0) { params = {}; }
    var _a = params.schemePattern, schemePattern = _a === void 0 ? exports.DefaultLightweightPatterns.schemePattern : _a, _b = params.relationPattern, relationPattern = _b === void 0 ? exports.DefaultLightweightPatterns.relationPattern : _b;
    var prefixes = sparql_1.SparqlUtil.parseQuery('SELECT * WHERE {}').prefixes;
    var relation = typeof relationPattern === 'string'
        ? sparql_1.SparqlUtil.parsePatterns(relationPattern, prefixes) : relationPattern;
    var scheme = [];
    if (params.scheme || params.schemePattern) {
        scheme = typeof schemePattern === 'string'
            ? sparql_1.SparqlUtil.parsePatterns(schemePattern, prefixes) : schemePattern;
        if (params.scheme) {
            var schemeIri = typeof params.scheme === 'string' ? rdf_1.Rdf.iri(params.scheme) : params.scheme;
            var binder_1 = new sparql_1.VariableBinder({ __scheme__: schemeIri });
            scheme.forEach(function (p) { return binder_1.pattern(p); });
        }
    }
    var patterns = { relation: relation, scheme: scheme };
    return {
        rootsQuery: sparql_1.SparqlUtil.serializeQuery(createRootsQuery(patterns)),
        childrenQuery: sparql_1.SparqlUtil.serializeQuery(createChildrenQuery(patterns)),
        parentsQuery: sparql_1.SparqlUtil.serializeQuery(createParentsQuery(patterns)),
        searchQuery: sparql_1.SparqlUtil.serializeQuery(createSearchQuery(patterns)),
    };
}
exports.createDefaultTreeQueries = createDefaultTreeQueries;
function createRootsQuery(_a) {
    var relation = _a.relation, scheme = _a.scheme;
    var query = sparql_1.SparqlUtil.parseQuery("\n    SELECT DISTINCT ?item ?label ?hasChildren WHERE {\n      FILTER(?__scheme__)\n      FILTER NOT EXISTS { { FILTER(?__relation__) } }\n      ?item skos:prefLabel ?label .\n      OPTIONAL { FILTER(?__childRelation__) }\n      BIND(bound(?child) as ?hasChildren)\n    } ORDER BY ?label\n  ");
    var childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
    new sparql_1.PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
    new sparql_1.PatternBinder('__relation__', relation).sparqlQuery(query);
    new sparql_1.PatternBinder('__scheme__', scheme).sparqlQuery(query);
    return query;
}
function createChildrenQuery(_a) {
    var relation = _a.relation, scheme = _a.scheme;
    var query = sparql_1.SparqlUtil.parseQuery("\n    SELECT DISTINCT ?item ?label ?hasChildren WHERE {\n      FILTER(?__relation__)\n      FILTER(?__scheme__)\n      ?item skos:prefLabel ?label .\n      OPTIONAL { FILTER(?__childRelation__) }\n      BIND(bound(?child) as ?hasChildren)\n    } ORDER BY ?label\n  ");
    var childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
    new sparql_1.PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
    new sparql_1.PatternBinder('__relation__', relation).sparqlQuery(query);
    new sparql_1.PatternBinder('__scheme__', scheme).sparqlQuery(query);
    return query;
}
function createParentsQuery(_a) {
    var relation = _a.relation, scheme = _a.scheme;
    var query = sparql_1.SparqlUtil.parseQuery("\n    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n    select distinct ?item ?parent ?parentLabel where {\n      FILTER(?__parentScheme__)\n      FILTER(?__relation__)\n      ?parent skos:prefLabel ?parentLabel .\n    }\n  ");
    var parentScheme = bindTreePatterns(scheme, { itemVar: 'parent' });
    new sparql_1.PatternBinder('__parentScheme__', parentScheme).sparqlQuery(query);
    new sparql_1.PatternBinder('__relation__', relation).sparqlQuery(query);
    return query;
}
function createSearchQuery(_a) {
    var relation = _a.relation, scheme = _a.scheme;
    var query = sparql_1.SparqlUtil.parseQuery("\n    PREFIX bds: <http://www.bigdata.com/rdf/search#>\n    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n    SELECT DISTINCT ?item ?label ?score ?hasChildren WHERE {\n      FILTER(?__scheme__)\n      ?item skos:prefLabel ?label.\n      ?label bds:search ?__token__ ;\n            bds:minRelevance \"0.3\" ;\n            bds:relevance ?score ;\n            bds:matchAllTerms \"true\"  .\n      OPTIONAL { FILTER(?__childRelation__) }\n      BIND(BOUND(?child) AS ?hasChildren)\n    }\n    ORDER BY DESC(?score) ?label\n    LIMIT 200\n  ");
    var childRelation = bindTreePatterns(relation, { itemVar: 'child', parentVar: 'item' });
    new sparql_1.PatternBinder('__childRelation__', childRelation).sparqlQuery(query);
    new sparql_1.PatternBinder('__scheme__', scheme).sparqlQuery(query);
    return query;
}
function bindTreePatterns(treePattern, _a) {
    var itemVar = _a.itemVar, parentVar = _a.parentVar;
    var patternClone = lodash_1.cloneDeep(treePattern);
    if (itemVar !== 'item') {
        var sourceRenamer_1 = new sparql_1.VariableRenameBinder('item', itemVar);
        patternClone.forEach(function (p) { return sourceRenamer_1.pattern(p); });
    }
    if (parentVar && parentVar !== 'parent') {
        var targetRenamer_1 = new sparql_1.VariableRenameBinder('parent', parentVar);
        patternClone.forEach(function (p) { return targetRenamer_1.pattern(p); });
    }
    return patternClone;
}
