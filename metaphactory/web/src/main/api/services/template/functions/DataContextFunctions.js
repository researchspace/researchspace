Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ContextCapturer = (function () {
    function ContextCapturer(contexts) {
        if (contexts === void 0) { contexts = new Map(); }
        this.contexts = contexts;
    }
    ContextCapturer.generateUniqueContextKey = function () {
        ContextCapturer.lastContextKey++;
        return ContextCapturer.lastContextKey.toString();
    };
    ContextCapturer.prototype.captureContext = function (dataContext) {
        var context = dataContext.context, data = dataContext.data;
        var key = ContextCapturer.generateUniqueContextKey();
        this.contexts.set(key, { context: context, data: cloneContextData(data) });
        return key;
    };
    ContextCapturer.prototype.getResult = function () {
        return new CapturedContext(this.contexts);
    };
    return ContextCapturer;
}());
ContextCapturer.DATA_KEY = '$contextCapturer';
ContextCapturer.lastContextKey = 0;
exports.ContextCapturer = ContextCapturer;
var CapturedContext = (function () {
    function CapturedContext(contexts) {
        this.contexts = contexts || new Map();
    }
    CapturedContext.prototype.getContext = function (contextKey) {
        var context = this.contexts.get(contextKey);
        if (!context) {
            console.warn("Missing context for context key " + contextKey);
        }
        return context;
    };
    CapturedContext.prototype.capture = function () {
        return new ContextCapturer(new Map(this.contexts));
    };
    return CapturedContext;
}());
CapturedContext.DATA_KEY = '$capturedContext';
exports.CapturedContext = CapturedContext;
var CAPTURED_DATA_KEYS = ['root', 'index', 'key', 'first', 'last'];
function cloneContextData(data) {
    if (!data) {
        return data;
    }
    var clone = {};
    for (var _i = 0, CAPTURED_DATA_KEYS_1 = CAPTURED_DATA_KEYS; _i < CAPTURED_DATA_KEYS_1.length; _i++) {
        var key = CAPTURED_DATA_KEYS_1[_i];
        if (key in data) {
            clone[key] = data[key];
        }
    }
    if ('_parent' in data) {
        clone._parent = cloneContextData(data._parent);
    }
    return clone;
}
function mergeDataContext(outer, inner) {
    if (isPlainObjectOrNothing(inner)) {
        if (isPlainObjectOrNothing(outer)) {
            return tslib_1.__assign({}, outer, inner);
        }
        else {
            return hasAnyOwnKey(inner) ? inner : outer;
        }
    }
    else {
        return inner;
    }
}
function isPlainObjectOrNothing(target) {
    if (target === null || target === undefined) {
        return true;
    }
    if (typeof target !== 'object') {
        return false;
    }
    var prototype = Object.getPrototypeOf(target);
    return !prototype || prototype === Object.getPrototypeOf({});
}
function hasAnyOwnKey(target) {
    for (var key in target) {
        if (target.hasOwnProperty(key)) {
            return true;
        }
    }
    return false;
}
function overrideContextData(base, override) {
    var result = tslib_1.__assign({}, base, override);
    if (base._parent && override._parent) {
        result._parent = overrideContextData(base._parent, override._parent);
    }
    return result;
}
function register(scope) {
    scope.registerHelper('capture', function (options) {
        var data = options ? options.data : {};
        var capturedContext = data[ContextCapturer.DATA_KEY];
        if (capturedContext instanceof ContextCapturer) {
            var key = capturedContext.captureContext({ context: this, data: options.data });
            return "{{#expose '" + key + "'}}" + options.fn(this) + "{{/expose}}";
        }
        return options.fn(this);
    });
    scope.registerHelper('expose', function (key, options) {
        if (typeof key !== 'string') {
            throw new Error('{{#expose}} context key is missing or not a string');
        }
        var data = options ? options.data : {};
        var capturedContext = data[CapturedContext.DATA_KEY];
        var dataContext = capturedContext instanceof CapturedContext
            ? capturedContext.getContext(key) : undefined;
        if (dataContext) {
            return options.fn(mergeDataContext(dataContext.context, this), { data: overrideContextData(data, dataContext.data) });
        }
        else {
            return options.fn(this);
        }
    });
}
exports.register = register;
