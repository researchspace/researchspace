Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var request = require("superagent");
var Immutable = require("immutable");
var Maybe = require("data.maybe");
var _ = require("lodash");
var sparql_1 = require("platform/api/sparql");
var ENDPOINT = '/rest/repositories';
function getRepositoryStatus() {
    var req = request.get(ENDPOINT)
        .type('application/json')
        .accept('application/json');
    return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).map(function (status) { return Immutable.Map(status); }).toProperty();
}
exports.getRepositoryStatus = getRepositoryStatus;
var repositories = getRepositoryStatus().map(function (rs) { return rs.keySeq().toArray(); });
function guessResourceRepository(resource) {
    return repositories.flatMap(function (rs) { return Kefir.combine(rs.map(function (r) { return executeGuessQuery(r, resource).map(function (resp) { return [r, resp]; }); })); }).map(function (responses) {
        return Maybe.fromNullable(_.find(responses, function (_a) {
            var _ = _a[0], resp = _a[1];
            return resp;
        })).map(function (_a) {
            var repo = _a[0], _ = _a[1];
            return repo;
        });
    }).toProperty();
}
exports.guessResourceRepository = guessResourceRepository;
var GUESS_QUERY = (_a = ["ASK { ?__value__ a ?type }"], _a.raw = ["ASK { ?__value__ a ?type }"], sparql_1.SparqlUtil.Sparql(_a));
function executeGuessQuery(repository, resource) {
    return sparql_1.SparqlClient.ask(sparql_1.SparqlClient.setBindings(GUESS_QUERY, { '__value__': resource }), { context: { repository: repository } });
}
var _a;
