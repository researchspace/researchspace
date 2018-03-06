Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var superagent_1 = require("superagent");
var Immutable = require("immutable");
var _ = require("lodash");
var Maybe = require("data.maybe");
var async_1 = require("platform/api/async");
var BaseResourceService = (function () {
    function BaseResourceService(serviceUrl) {
        this.pools = {};
        this.serviceUrl = serviceUrl;
    }
    BaseResourceService.prototype.getPool = function (context) {
        var _this = this;
        var repository = Maybe.fromNullable(context).chain(function (ctx) { return Maybe.fromNullable(ctx.semanticContext); }).chain(function (sctx) { return Maybe.fromNullable(sctx.repository); }).getOrElse('default');
        if (!_.has(this.pools, repository)) {
            this.pools[repository] =
                new async_1.BatchedPool({
                    fetch: function (iris) { return _this.fetchResources(iris.toArray(), repository); }
                });
        }
        return this.pools[repository];
    };
    BaseResourceService.prototype.getResource = function (iri, context) {
        return this.getPool(context).query(iri.value);
    };
    BaseResourceService.prototype.getResources = function (iris, context) {
        var _this = this;
        if (_.isEmpty(iris)) {
            return Kefir.constant(Immutable.Map());
        }
        return Kefir.combine(iris.map(function (iri) { return _this.getResource(iri, context).map(function (value) { return [iri, value]; }); })).map(Immutable.Map).toProperty();
    };
    BaseResourceService.prototype.fetchResources = function (resources, repository) {
        var request = superagent_1.post(this.serviceUrl)
            .send(resources)
            .query({ repository: repository })
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return request.end(function (err, res) { return cb(err, res.body); }); }).map(function (batch) { return Immutable.Map(batch); }).toProperty();
    };
    return BaseResourceService;
}());
exports.BaseResourceService = BaseResourceService;
