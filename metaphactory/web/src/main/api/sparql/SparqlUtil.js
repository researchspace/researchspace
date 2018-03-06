Object.defineProperty(exports, "__esModule", { value: true });
var sparqljs = require("sparqljs");
var Kefir = require("kefir");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var config_holder_1 = require("platform/api/services/config-holder");
var TypeGuards_1 = require("./TypeGuards");
var Parser = new sparqljs.Parser();
var RegisteredPrefixes = {};
function init(registeredPrefixes) {
    RegisteredPrefixes = registeredPrefixes;
    Parser = new sparqljs.Parser(registeredPrefixes, undefined, { collapseGroups: false });
}
exports.init = init;
var Generator = new sparqljs.Generator();
function guessFileEnding(resultFormat) {
    switch (resultFormat) {
        case 'application/rdf+xml':
            return 'rdf';
        case 'text/turtle':
            return 'ttl';
        case 'application/x-trig':
            return 'trig';
        case 'application/trix':
            return 'trix';
        case 'application/ld+json':
            return 'jsonld';
        case 'text/n3':
            return 'n3';
        case 'text/x-nquads':
            return 'nq';
        case 'application/n-triples':
            return 'nt';
        default:
            return 'application/rdf+xml';
    }
}
exports.guessFileEnding = guessFileEnding;
function getFileEnding(file) {
    return file.name.split('.').pop().toLowerCase().trim();
}
exports.getFileEnding = getFileEnding;
function getMimeType(fileEnding) {
    switch (fileEnding) {
        case 'owl':
            return 'application/rdf+xml';
        case 'rdf':
            return 'application/rdf+xml';
        case 'ttl':
            return 'text/turtle';
        case 'trig':
            return 'application/x-trig';
        case 'trix':
            return 'application/trix';
        case 'jsonld':
            return 'application/ld+json';
        case 'n3':
            return 'text/n3';
        case 'nq':
            return 'text/x-nquads';
        case 'nt':
            return 'text/plain';
        case 'ntriples':
            return 'text/plain';
        default:
            return 'application/rdf+xml';
    }
}
exports.getMimeType = getMimeType;
function addOrChangeLimit(query, limit) {
    query.limit = limit;
    return query;
}
exports.addOrChangeLimit = addOrChangeLimit;
function parseQueryAsync(query) {
    try {
        return Kefir.constant(parseQuery(query));
    }
    catch (e) {
        console.error('Error while parsing the query: ' + e);
        return Kefir.constantError(e);
    }
}
exports.parseQueryAsync = parseQueryAsync;
function parseQuery(query) {
    return Parser.parse(encodeLegacyVars(replaceQueryParams(query)));
}
exports.parseQuery = parseQuery;
function parseQuerySync(query) {
    return parseQuery(query);
}
exports.parseQuerySync = parseQuerySync;
function serializeQuery(query) {
    return decodeLegacyVars(Generator.stringify(query));
}
exports.serializeQuery = serializeQuery;
function validateSelectQuery(query) {
    if (TypeGuards_1.isQuery(query) && query.queryType === 'SELECT') {
        return Kefir.constant(query);
    }
    else {
        return Kefir.constantError(new Error("Invalid SELECT query: " + serializeQuery(query)));
    }
}
exports.validateSelectQuery = validateSelectQuery;
function Sparql(strings) {
    var values = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        values[_i - 1] = arguments[_i];
    }
    return parseQuerySync(strings.raw[0]);
}
exports.Sparql = Sparql;
function replaceQueryParams(query) {
    if (typeof navigation_1.getCurrentResource() === 'undefined') {
        return query;
    }
    else {
        var contextResource = navigation_1.getCurrentResource().value.startsWith('Template:')
            ? '<' + navigation_1.getCurrentResource().value.substr('Template:'.length) + '>'
            : navigation_1.getCurrentResource().toString();
        return query.replace(/\?\?/g, contextResource).replace(/\$_this/g, contextResource);
    }
}
function decodeLegacyVars(query) {
    return query.replace(/\?____/g, '?:');
}
function encodeLegacyVars(query) {
    return query.replace(/\?:/g, '?____');
}
function randomVariableName() {
    return '_' + Math.random().toString(36).substring(7);
}
exports.randomVariableName = randomVariableName;
var LUCENE_ESCAPE_REGEX = /([+\-&|!(){}\[\]^"~*?:\\])/g;
function makeLuceneQuery(inputText) {
    var words = inputText.split(' ')
        .map(function (w) { return w.trim(); })
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w.replace(LUCENE_ESCAPE_REGEX, '\\$1'); })
        .map(function (w) { return w + '*'; }).join(' ');
    return rdf_1.Rdf.literal(words);
}
exports.makeLuceneQuery = makeLuceneQuery;
function parsePatterns(patterns, prefixes) {
    var wrappedPattern = "SELECT * WHERE { " + patterns + " }";
    var parser = prefixes
        ? new sparqljs.Parser(prefixes, undefined, { collapseGroups: false })
        : Parser;
    var query = parser.parse(encodeLegacyVars(replaceQueryParams(wrappedPattern)));
    return query.where;
}
exports.parsePatterns = parsePatterns;
function isSelectResultEmpty(result) {
    var bindings = result.results.bindings;
    return _.isEmpty(bindings) || bindings.length === 1 && _.isEmpty(bindings[0]);
}
exports.isSelectResultEmpty = isSelectResultEmpty;
function resolveIris(iris) {
    if (iris.length === 0) {
        return [];
    }
    var serializedIris = iris.map(function (iri) { return "(" + iri + ")"; }).join(' ');
    var parsed = parseQuery("SELECT * WHERE {} VALUES (?iri) { " + serializedIris + " }");
    return parsed.values.map(function (row) { return rdf_1.Rdf.iri(row['?iri']); });
}
exports.resolveIris = resolveIris;
var IRI_LOCAL_PART = /^[a-zA-Z][\\-_a-zA-Z0-9]*$/;
function compactIriUsingPrefix(iri) {
    var iriValue = iri.value;
    for (var prefix in RegisteredPrefixes) {
        if (!RegisteredPrefixes.hasOwnProperty(prefix)) {
            continue;
        }
        var expandedPrefix = RegisteredPrefixes[prefix];
        if (iriValue.startsWith(expandedPrefix)) {
            var localPart = iriValue.substring(expandedPrefix.length, iriValue.length);
            if (IRI_LOCAL_PART.test(localPart)) {
                return prefix + ':' + localPart;
            }
        }
    }
    return "<" + iriValue + ">";
}
exports.compactIriUsingPrefix = compactIriUsingPrefix;
function preferredLabelPattern() {
    var preferredLabels = config_holder_1.ConfigHolder.getUIConfig().preferredLabels;
    return preferredLabels.value.join('|');
}
exports.preferredLabelPattern = preferredLabelPattern;
