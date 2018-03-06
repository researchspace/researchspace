Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var Kefir = require("kefir");
var template_1 = require("./template");
var PageService;
(function (PageService) {
    var GET_SOURCE = '/rest/template/source';
    var GET_PAGE_HTML = '/rest/template/pageHtml';
    var GET_HTML = '/rest/template/html';
    var PUT_SOURCE = '/rest/template/source';
    var GET_ALL_INFO = '/rest/template/getAllInfo';
    var POST_EXPORT_REVISIONS = '/rest/template/exportRevisions';
    var DELETE_REVISIONS = '/rest/template/deleteRevisions';
    function loadTemplateSource(iri) {
        var req = request
            .get(GET_SOURCE)
            .query({ iri: iri })
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.status : null, res.ok ? JSON.parse(res.text) : null);
        }); }).toProperty();
    }
    PageService.loadTemplateSource = loadTemplateSource;
    function loadPageTemplateHtml(iri) {
        var req = request
            .get(GET_PAGE_HTML)
            .query({ iri: iri.value })
            .type('application/json')
            .accept('application/json');
        return Kefir.fromPromise(req.then(function (response) { return JSON.parse(response.text); })).toProperty();
    }
    PageService.loadPageTemplateHtml = loadPageTemplateHtml;
    function loadRenderedTemplate(iri, contextIri, params) {
        var req = request
            .get(GET_HTML)
            .query({ iri: iri.value })
            .query(params)
            .type('application/json')
            .accept('application/json');
        if (contextIri) {
            req.query({ context: contextIri.value });
        }
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.rawResponse : null, err == null && res.ok ? JSON.parse(res.text) : null);
        }); }).toProperty();
    }
    PageService.loadRenderedTemplate = loadRenderedTemplate;
    function save(iri, rawContent, sourceHash) {
        template_1.purgeTemplateCache();
        var req = request
            .put(PUT_SOURCE)
            .query({ iri: iri, beforeModificationHash: sourceHash })
            .send(rawContent)
            .type('text/html')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.rawResponse : null, res && res.status === 201 ? true : null);
        }); }).toProperty();
    }
    PageService.save = save;
    function getAllTemplateInfos() {
        var req = request
            .get(GET_ALL_INFO)
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.statusText : null, res.ok ? JSON.parse(res.text) : null);
        }); }).toProperty();
    }
    PageService.getAllTemplateInfos = getAllTemplateInfos;
    function deleteTemplateRevisions(selected) {
        var req = request
            .del(DELETE_REVISIONS)
            .type('application/json')
            .send(selected);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.statusText : null, res.ok ? true : null);
        }); }).toProperty();
    }
    PageService.deleteTemplateRevisions = deleteTemplateRevisions;
    function exportTemplateRevisions(selected) {
        var req = request
            .post(POST_EXPORT_REVISIONS)
            .type('application/json')
            .accept('application/zip')
            .on('request', function (re) {
            re.xhr.responseType = 'arraybuffer';
        })
            .send(selected);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.statusText : null, res.ok ? res : null);
        }); }).toProperty();
    }
    PageService.exportTemplateRevisions = exportTemplateRevisions;
})(PageService = exports.PageService || (exports.PageService = {}));
