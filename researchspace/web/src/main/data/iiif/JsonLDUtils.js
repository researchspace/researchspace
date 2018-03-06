Object.defineProperty(exports, "__esModule", { value: true });
var jsonld = require("jsonld");
var iiifContext = require('./ld-resources/iiif-context.json');
var JsonLDUtilsClass = (function () {
    function JsonLDUtilsClass() {
        this.CONTEXTS = {
            'http://iiif.io/api/presentation/2/context.json': iiifContext,
        };
        this.nodeDocumentLoader = jsonld.documentLoaders.node();
    }
    JsonLDUtilsClass.prototype.registerLocalLoader = function () {
        var _this = this;
        jsonld.documentLoader = function (error, payload) { return _this.localResourceLoader(error, payload); };
    };
    JsonLDUtilsClass.prototype.localResourceLoader = function (url, callback) {
        if (url in this.CONTEXTS) {
            return callback(null, {
                contextUrl: null,
                document: this.CONTEXTS[url],
                documentUrl: url,
            });
        }
        this.nodeDocumentLoader(url, callback);
    };
    return JsonLDUtilsClass;
}());
exports.JsonLDUtilsClass = JsonLDUtilsClass;
exports.JsonLDUtils = new JsonLDUtilsClass();
exports.default = exports.JsonLDUtils;
