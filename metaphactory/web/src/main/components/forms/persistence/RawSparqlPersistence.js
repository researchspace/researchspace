Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var Kefir = require("kefir");
var sparql_1 = require("platform/api/sparql");
var PersistenceUtils_1 = require("./PersistenceUtils");
var TriplestorePersistence_1 = require("./TriplestorePersistence");
var RawSparqlPersistence = (function () {
    function RawSparqlPersistence() {
    }
    RawSparqlPersistence.prototype.persist = function (initialModel, currentModel) {
        var updateQueries = createFormUpdateQueries(initialModel, currentModel);
        if (updateQueries.size === 0) {
            return Kefir.constant(undefined);
        }
        updateQueries.forEach(function (query) {
            console.log(sparql_1.SparqlUtil.serializeQuery(query));
        });
        var updateOperations = Kefir.zip(updateQueries.map(function (query) { return sparql_1.SparqlClient.executeSparqlUpdate(query); }).toArray());
        return updateOperations.map(function () { }).toProperty();
    };
    return RawSparqlPersistence;
}());
exports.RawSparqlPersistence = RawSparqlPersistence;
function createFormUpdateQueries(initialModel, currentModel) {
    var entries = TriplestorePersistence_1.computeModelDiff(initialModel, currentModel);
    return Immutable.List(entries)
        .filter(function (_a) {
        var definition = _a.definition;
        return Boolean(definition.insertPattern && definition.deletePattern);
    })
        .map(function (_a) {
        var definition = _a.definition, subject = _a.subject, inserted = _a.inserted, deleted = _a.deleted;
        var deleteQuery = PersistenceUtils_1.parseQueryStringAsUpdateOperation(definition.deletePattern);
        var insertQuery = PersistenceUtils_1.parseQueryStringAsUpdateOperation(definition.insertPattern);
        return createFieldUpdateQueries(subject, deleteQuery, insertQuery, inserted, deleted);
    }).filter(function (update) { return update.size > 0; }).flatten().toList();
}
exports.createFormUpdateQueries = createFormUpdateQueries;
exports.default = new RawSparqlPersistence();
function createFieldUpdateQueries(subject, deleteQuery, insertQuery, inserted, deleted) {
    var queries = Immutable.List();
    if (deleted.length === 0 && inserted.length === 0) {
        return queries;
    }
    var paramterize = function (query, value) {
        return sparql_1.SparqlClient.setBindings(query, {
            'subject': subject,
            'value': value,
        });
    };
    if (deleteQuery) {
        queries = queries.concat(deleted.map(function (value) { return paramterize(deleteQuery, value); }));
    }
    if (insertQuery) {
        queries = queries.concat(inserted.map(function (value) { return paramterize(insertQuery, value); }));
    }
    return queries;
}
