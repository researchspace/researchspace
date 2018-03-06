Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var request = require("superagent");
var Immutable = require("immutable");
var sparql_1 = require("platform/api/sparql");
var RawSparqlPersistence_1 = require("./RawSparqlPersistence");
var SparqlPersistence = (function () {
    function SparqlPersistence() {
    }
    SparqlPersistence.prototype.persist = function (initialModel, currentModel) {
        var updateQueries = RawSparqlPersistence_1.createFormUpdateQueries(initialModel, currentModel);
        var stringQueries = Immutable.List(updateQueries).map(sparql_1.SparqlUtil.serializeQuery).flatten();
        var req = request
            .post('/form-persistence/sparql')
            .type('application/json')
            .send(stringQueries);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty();
    };
    return SparqlPersistence;
}());
exports.SparqlPersistence = SparqlPersistence;
exports.default = new SparqlPersistence();
