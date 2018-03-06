Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var turtle = require("../rdf/formats/turtle");
var QueryVisitor_1 = require("./QueryVisitor");
var TypeGuards_1 = require("./TypeGuards");
var VariableBinder = (function (_super) {
    tslib_1.__extends(VariableBinder, _super);
    function VariableBinder(replacements) {
        var _this = _super.call(this) || this;
        _this.replacements = replacements;
        return _this;
    }
    VariableBinder.prototype.tryReplace = function (termValue) {
        var replacement = this.replacements[termValue];
        if (replacement !== undefined) {
            return turtle.serialize.nodeToN3(replacement);
        }
        else {
            return undefined;
        }
    };
    VariableBinder.prototype.variableTerm = function (variable) {
        var name = variable.substring(1);
        return this.tryReplace(name);
    };
    return VariableBinder;
}(QueryVisitor_1.QueryVisitor));
exports.VariableBinder = VariableBinder;
var PropertyPathBinder = (function (_super) {
    tslib_1.__extends(PropertyPathBinder, _super);
    function PropertyPathBinder(replacements) {
        var _this = _super.call(this) || this;
        _this.replacements = replacements;
        return _this;
    }
    PropertyPathBinder.prototype.variableTerm = function (variable) {
        if (this.currentMember === 'predicate') {
            var propertyPath = this.replacements[variable.substring(1)];
            return PropertyPathBinder.normalize(propertyPath);
        }
    };
    PropertyPathBinder.normalize = function (path) {
        if (path === undefined) {
            return undefined;
        }
        var type = path.pathType;
        if (path.items.length === 1 && (type === '|' || type === '/')) {
            var item = path.items[0];
            return TypeGuards_1.isTerm(item) ? item : PropertyPathBinder.normalize(item);
        }
        return path;
    };
    return PropertyPathBinder;
}(QueryVisitor_1.QueryVisitor));
exports.PropertyPathBinder = PropertyPathBinder;
var TextBinder = (function (_super) {
    tslib_1.__extends(TextBinder, _super);
    function TextBinder(replacements) {
        var _this = _super.call(this) || this;
        _this.replacements = replacements;
        return _this;
    }
    TextBinder.prototype.literal = function (literal) {
        for (var _i = 0, _a = this.replacements; _i < _a.length; _i++) {
            var _b = _a[_i], test_1 = _b.test, replace = _b.replace;
            if (test_1.test(literal)) {
                return literal.replace(test_1, replace);
            }
        }
        return undefined;
    };
    return TextBinder;
}(QueryVisitor_1.QueryVisitor));
exports.TextBinder = TextBinder;
var PatternBinder = (function (_super) {
    tslib_1.__extends(PatternBinder, _super);
    function PatternBinder(filterPlaceholder, patterns) {
        var _this = _super.call(this) || this;
        _this.placeholderFound = false;
        _this.placeholder = ('?' + filterPlaceholder);
        _this.patterns = patterns;
        return _this;
    }
    PatternBinder.prototype.filter = function (pattern) {
        if (TypeGuards_1.isTerm(pattern.expression) && pattern.expression === this.placeholder) {
            this.placeholderFound = true;
            return undefined;
        }
        else {
            return _super.prototype.filter.call(this, pattern);
        }
    };
    PatternBinder.prototype.walkItem = function (nodes, index, walk) {
        var newIndex = _super.prototype.walkItem.call(this, nodes, index, walk);
        if (this.placeholderFound) {
            this.placeholderFound = false;
            nodes.splice.apply(nodes, [index, 1].concat(this.patterns));
            return index + this.patterns.length;
        }
        return newIndex;
    };
    return PatternBinder;
}(QueryVisitor_1.QueryVisitor));
exports.PatternBinder = PatternBinder;
var VariableRenameBinder = (function (_super) {
    tslib_1.__extends(VariableRenameBinder, _super);
    function VariableRenameBinder(fromVariable, toVariable) {
        var _this = _super.call(this) || this;
        _this.fromVariable = fromVariable;
        _this.toVariable = toVariable;
        return _this;
    }
    VariableRenameBinder.prototype.variableTerm = function (variable) {
        if (variable.substring(1) === this.fromVariable) {
            return ('?' + this.toVariable);
        }
    };
    return VariableRenameBinder;
}(QueryVisitor_1.QueryVisitor));
exports.VariableRenameBinder = VariableRenameBinder;
