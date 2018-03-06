Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var Kefir = require("kefir");
var request = require("superagent");
var lodash_1 = require("lodash");
var sparql_1 = require("platform/api/sparql");
var FieldValues_1 = require("../FieldValues");
var PersistenceUtils_1 = require("./PersistenceUtils");
var TriplestorePersistence_1 = require("./TriplestorePersistence");
var LdpPersistence = (function () {
    function LdpPersistence() {
    }
    LdpPersistence.prototype.persist = function (initialModel, currentModel) {
        var updates = TriplestorePersistence_1.computeModelDiff(FieldValues_1.FieldValue.empty, currentModel);
        return this.persistModelUpdates(currentModel.subject, updates);
    };
    LdpPersistence.prototype.persistModelUpdates = function (subject, updates) {
        var listOfConstructs = this.createFormConstructQueries(updates);
        return this.sendConstructsToBackend(subject, listOfConstructs.toArray());
    };
    LdpPersistence.prototype.createFormConstructQueries = function (entries) {
        var _this = this;
        return Immutable.List(entries
            .filter(function (entry) { return entry.definition.insertPattern; })
            .map(function (entry) {
            var insertQuery = PersistenceUtils_1.parseQueryStringAsUpdateOperation(entry.definition.insertPattern);
            return _this.createFieldConstructQueries(insertQuery, entry.inserted, entry.subject);
        })).filter(function (updates) { return updates.size > 0; }).flatten().toList();
    };
    LdpPersistence.prototype.createFieldConstructQueries = function (insertQuery, newValues, subject) {
        var constructQueries = Immutable.List();
        if (!insertQuery) {
            return constructQueries;
        }
        var constructQuery = {
            type: 'query',
            prefixes: {},
            queryType: 'CONSTRUCT',
        };
        var insertDeleteOperations = insertQuery.updates;
        if (insertDeleteOperations.length !== 1) {
            return constructQueries;
        }
        var updateOperation = insertDeleteOperations.pop();
        constructQuery.template = updateOperation.insert.filter(function (p) { return p.type === 'bgp'; }).reduce(function (ar, p) {
            return ar.concat(lodash_1.cloneDeep(p).triples);
        }, new Array());
        constructQuery.where = lodash_1.cloneDeep(updateOperation.where);
        var paramterize = function (query, value) {
            return sparql_1.SparqlClient.setBindings(query, {
                'subject': subject,
                'value': value,
            });
        };
        if (constructQuery) {
            constructQueries = constructQueries.concat(newValues.map(function (value) { return paramterize(constructQuery, value); }));
        }
        return constructQueries;
    };
    LdpPersistence.prototype.sendConstructsToBackend = function (subject, queries) {
        var stringQueries = queries.map(sparql_1.SparqlUtil.serializeQuery);
        var req = request
            .post('/form-persistence/ldp')
            .type('application/json')
            .query({ iri: subject.value })
            .send(stringQueries);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty();
    };
    return LdpPersistence;
}());
exports.LdpPersistence = LdpPersistence;
exports.default = new LdpPersistence();
