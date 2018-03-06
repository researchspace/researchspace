Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var Kefir = require("kefir");
var fileSaver = require("file-saver");
var rdf_1 = require("platform/api/rdf");
exports.GRAPH_STORE_SERVICEURL = '/rdf-graph-store';
var GraphStoreService = (function () {
    function GraphStoreService() {
    }
    GraphStoreService.prototype.createGraph = function (targetGraph, graphData) {
        var _this = this;
        return rdf_1.turtle.serialize.serializeGraph(graphData).flatMap(function (turtle) { return _this.createGraphRequest(targetGraph, turtle); }).map(function (location) { return rdf_1.Rdf.iri(location); }).toProperty();
    };
    GraphStoreService.prototype.createGraphRequest = function (targetGraph, turtleString) {
        var req = request
            .post(exports.GRAPH_STORE_SERVICEURL)
            .query({ uri: targetGraph.value })
            .send(turtleString)
            .type('text/turtle');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res ? res.header['location'] : null); }); }).toProperty();
    };
    GraphStoreService.prototype.updateGraph = function (targetGraph, graphData) {
        var _this = this;
        return rdf_1.turtle.serialize.serializeGraph(graphData).flatMap(function (turtle) { return _this.createGraphRequest(targetGraph, turtle); }).map(function (location) { return rdf_1.Rdf.iri(location); }).toProperty();
    };
    GraphStoreService.prototype.updateGraphRequest = function (targetGraph, turtleString) {
        var req = request
            .put(exports.GRAPH_STORE_SERVICEURL)
            .query({ uri: targetGraph.value })
            .send(turtleString)
            .type('text/turtle');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res ? res.header['location'] : null); }); }).toProperty();
    };
    GraphStoreService.prototype.createGraphFromFile = function (targetGraph, keepSourceGraphs, file, contentType, progressCB) {
        var _this = this;
        var req = request.post(exports.GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value, keepSourceGraphs: keepSourceGraphs })
            .type(contentType)
            .send(file)
            .on('progress', function (e) { return progressCB(e.percent); });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(_this.errorToString(err), res.ok ? true : null);
        }); }).toProperty();
    };
    GraphStoreService.prototype.updateGraphFromFile = function (targetGraph, file, contentType, progressCB) {
        var _this = this;
        var req = request.put(exports.GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value })
            .type(contentType)
            .send(file)
            .on('progress', function (e) { return progressCB(e.percent); });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(_this.errorToString(err), res.ok ? true : null);
        }); }).toProperty();
    };
    GraphStoreService.prototype.getGraph = function (targetGraph) {
        var _this = this;
        var req = request
            .get(exports.GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value })
            .accept('text/turtle');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(_this.errorToString(err), res.ok ? rdf_1.turtle.deserialize.turtleToGraph(res.text) : null);
        }); }).toProperty();
    };
    GraphStoreService.prototype.deleteGraph = function (targetGraph) {
        var _this = this;
        var req = request.del(exports.GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(_this.errorToString(err), res.ok ? true : null);
        }); }).toProperty();
    };
    GraphStoreService.prototype.downloadGraph = function (targetGraph, acceptHeader, fileName) {
        var _this = this;
        var req = request
            .get(exports.GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value })
            .accept(acceptHeader);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(_this.errorToString(err), res.ok ? _this.download(res.text, acceptHeader, fileName) : false);
        }); }).toProperty();
    };
    GraphStoreService.prototype.download = function (response, header, filename) {
        var blob = new Blob([response], { type: header });
        fileSaver.saveAs(blob, filename);
        return true;
    };
    GraphStoreService.prototype.errorToString = function (err) {
        if (err !== null) {
            var status_1 = err['status'];
            if (413 === status_1) {
                return 'File to large. Please contact your administrator.';
            }
            else {
                return err.response.text;
            }
        }
        return null;
    };
    return GraphStoreService;
}());
exports.RDFGraphStoreService = new GraphStoreService();
