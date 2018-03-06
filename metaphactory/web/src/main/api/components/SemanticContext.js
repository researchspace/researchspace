Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
exports.SemanticContextTypes = {
    semanticContext: react_1.PropTypes.object,
};
var SemanticContextProvider = (function (_super) {
    tslib_1.__extends(SemanticContextProvider, _super);
    function SemanticContextProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SemanticContextProvider.prototype.getChildContext = function () {
        var parentContext = this.context && this.context.semanticContext || {};
        var _a = deserializeContext(this.props), repository = _a.repository, bindings = _a.bindings;
        var semanticContext = {
            repository: repository,
            bindings: mergeIfDefined(parentContext.bindings, bindings),
        };
        return { semanticContext: semanticContext };
    };
    SemanticContextProvider.prototype.render = function () {
        return react_1.Children.only(this.props.children);
    };
    return SemanticContextProvider;
}(react_1.Component));
SemanticContextProvider.childContextTypes = exports.SemanticContextTypes;
SemanticContextProvider.contextTypes = exports.SemanticContextTypes;
exports.SemanticContextProvider = SemanticContextProvider;
function deserializeContext(props) {
    var bindings = {};
    var hasAnyBinding = false;
    if (props.bindings) {
        for (var key in props.bindings) {
            if (!props.bindings.hasOwnProperty(key)) {
                continue;
            }
            var value = props.bindings[key];
            if (typeof value === 'string') {
                value = rdf_1.turtle.deserialize.n3ValueToRdf(value);
            }
            bindings[key] = value;
            hasAnyBinding = true;
        }
    }
    return {
        repository: props.repository,
        bindings: hasAnyBinding ? bindings : undefined,
    };
}
function mergeIfDefined(first, second) {
    if (first && second) {
        return tslib_1.__assign({}, first, second);
    }
    else if (first) {
        return first;
    }
    else if (second) {
        return second;
    }
    else {
        return undefined;
    }
}
exports.component = SemanticContextProvider;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
