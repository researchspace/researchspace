Object.defineProperty(exports, "__esModule", { value: true });
var sparql_1 = require("platform/api/sparql");
var SearchConfig_1 = require("./SearchConfig");
exports.DefaultInlineProfile = '<http://metaphacts.com/semantic-search/dummyInlineDefaultProfile>';
exports.DefaultProfile = '<http://www.metaphacts.com/ontologies/platform/semantic-search-profile/default-profile>';
exports.DefaultSearchProfileCategoriesQuery = "\n  PREFIX ssp: <http://www.metaphacts.com/ontologies/platform/semantic-search-profile/>\n  PREFIX schema: <http://schema.org/>\n\n  SELECT DISTINCT ?profile ?category ?label ?description ?thumbnail WHERE {\n    {\n      SELECT ?category ?label ?profile ?description ?thumbnail {\n        ?profile ssp:hasCategory ?hasCategory.\n        {\n          ?hasCategory ssp:category ?category .\n          ?category rdf:type ssp:Category ;\n            rdfs:label ?label ;\n            rdfs:label ?description ;\n            schema:thumbnail ?thumbnail ;\n            ssp:order ?order .\n        } UNION {\n          BIND(ssp:TextCategory AS ?category) .\n          BIND(\"text search\" AS ?label) .\n          BIND(\"text search\" AS ?description) .\n          BIND(\"../images/fcs/keywords.svg\" AS ?thumbnail) .\n          BIND(10 AS ?order) .\n        }\n      }\n    } UNION {\n      SELECT ?profile ?category ?label ?description ?thumbnail {\n        ?category rdf:type ssp:Category ;\n          rdfs:label ?label ;\n          rdfs:label ?description ;\n          schema:thumbnail ?thumbnail ;\n          ssp:order ?order .\n        BIND(ssp:default-profile as ?profile) .\n      }\n    } UNION {\n      BIND(ssp:TextCategory as ?category) .\n      BIND(\"text search\" as ?label) .\n      BIND(\"text search\" as ?description) .\n      BIND(\"../images/fcs/keywords.svg\" AS ?thumbnail) .\n      BIND(10 AS ?order) .\n      BIND(ssp:default-profile AS ?profile) .\n    }\n  }\n  ORDER BY ?order\n";
exports.DefaultSearchProfileRelationsQuery = "\n  PREFIX ssp: <http://www.metaphacts.com/ontologies/platform/semantic-search-profile/>\n\n  SELECT DISTINCT ?profile ?relation ?label ?description ?hasDomain ?hasRange ?order WHERE {\n    {\n      SELECT ?profile ?relation ?label ?hasDomain ?hasRange ?description ?orderLabel ?order {\n        ?profile ssp:hasRelation/ssp:relation ?relation.\n          ?relation rdfs:label ?label ;\n          rdfs:label ?description ;\n          ssp:hasDomain ?hasDomain ;\n          ssp:hasRange ?hasRange .\n        OPTIONAL { ?relation ssp:hasBroaderRelation ?broader }.\n        BIND(IF(BOUND(?broader), CONCAT(STR(?broader), \"1\"), CONCAT(STR(?relation), \"0\")) AS ?orderLabel)\n        BIND(IF(BOUND(?broader), 15, 0) AS ?order)\n      }\n    } UNION {\n      SELECT ?profile ?relation ?label ?hasDomain ?hasRange ?description ?orderLabel ?order  {\n        ?relation rdfs:label ?label ;\n          rdfs:label ?description ;\n          ssp:hasDomain ?hasDomain ;\n          ssp:hasRange ?hasRange .\n        BIND(ssp:default-profile as ?profile) .\n        OPTIONAL { ?relation ssp:hasBroaderRelation ?broader }.\n        BIND(IF(BOUND(?broader), CONCAT(STR(?broader), \"1\"), CONCAT(STR(?relation), \"0\")) AS ?orderLabel)\n        BIND(IF(BOUND(?broader), 25, 0) AS ?order)\n      }\n    }\n  }\n  ORDER BY ?orderLabel ?label\n";
function DefaultTextPattern() {
    return {
        'http://www.metaphacts.com/ontologies/platform/semantic-search-profile/TextCategory': [
            {
                kind: 'text',
                queryPattern: "\n           {\n             $subject a ?__domain__ .\n             $subject " + sparql_1.SparqlUtil.preferredLabelPattern() + " ?label .\n             SERVICE <http://www.bigdata.com/rdf/search#search> {\n               ?label bds:search ?__value__ ;\n                      bds:minRelevance \"0.3\" ;\n                      bds:matchAllTerms \"true\"  .\n             }\n           }\n      ",
            },
        ]
    };
}
exports.DefaultTextPattern = DefaultTextPattern;
exports.CategoryViewTemplate = "\n  <div style=\"display: flex; align-items: center;\">\n    {{#if thumbnail}}\n      {{#ifCond thumbnail.length '>' 0}}\n        <div class=\"semantic-search__class-selector-item\">\n          <img src=\"{{thumbnail}}\" />\n        </div>\n      {{/ifCond}}\n    {{/if}}\n    <span>{{label}}</span>\n  </div>\n";
exports.RelationViewTemplate = "\n  <div>\n    {{label}}\n  </div>\n  ";
exports.ResultLimit = 1000;
var DefaultFacetValuesQueries;
(function (DefaultFacetValuesQueries) {
    function forResource() {
        return "\n      SELECT ?value (COUNT(DISTINCT $subject) AS ?count) WHERE {\n        FILTER(?" + SearchConfig_1.FACET_VARIABLES.RELATION_PATTERN_VAR + ")\n      }\n      GROUP BY ?value\n      ORDER BY ?value\n    ";
    }
    DefaultFacetValuesQueries.forResource = forResource;
    function forLiteral() {
        return "\n      SELECT ?literal (COUNT(DISTINCT $subject) AS ?count) WHERE {\n        FILTER(?" + SearchConfig_1.FACET_VARIABLES.RELATION_PATTERN_VAR + ")\n      }\n      GROUP BY ?literal\n      ORDER BY ?literal\n    ";
    }
    DefaultFacetValuesQueries.forLiteral = forLiteral;
    DefaultFacetValuesQueries.ResourceRelationPattern = "$subject ?" + SearchConfig_1.FACET_VARIABLES.RELATION_VAR + " ?value";
    DefaultFacetValuesQueries.LiteralRelationPattern = "$subject ?" + SearchConfig_1.FACET_VARIABLES.RELATION_VAR + " ?literal";
})(DefaultFacetValuesQueries = exports.DefaultFacetValuesQueries || (exports.DefaultFacetValuesQueries = {}));
exports.DefaultFacetValueTemplate = {
    'resource': '<span><mp-highlight highlight="{{highlight}}">{{label.value}}</mp-highlight> ({{count.value}})</span>',
    'literal': '<span><mp-highlight highlight="{{highlight}}">{{literal.value}}</mp-highlight> ({{count.value}})</span>',
};
exports.DefaultFacetRelationTupleTemplate = "\n <div class=\"facet-relation__content\" title=\"{{$relation.label.value}}\">\n   {{$relation.label.value}}\n   {{#if $range.thumbnail}}\n     {{#ifCond $range.thumbnail.value.length '>' 0}}\n       <img class=\"facet__relation__content__category-image\" src=\"{{$range.thumbnail.value}}\"/>\n     {{/ifCond}}\n   {{/if}}\n  </div>\n";
exports.DefaultFacetCategoriesTupleTemplate = "\n  {{#if $category.thumbnail}}\n    {{#ifCond $category.thumbnail.value.length '>' 0}}\n      <div class=\"category-item\" style=\"background-image: url('{{$category.thumbnail.value}}')\"></div>\n    {{else}}\n      <span>{{$category.label.value}}</span>\n    {{/ifCond}}\n  {{else}}\n    <span>{{$category.label.value}}</span>\n  {{/if}}\n";
function DefaultResourceSelectorQuery() {
    return "\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    SELECT DISTINCT ?suggestion ?label WHERE {\n      ?label bds:search ?__token__ ;\n      bds:relevance ?score ;\n      bds:minRelevance \"0.5\" ;\n      bds:matchAllTerms \"true\"  .\n\n      ?suggestion " + sparql_1.SparqlUtil.preferredLabelPattern() + " ?label .\n      FILTER(EXISTS {\n        { FILTER(?" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_PATTERN_VAR + ") }\n      })\n    } ORDER BY DESC(?score)  LIMIT 30\n  ";
}
exports.DefaultResourceSelectorQuery = DefaultResourceSelectorQuery;
exports.DefaultResourceSelectorRelationPattern = "?subject $" + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_VAR + " ?suggestion";
exports.DefaultResourceSelectorSuggestionTemplate = "<span title=\"{{label.value}}\">{{label.value}}</span>";
exports.DefaultResourceSelectorNoSuggestionsTemplate = "<div class=\"suggestion-no-matches\">no matches found</div>";
