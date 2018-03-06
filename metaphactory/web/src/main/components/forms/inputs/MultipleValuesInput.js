Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Immutable = require("immutable");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("../FieldValues");
var MultipleValuesInput = (function (_super) {
    tslib_1.__extends(MultipleValuesInput, _super);
    function MultipleValuesInput() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MultipleValuesInput.prototype.dataState = function () {
        return FieldValues_1.DataState.Ready;
    };
    MultipleValuesInput.prototype.validate = function (_a) {
        var values = _a.values, errors = _a.errors;
        return { values: values, errors: FieldValues_1.FieldError.noErrors };
    };
    MultipleValuesInput.prototype.finalize = function (owner, values) {
        return values.filter(FieldValues_1.FieldValue.isAtomic).toList();
    };
    return MultipleValuesInput;
}(components_1.Component));
exports.MultipleValuesInput = MultipleValuesInput;
function checkCardinalityAndDuplicates(values, definition) {
    var errors = FieldValues_1.FieldError.noErrors;
    var nonEmpty = values.reduce(function (set, v) {
        if (FieldValues_1.FieldValue.isComposite(v) && FieldValues_1.CompositeValue.isPlaceholder(v.subject)) {
            return set.add(rdf_1.Rdf.bnode());
        }
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(v);
        if (!rdfNode) {
            return set;
        }
        else if (set.has(rdfNode)) {
            errors = errors.push({
                kind: FieldValues_1.ErrorKind.Input,
                message: "Value \"" + rdfNode.value + "\" is appears more than once",
            });
            return set;
        }
        else {
            return set.add(rdfNode);
        }
    }, Immutable.Set());
    if (nonEmpty.size < definition.minOccurs) {
        errors = errors.push({
            kind: FieldValues_1.ErrorKind.Input,
            message: "Required a minimum of " + definition.minOccurs + " values"
                + (" but " + nonEmpty.size + " provided"),
        });
    }
    if (nonEmpty.size > definition.maxOccurs) {
        errors = errors.push({
            kind: FieldValues_1.ErrorKind.Input,
            message: "Required a maximum of " + definition.maxOccurs + " values"
                + (" but " + nonEmpty.size + " provided"),
        });
    }
    return errors;
}
exports.checkCardinalityAndDuplicates = checkCardinalityAndDuplicates;
