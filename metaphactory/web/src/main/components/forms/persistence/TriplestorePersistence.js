Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var FieldValues_1 = require("../FieldValues");
function computeModelDiff(base, changed) {
    var result = [];
    var namedBaseOrEmpty = isPlaceholderComposite(base) ? FieldValues_1.FieldValue.empty : base;
    var namedChangedOrEmpty = isPlaceholderComposite(changed) ? FieldValues_1.FieldValue.empty : changed;
    collectCompositeDiff(namedBaseOrEmpty, namedChangedOrEmpty, result);
    return result;
}
exports.computeModelDiff = computeModelDiff;
function isPlaceholderComposite(value) {
    return FieldValues_1.FieldValue.isComposite(value) && FieldValues_1.CompositeValue.isPlaceholder(value.subject);
}
var EMPTY_VALUES = Immutable.List();
function collectCompositeDiff(base, changed, result) {
    if (FieldValues_1.FieldValue.isComposite(base)) {
        if (FieldValues_1.CompositeValue.isPlaceholder(base.subject)) {
            throw new Error('Cannot compute diff with placeholder base composite');
        }
        base.fields.forEach(function (state, fieldId) {
            var definition = base.definitions.get(fieldId);
            var changedValues = getFieldValues(changed, fieldId);
            collectFieldDiff(base.subject, definition, state.values, changedValues, result);
        });
    }
    if (FieldValues_1.FieldValue.isComposite(changed)) {
        if (FieldValues_1.CompositeValue.isPlaceholder(changed.subject)) {
            throw new Error('Cannot compute diff with placeholder changed composite');
        }
        changed.fields.forEach(function (state, fieldId) {
            if (FieldValues_1.FieldValue.isEmpty(base) || !base.fields.has(fieldId)) {
                var definition = changed.definitions.get(fieldId);
                collectFieldDiff(changed.subject, definition, EMPTY_VALUES, state.values, result);
            }
        });
    }
}
function getFieldValues(composite, fieldId) {
    if (FieldValues_1.FieldValue.isEmpty(composite)) {
        return EMPTY_VALUES;
    }
    var state = composite.fields.get(fieldId);
    return state ? state.values : EMPTY_VALUES;
}
function collectFieldDiff(subject, definition, base, changed, result) {
    var baseSet = base.map(FieldValues_1.FieldValue.asRdfNode).filter(function (node) { return node !== undefined; }).toSet();
    var changedSet = changed.map(FieldValues_1.FieldValue.asRdfNode).filter(function (node) { return node !== undefined; }).toSet();
    var deleted = baseSet.subtract(changedSet).toArray();
    var inserted = changedSet.subtract(baseSet).toArray();
    if (deleted.length > 0 || inserted.length > 0) {
        result.push({ subject: subject, definition: definition, deleted: deleted, inserted: inserted });
    }
    var baseComposites = pickComposites(base);
    var changedComposites = pickComposites(changed);
    baseComposites.forEach(function (baseComposite, subjectKey) {
        var changedComposite = changedComposites.get(subjectKey) || FieldValues_1.FieldValue.empty;
        collectCompositeDiff(baseComposite, changedComposite, result);
    });
    changedComposites.forEach(function (changedComposite, subjectKey) {
        if (!baseComposites.has(subjectKey)) {
            collectCompositeDiff(FieldValues_1.FieldValue.empty, changedComposite, result);
        }
    });
}
function pickComposites(values) {
    var result = new Map();
    values.forEach(function (value) {
        if (FieldValues_1.FieldValue.isComposite(value) && !FieldValues_1.CompositeValue.isPlaceholder(value.subject)) {
            result.set(value.subject.value, value);
        }
    });
    return result;
}
