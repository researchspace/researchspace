Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Handlebars = require("handlebars");
var async_1 = require("platform/api/async");
var sparql_1 = require("platform/api/sparql");
var TemplateParser_1 = require("./TemplateParser");
var page_1 = require("../page");
var remoteTemplateCache = new Map();
function purgeRemoteTemplateCache() {
    remoteTemplateCache.clear();
}
exports.purgeRemoteTemplateCache = purgeRemoteTemplateCache;
function fetchRemoteTemplate(iri) {
    if (remoteTemplateCache.has(iri.value)) {
        return remoteTemplateCache.get(iri.value);
    }
    var promise = page_1.PageService.loadPageTemplateHtml(iri).toPromise()
        .then(function (template) { return TemplateParser_1.escapeRemoteTemplateHtml(template.templateHtml); })
        .then(parseTemplate)
        .catch(function (error) { return Promise.reject(new async_1.WrappingError("Failed to load the source of template " + iri, error)); });
    remoteTemplateCache.set(iri.value, promise);
    return promise;
}
exports.fetchRemoteTemplate = fetchRemoteTemplate;
var IRIResolvingCompiler = (function (_super) {
    tslib_1.__extends(IRIResolvingCompiler, _super);
    function IRIResolvingCompiler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    IRIResolvingCompiler.prototype.nameLookup = function (parent, name, type) {
        if (type === 'partial' && typeof name === 'string' && isRemoteReference(name)) {
            var iri = sparql_1.SparqlUtil.resolveIris([name])[0];
            return _super.prototype.nameLookup.call(this, parent, iri.value, type);
        }
        return _super.prototype.nameLookup.call(this, parent, name, type);
    };
    return IRIResolvingCompiler;
}(Handlebars.JavaScriptCompiler));
IRIResolvingCompiler.prototype.compiler = IRIResolvingCompiler;
function isRemoteReference(partialName) {
    return partialName.indexOf(':') >= 0;
}
exports.isRemoteReference = isRemoteReference;
var RemoteTemplateScanner = (function (_super) {
    tslib_1.__extends(RemoteTemplateScanner, _super);
    function RemoteTemplateScanner() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.localReferences = new Set();
        _this.remoteReferences = [];
        return _this;
    }
    RemoteTemplateScanner.prototype.PartialStatement = function (partial) {
        this.addReference(partial);
    };
    RemoteTemplateScanner.prototype.PartialBlockStatement = function (partial) {
        this.addReference(partial);
    };
    RemoteTemplateScanner.prototype.addReference = function (partial) {
        var name = this.getPartialName(partial.name);
        if (name && name.indexOf('@') !== 0) {
            if (isRemoteReference(name)) {
                this.remoteReferences.push(name);
            }
            else {
                this.localReferences.add(name);
            }
        }
    };
    RemoteTemplateScanner.prototype.getPartialName = function (name) {
        if (name.type === 'PathExpression') {
            var path = name;
            if (path.parts.length === 1) {
                return path.original;
            }
        }
        return undefined;
    };
    return RemoteTemplateScanner;
}(Handlebars.Visitor));
function createHandlebarsWithIRILookup() {
    var handlebars = Handlebars.create();
    handlebars.JavaScriptCompiler = IRIResolvingCompiler;
    return handlebars;
}
exports.createHandlebarsWithIRILookup = createHandlebarsWithIRILookup;
function parseTemplate(body) {
    var ast = typeof body === 'string' ? Handlebars.parse(body) : body;
    var scanner = new RemoteTemplateScanner();
    scanner.accept(ast);
    var references = scanner.localReferences;
    sparql_1.SparqlUtil.resolveIris(scanner.remoteReferences)
        .map(function (iri) { return iri.value; })
        .forEach(function (remoteReference) { return references.add(remoteReference); });
    return { source: body, ast: ast, references: Array.from(references.values()) };
}
exports.parseTemplate = parseTemplate;
