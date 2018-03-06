var assign = require("object-assign");
var Kefir = require("kefir");
var _ = require("lodash");
var URI = require("urijs");
var SparqlUtil_1 = require("./SparqlUtil");
var QueryVisitor_1 = require("./QueryVisitor");
var QueryBinder_1 = require("./QueryBinder");
var turtle = require("../rdf/formats/turtle");
var Rdf = require("../rdf/core/Rdf");
var streamingHttp = require("../sparql/streamingHttp");
var request = require("superagent");
var SparqlClient;
(function (SparqlClient) {
    var SparqlOperationType;
    (function (SparqlOperationType) {
        SparqlOperationType[SparqlOperationType["QUERY"] = 0] = "QUERY";
        SparqlOperationType[SparqlOperationType["UPDATE"] = 1] = "UPDATE";
    })(SparqlOperationType = SparqlClient.SparqlOperationType || (SparqlClient.SparqlOperationType = {}));
    var SparqlQueryForm;
    (function (SparqlQueryForm) {
        SparqlQueryForm[SparqlQueryForm["SELECT"] = 0] = "SELECT";
        SparqlQueryForm[SparqlQueryForm["CONSTRUCT"] = 1] = "CONSTRUCT";
        SparqlQueryForm[SparqlQueryForm["ASK"] = 2] = "ASK";
        SparqlQueryForm[SparqlQueryForm["DESCRIBE"] = 3] = "DESCRIBE";
    })(SparqlQueryForm = SparqlClient.SparqlQueryForm || (SparqlClient.SparqlQueryForm = {}));
    SparqlClient.stringToSparqlQueryForm = {
        SELECT: SparqlQueryForm.SELECT,
        CONSTRUCT: SparqlQueryForm.CONSTRUCT,
        ASK: SparqlQueryForm.ASK,
        DESCRIBE: SparqlQueryForm.DESCRIBE,
    };
    var SPARQL_RESULT_ACCEPT_HEADERS = {
        SELECT: {
            JSON: 'application/sparql-results+json',
        },
        CONSTRUCT: {
            TURTLE: 'text/turtle',
        },
    };
    var DefaultResultHeaders = (_a = {},
        _a[SparqlQueryForm.CONSTRUCT] = SPARQL_RESULT_ACCEPT_HEADERS.CONSTRUCT.TURTLE,
        _a[SparqlQueryForm.SELECT] = SPARQL_RESULT_ACCEPT_HEADERS.SELECT.JSON,
        _a[SparqlQueryForm.ASK] = SPARQL_RESULT_ACCEPT_HEADERS.SELECT.JSON,
        _a[SparqlQueryForm.DESCRIBE] = SPARQL_RESULT_ACCEPT_HEADERS.CONSTRUCT.TURTLE,
        _a);
    function accumulateStringStream(stream) {
        return stream.scan(function (acc, x) { return acc + x; }, '').last();
    }
    SparqlClient.accumulateStringStream = accumulateStringStream;
    function stringStreamAsJson(stream) {
        return accumulateStringStream(stream).map(JSON.parse);
    }
    SparqlClient.stringStreamAsJson = stringStreamAsJson;
    function prepareQuery(query, parameters) {
        return Kefir.constant(SparqlUtil_1.parseQuerySync(query)).map(prepareParsedQuery(parameters));
    }
    SparqlClient.prepareQuery = prepareQuery;
    function prepareParsedQuery(parameters) {
        return function (query) {
            var values = serializeParameters(parameters);
            if (_.isEmpty(values) === false) {
                var queryCopy = _.cloneDeep(query);
                queryCopy.where = queryCopy.where ? queryCopy.where : [];
                queryCopy.where.unshift({
                    type: 'values',
                    values: values,
                });
                return queryCopy;
            }
            else {
                return query;
            }
        };
    }
    SparqlClient.prepareParsedQuery = prepareParsedQuery;
    function serializeParameters(parameters) {
        return _.map(parameters, function (tuple) {
            return _.reduce(tuple, function (acc, v, k) {
                acc['?' + k] = turtle.serialize.nodeToN3(v);
                return acc;
            }, {});
        });
    }
    function setBindings(query, parameters) {
        var queryCopy = QueryVisitor_1.cloneQuery(query);
        new QueryBinder_1.VariableBinder(parameters).sparqlQuery(queryCopy);
        return queryCopy;
    }
    SparqlClient.setBindings = setBindings;
    function setTextBindings(query, replacements) {
        var queryCopy = QueryVisitor_1.cloneQuery(query);
        new QueryBinder_1.TextBinder(replacements).sparqlQuery(queryCopy);
        return queryCopy;
    }
    SparqlClient.setTextBindings = setTextBindings;
    function construct(query, options) {
        return graphQuery(query, true, options);
    }
    SparqlClient.construct = construct;
    function describe(query, options) {
        return graphQuery(query, false, options);
    }
    SparqlClient.describe = describe;
    function select(query, options) {
        return stringStreamAsJson(streamSparqlQuery(query, SparqlQueryForm.SELECT, options)).map(function (res) {
            var selectJson = res;
            return sparqlJsonToSelectResult(selectJson);
        });
    }
    SparqlClient.select = select;
    function sparqlJsonToSelectResult(selectJson) {
        var bindings = _.map(selectJson.results.bindings, function (binding) { return _.mapValues(binding, sparqlSelectBindingValueToRdf); });
        return {
            head: selectJson.head,
            results: {
                bindings: bindings,
                distinct: selectJson.results.distinct,
                ordered: selectJson.results.ordered,
            },
        };
    }
    SparqlClient.sparqlJsonToSelectResult = sparqlJsonToSelectResult;
    function ask(query, options) {
        return stringStreamAsJson(streamSparqlQuery(query, SparqlQueryForm.SELECT, options)).map(function (res) { return res['boolean']; });
    }
    SparqlClient.ask = ask;
    function graphQuery(query, isConstruct, options) {
        return accumulateStringStream(streamSparqlQuery(query, isConstruct ? SparqlQueryForm.CONSTRUCT : SparqlQueryForm.DESCRIBE, options)).flatMap(turtle.deserialize.turtleToTriples).toProperty();
    }
    function streamSparqlQuery(query, form, options) {
        var format = DefaultResultHeaders[form];
        return sendStreamSparqlQuery(query, format, options);
    }
    SparqlClient.streamSparqlQuery = streamSparqlQuery;
    function sendStreamSparqlQuery(query, format, options) {
        if (options === void 0) { options = {}; }
        var endpoint = options.endpoint, context = options.context;
        return streamingSparqlQueryRequest({
            query: query,
            endpoint: endpoint,
            headers: { 'Accept': format },
            context: context,
        });
    }
    SparqlClient.sendStreamSparqlQuery = sendStreamSparqlQuery;
    function streamingSparqlQueryRequest(params) {
        var query = params.query, _a = params.endpoint, endpoint = _a === void 0 ? '/sparql' : _a, headers = params.headers, _b = params.context, context = _b === void 0 ? {} : _b;
        var parametrizedEndpoint = endpoint;
        if (context.repository) {
            parametrizedEndpoint += '?' + URI.buildQuery({ repository: context.repository });
        }
        var parsedQuery = typeof query === 'string' ? SparqlUtil_1.parseQuerySync(query) : query;
        var queryWithContext = context.bindings
            ? setBindings(parsedQuery, context.bindings) : parsedQuery;
        var preparedQuery = SparqlUtil_1.serializeQuery(queryWithContext);
        var header = assign({
            'Content-Type': 'application/sparql-query; charset=utf-8',
        }, headers);
        return streamingHttp('POST', parametrizedEndpoint, preparedQuery, header, false);
    }
    SparqlClient.streamingSparqlQueryRequest = streamingSparqlQueryRequest;
    function executeSparqlUpdate(query, options) {
        if (options === void 0) { options = {}; }
        var _a = options.endpoint, endpoint = _a === void 0 ? '/sparql' : _a, _b = options.context, context = _b === void 0 ? {} : _b;
        var parametrizedEndpoint = endpoint;
        if (context.repository) {
            parametrizedEndpoint += '?' + URI.buildQuery({ repository: context.repository });
        }
        var parsedQuery = typeof query === 'string' ? SparqlUtil_1.parseQuerySync(query) : query;
        var queryWithContext = context.bindings
            ? setBindings(parsedQuery, context.bindings) : parsedQuery;
        var preparedQuery = SparqlUtil_1.serializeQuery(queryWithContext);
        var updateRequest = request
            .post(parametrizedEndpoint)
            .send(preparedQuery)
            .set('Content-Type', 'application/sparql-query; charset=utf-8')
            .set('Accept', 'text/boolean');
        return Kefir.fromNodeCallback(function (cb) { return updateRequest.end(function (err, res) {
            return cb(err != null ? Error(err.response.statusText) : null, res.body);
        }); }).toProperty();
    }
    SparqlClient.executeSparqlUpdate = executeSparqlUpdate;
    function sparqlSelectBindingValueToRdf(binding) {
        if (binding.type == 'uri') {
            return Rdf.iri(binding.value);
        }
        else if (binding.type == 'literal') {
            return sparqlSelectBindingLiteralToRdf(binding);
        }
        else {
            return Rdf.bnode(binding.value);
        }
    }
    function sparqlSelectBindingLiteralToRdf(binding) {
        if (!_.isUndefined(binding['xml:lang'])) {
            return Rdf.langLiteral(binding.value, binding['xml:lang']);
        }
        else if (!_.isUndefined(binding.datatype)) {
            return Rdf.literal(binding.value, Rdf.iri(binding.datatype));
        }
        else {
            return Rdf.literal(binding.value);
        }
    }
    var _a;
})(SparqlClient || (SparqlClient = {}));
module.exports = SparqlClient;
