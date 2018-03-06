var Maybe = require("data.maybe");
var Kefir = require("kefir");
var request = require("superagent");
var _ = require("lodash");
var I = require("immutable");
var rdf_1 = require("platform/api/rdf");
var async_1 = require("platform/api/async");
var NamespaceService;
(function (NamespaceService) {
    var GET_FULL_URIS_URL = '/rest/data/rdf/namespace/getFullUris';
    var GET_PREFIXED_URIS_URL = '/rest/data/rdf/namespace/getPrefixedUris';
    NamespaceService.GET_REGISTERED_PREFIXES = '/rest/data/rdf/namespace/getRegisteredPrefixes';
    var PUT_PREFIX = '/rest/data/rdf/namespace/setPrefix';
    var DELETE_PREFIX = '/rest/data/rdf/namespace/deletePrefix';
    var pool = new async_1.BatchedPool({
        fetch: function (iris) { return getPrefixedIris(iris.toArray()); },
    });
    function getPrefixedUri(iri) {
        return pool.query(iri);
    }
    NamespaceService.getPrefixedUri = getPrefixedUri;
    function getPrefixedIris(iris) {
        return resolveIri(GET_PREFIXED_URIS_URL, _.map(iris, function (iri) { return iri.value; })).map(function (res) { return I.Map(res).mapEntries(function (entry) { return [rdf_1.Rdf.iri(entry[0]), Maybe.fromNullable(entry[1])]; }); });
    }
    NamespaceService.getPrefixedIris = getPrefixedIris;
    function getFullIri(prefixedIri) {
        return getFullIris([prefixedIri]).map(function (res) { return res.get(prefixedIri); });
    }
    NamespaceService.getFullIri = getFullIri;
    function getFullIris(iris) {
        return resolveIri(GET_FULL_URIS_URL, iris).map(function (res) { return I.Map(res).mapEntries(function (entry) { return [entry[0], Maybe.fromNullable(entry[1]).map(rdf_1.Rdf.iri)]; }); });
    }
    NamespaceService.getFullIris = getFullIris;
    function getRegisteredPrefixes() {
        var req = request
            .get(NamespaceService.GET_REGISTERED_PREFIXES)
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty();
    }
    NamespaceService.getRegisteredPrefixes = getRegisteredPrefixes;
    function setPrefix(prefix, ns) {
        var req = request
            .put(PUT_PREFIX + '/' + prefix)
            .type('text/plain')
            .send(ns);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? true : null);
        }); });
    }
    NamespaceService.setPrefix = setPrefix;
    function deletePrefix(prefix) {
        var req = request
            .del(DELETE_PREFIX + '/' + prefix);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? true : null);
        }); });
    }
    NamespaceService.deletePrefix = deletePrefix;
    function resolveIri(url, iris) {
        var req = request
            .post(url)
            .send(iris)
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty();
    }
})(NamespaceService || (NamespaceService = {}));
module.exports = NamespaceService;
