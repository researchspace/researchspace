Object.defineProperty(exports, "__esModule", { value: true });
var async_1 = require("platform/api/async");
var rdf_1 = require("platform/api/rdf");
var functions_1 = require("./functions");
var RemoteTemplateFetcher_1 = require("./RemoteTemplateFetcher");
var EMPTY_TEMPLATE = function () { return ''; };
var TemplateScope = (function () {
    function TemplateScope(handlebars) {
        var _this = this;
        this.handlebars = handlebars;
        this.compiledCache = new Map();
        this.partials = new Map();
        this.helpers = new Map();
        this.loadByReference = function (reference) {
            if (_this.partials.has(reference)) {
                return Promise.resolve(_this.partials.get(reference));
            }
            else if (RemoteTemplateFetcher_1.isRemoteReference(reference)) {
                return TemplateScope._fetchRemoteTemplate(rdf_1.Rdf.iri(reference));
            }
            else {
                return Promise.reject(new Error("Parial template reference '" + reference + "' is not an IRI and not found " +
                    "in current template scope."));
            }
        };
    }
    TemplateScope.prototype.clearCache = function () {
        this.compiledCache.clear();
    };
    TemplateScope.prototype.getPartial = function (name) {
        return this.partials.get(name);
    };
    TemplateScope.prototype.registerHelper = function (name, body) {
        if (this.helpers.has(name)) {
            throw new Error("Template helper '" + name + "' already registered");
        }
        this.helpers.set(name, body);
        this.handlebars.registerHelper(name, body);
    };
    TemplateScope.prototype.registerPartial = function (id, partial) {
        if (this.partials.has(id)) {
            throw new Error("Template partial '" + id + "' already registered");
        }
        var parsedTemplate = typeof partial === 'string' ? RemoteTemplateFetcher_1.parseTemplate(partial) : partial;
        this.partials.set(id, parsedTemplate);
        this.handlebars.registerPartial(id, parsedTemplate.ast);
    };
    TemplateScope.prototype.clone = function () {
        var derived = new TemplateScope(RemoteTemplateFetcher_1.createHandlebarsWithIRILookup());
        this.helpers.forEach(function (body, key) { return derived.registerHelper(key, body); });
        this.partials.forEach(function (body, key) { return derived.registerPartial(key, body); });
        return derived;
    };
    TemplateScope.prototype.compile = function (template) {
        var _this = this;
        if (template === undefined || template === null) {
            return Promise.resolve(EMPTY_TEMPLATE);
        }
        var fromCache = this.compiledCache.get(template);
        if (fromCache) {
            return Promise.resolve(fromCache);
        }
        return this.resolve(template).then(function (resolved) {
            var withParentContext = function (local, _a) {
                var _b = _a === void 0 ? {} : _a, capturer = _b.capturer, parentContext = _b.parentContext;
                return resolved(local, {
                    data: (_c = {},
                        _c[functions_1.ContextCapturer.DATA_KEY] = capturer,
                        _c[functions_1.CapturedContext.DATA_KEY] = parentContext,
                        _c)
                });
                var _c;
            };
            _this.compiledCache.set(template, withParentContext);
            return withParentContext;
        });
    };
    TemplateScope.prototype.compileWithoutRemote = function (template) {
        if (template === undefined || template === null) {
            return EMPTY_TEMPLATE;
        }
        var fromCache = this.compiledCache.get(template);
        if (fromCache) {
            return fromCache;
        }
        var compiled = this.handlebars.compile(template);
        var withParentContext = function (local, _a) {
            var _b = _a === void 0 ? {} : _a, capturer = _b.capturer, parentContext = _b.parentContext;
            return compiled(local, {
                data: (_c = {},
                    _c[functions_1.ContextCapturer.DATA_KEY] = capturer,
                    _c[functions_1.CapturedContext.DATA_KEY] = parentContext,
                    _c)
            });
            var _c;
        };
        this.compiledCache.set(template, withParentContext);
        return withParentContext;
    };
    TemplateScope.prototype.resolve = function (templateBody) {
        var _this = this;
        return Promise.resolve(templateBody).then(RemoteTemplateFetcher_1.parseTemplate).then(function (parsed) {
            var dependencies = new Map();
            return recursiveResolve(parsed, dependencies, _this.loadByReference).then(function () {
                dependencies.forEach(function (dependency, iri) {
                    if (!_this.partials.has(iri)) {
                        _this.handlebars.registerPartial(iri, dependency.ast);
                    }
                });
            }).then(function () { return _this.handlebars.compile(parsed.ast); });
        });
    };
    return TemplateScope;
}());
TemplateScope.default = new TemplateScope(RemoteTemplateFetcher_1.createHandlebarsWithIRILookup());
TemplateScope._fetchRemoteTemplate = RemoteTemplateFetcher_1.fetchRemoteTemplate;
exports.TemplateScope = TemplateScope;
functions_1.registerHelperFunctions(TemplateScope.default);
function recursiveResolve(parsedTemplate, dependencies, load) {
    return Promise.resolve(parsedTemplate).then(function (body) {
        var referencesToLoad = parsedTemplate.references
            .filter(function (reference) { return !dependencies.has(reference); });
        for (var _i = 0, referencesToLoad_1 = referencesToLoad; _i < referencesToLoad_1.length; _i++) {
            var reference = referencesToLoad_1[_i];
            dependencies.set(reference, null);
        }
        var fetchedDependencies = referencesToLoad.map(function (reference) { return load(reference)
            .then(function (template) { return ({ reference: reference, template: template }); })
            .catch(function (error) {
            throw new async_1.WrappingError("Failed to load template '" + reference + "'", error);
        }); });
        return Promise.all(fetchedDependencies);
    }).then(function (fetched) {
        for (var _i = 0, fetched_1 = fetched; _i < fetched_1.length; _i++) {
            var _a = fetched_1[_i], reference = _a.reference, template = _a.template;
            dependencies.set(reference, template);
        }
        return Promise.all(fetched.map(function (_a) {
            var reference = _a.reference, template = _a.template;
            return recursiveResolve(template, dependencies, load)
                .catch(function (error) {
                throw new async_1.WrappingError("Error while resolving dependencies of template '" + reference + "'", error);
            });
        }));
    });
}
