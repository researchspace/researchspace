Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var maybe = require("data.maybe");
var request = require("superagent");
var rdf_1 = require("platform/api/rdf");
var URI = require("urijs");
var _ = require("lodash");
var VocabPlatform = rdf_1.vocabularies.VocabPlatform;
var LdpService = (function () {
    function LdpService(container, context) {
        if (context === void 0) { context = undefined; }
        var _this = this;
        this.getContainerIRI = function () {
            return rdf_1.Rdf.iri(_this.BASE_CONTAINER);
        };
        this.addResource = function (resource, name) {
            if (name === void 0) { name = maybe.Nothing(); }
            return rdf_1.turtle.serialize.serializeGraph(resource).flatMap(function (turtle) { return _this.createResourceRequest(_this.getContainerIRI(), { data: turtle, format: 'text/turtle' }, name); }).map(function (location) { return rdf_1.Rdf.iri(location); }).toProperty();
        };
        this.createResourceRequest = function (containerIri, resource, name) {
            if (name === void 0) { name = maybe.Nothing(); }
            var req = request
                .post(_this.getServiceUrl())
                .query({ uri: containerIri.value })
                .send(resource.data)
                .type(resource.format);
            req = name.map(function (slug) { return req.set('Slug', slug); }).getOrElse(req);
            return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res ? res.header['location'] : null); }); }).toProperty();
        };
        if (typeof container !== 'string') {
            throw new Error('Container IRI cannot be null or undefined');
        }
        this.BASE_CONTAINER = container;
        this.context = context || {};
    }
    LdpService.prototype.getServiceUrl = function (urlSuffix, queryParams) {
        if (urlSuffix === void 0) { urlSuffix = ''; }
        if (queryParams === void 0) { queryParams = {}; }
        var endpoint = "/container" + urlSuffix;
        var urlQuery = URI.buildQuery(_.assign(this.context || {}, queryParams));
        return urlQuery ? endpoint + "?" + urlQuery : endpoint;
    };
    LdpService.setVisibility = function (setIri, visibilityEnum, groups) {
        var resource = rdf_1.Rdf.graph([
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), VocabPlatform.visibilityItem, setIri),
            rdf_1.Rdf.triple(setIri, VocabPlatform.visibility, visibilityEnum)
        ].concat(_.map(groups, function (group) { return rdf_1.Rdf.triple(setIri, VocabPlatform.visibleToGroups, group); })));
        return new LdpService(VocabPlatform.VisibilityContainer.value).addResource(resource, maybe.Nothing());
    };
    LdpService.prototype.getContainer = function () {
        return this.fetchResource(rdf_1.Rdf.iri(this.BASE_CONTAINER));
    };
    LdpService.prototype.get = function (resourceIri) {
        return this.fetchResource(resourceIri);
    };
    LdpService.prototype.update = function (resourceIri, resource) {
        var _this = this;
        return rdf_1.turtle.serialize.serializeGraph(resource).flatMap(function (turtle) { return _this.sendUpdateResourceRequest(resourceIri, { data: turtle, format: 'text/turtle' }); }).toProperty();
    };
    LdpService.prototype.options = function (resourceIri) {
        var req = request.options(this.getServiceUrl()).query({ uri: resourceIri.value });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err != null ? err.status : null, res.ok ? res.text : null); }); }).toProperty();
    };
    LdpService.prototype.deleteResource = function (resourceIri) {
        var req = request
            .del(this.getServiceUrl())
            .query({ uri: resourceIri.value });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res ? res.text : null); }); }).toProperty();
    };
    LdpService.prototype.renameResource = function (resourceIri, newName) {
        var req = request
            .put(this.getServiceUrl('/rename'))
            .query({ uri: resourceIri.value, newName: newName });
        return Kefir.stream(function (emitter) {
            req.end(function (err, res) {
                if (err) {
                    emitter.error(err);
                }
                else {
                    emitter.emit(undefined);
                }
                emitter.end();
            });
            return function () { return req.abort(); };
        }).toProperty();
    };
    LdpService.prototype.copyResource = function (resource, targetContainer, name) {
        if (name === void 0) { name = maybe.Nothing(); }
        var req = request
            .get(this.getServiceUrl('/copyResource'));
        req = targetContainer.map(function (target) {
            return req.query({ source: resource.value, target: target.value });
        }).getOrElse(req.query({ source: resource.value }));
        req = name.map(function (slug) { return req.set('Slug', slug); }).getOrElse(req);
        return Kefir.fromNodeCallback(function (cb) {
            return req.end(function (err, res) { return cb(err, res ? res.header['location'] : null); });
        }).toProperty();
    };
    LdpService.prototype.sendUpdateResourceRequest = function (resourceUrl, resource) {
        var req = request
            .put(this.getServiceUrl())
            .query({ uri: resourceUrl.value })
            .send(resource.data)
            .type(resource.format);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err, res ? rdf_1.Rdf.iri(res.header['location']) : null);
        }); }).toProperty();
    };
    LdpService.prototype.fetchResource = function (iri) {
        return this.getResourceTriples(iri.value, 'text/turtle');
    };
    LdpService.prototype.getResourceTriples = function (resourceUrl, format) {
        return this.getResourceRequest(resourceUrl, format).flatMap(function (res) {
            return rdf_1.turtle.deserialize.turtleToGraph(res);
        }).toProperty();
    };
    LdpService.prototype.getResourceRequest = function (resourceUrl, format) {
        var req = request
            .get(this.getServiceUrl())
            .query({ uri: resourceUrl })
            .accept(format);
        return Kefir.fromNodeCallback(req.end.bind(req)).toProperty().map(function (res) { return res.text; });
    };
    LdpService.prototype.getExportURL = function (iris) {
        return this.getServiceUrl('/exportResource', { iris: iris });
    };
    LdpService.prototype.getImportURL = function () {
        return this.getServiceUrl('/importResource');
    };
    LdpService.prototype.importGetTextFromURL = function (url) {
        var req = request.get(url);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err, res && res.ok ? res.text : null);
        }); }).toProperty();
    };
    LdpService.prototype.importFromText = function (text, containerIRI) {
        var req = request
            .post(this.getImportURL())
            .send(new File([text], 'import.ttl'));
        if (containerIRI) {
            req = req.query({ containerIRI: containerIRI });
        }
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err, res);
        }); }).toProperty();
    };
    LdpService.prototype.importFromDelayedId = function (delayedId, containerIRI) {
        var req = request
            .post(this.getImportURL())
            .query({ force: true, delayedId: delayedId, containerIRI: containerIRI });
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err, res);
        }); }).toProperty();
    };
    return LdpService;
}());
exports.LdpService = LdpService;
exports.RootContainer = function (context) {
    return new LdpService(VocabPlatform.RootContainer.value, context);
};
function ldpc(baseUrl) {
    return new LdpService(baseUrl);
}
exports.ldpc = ldpc;
function slugFromName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, '-');
}
exports.slugFromName = slugFromName;
