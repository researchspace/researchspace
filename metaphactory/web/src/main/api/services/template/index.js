function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var RemoteTemplateFetcher_1 = require("./RemoteTemplateFetcher");
exports.parseTemplate = RemoteTemplateFetcher_1.parseTemplate;
var TemplateScope_1 = require("./TemplateScope");
var TEMPLATE_SERVICE_URL = '/rest/template/';
function getHeader(cb) {
    request
        .get(TEMPLATE_SERVICE_URL + 'header')
        .accept('text/html')
        .end(function (err, res) {
        cb(res.text);
    });
}
exports.getHeader = getHeader;
function getFooter(cb) {
    request
        .get(TEMPLATE_SERVICE_URL + 'footer')
        .accept('text/html')
        .end(function (err, res) {
        cb(res.text);
    });
}
exports.getFooter = getFooter;
function purgeTemplateCache() {
    TemplateScope_1.TemplateScope.default.clearCache();
    RemoteTemplateFetcher_1.purgeRemoteTemplateCache();
}
exports.purgeTemplateCache = purgeTemplateCache;
var functions_1 = require("./functions");
exports.ContextCapturer = functions_1.ContextCapturer;
exports.CapturedContext = functions_1.CapturedContext;
var TemplateParser = require("./TemplateParser");
exports.TemplateParser = TemplateParser;
__export(require("./TemplateScope"));
