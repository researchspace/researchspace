Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("./FieldValues");
function computeValuePatch(base, changed) {
    if (FieldValues_1.FieldValue.isEmpty(changed)) {
        return null;
    }
    if (base.type !== changed.type) {
        return asPatch(changed);
    }
    switch (base.type) {
        case FieldValues_1.AtomicValue.type:
            var changedAtomic = changed;
            var isEqual = base.value.equals(changedAtomic.value)
                && base.label === changedAtomic.label;
            return isEqual ? null : asPatch(changedAtomic);
        case FieldValues_1.CompositeValue.type:
            return computeCompositePatch(base, changed);
    }
    FieldValues_1.FieldValue.unknownFieldType(base);
}
exports.computeValuePatch = computeValuePatch;
function computeCompositePatch(base, changed) {
    var visited = {};
    var patchFields = {};
    var hasAtLeastOnePatch = false;
    var visit = function (fieldId, baseState, changedState) {
        if (visited[fieldId]) {
            return;
        }
        visited[fieldId] = true;
        if (!baseState && changedState) {
            var values = changedState.values.map(asPatch).toArray();
            patchFields[fieldId] = { baseLength: values.length, values: values };
            hasAtLeastOnePatch = true;
        }
        else if (baseState && changedState) {
            var statePatch = computeFieldPatch(baseState, changedState);
            if (statePatch.values.some(function (p) { return p !== null; })) {
                patchFields[fieldId] = statePatch;
                hasAtLeastOnePatch = true;
            }
        }
    };
    base.fields.forEach(function (baseState, fieldId) {
        return visit(fieldId, baseState, changed.fields.get(fieldId));
    });
    changed.fields.forEach(function (changedState, fieldId) {
        return visit(fieldId, base.fields.get(fieldId), changedState);
    });
    return hasAtLeastOnePatch ? {
        type: FieldValues_1.CompositeValue.type,
        subject: changed.subject,
        fields: patchFields,
    } : null;
}
function computeFieldPatch(base, changed) {
    var values = changed.values.map(function (changedValue, index) {
        var baseValue = base.values.get(index, FieldValues_1.FieldValue.empty);
        return computeValuePatch(baseValue, changedValue);
    }).toArray();
    return { baseLength: base.values.size, values: values };
}
function asPatch(value) {
    switch (value.type) {
        case FieldValues_1.EmptyValue.type: return null;
        case FieldValues_1.AtomicValue.type: return {
            type: FieldValues_1.AtomicValue.type,
            value: value.value,
            label: value.label,
        };
        case FieldValues_1.CompositeValue.type: return {
            type: FieldValues_1.CompositeValue.type,
            subject: value.subject,
            fields: value.fields.map(function (state) {
                var values = state.values.map(asPatch).toArray();
                return { baseLength: values.length, values: values };
            }).toObject(),
        };
    }
    FieldValues_1.FieldValue.unknownFieldType(value);
}
function applyValuePatch(base, patch) {
    if (!patch) {
        return base;
    }
    switch (base.type) {
        case FieldValues_1.EmptyValue.type:
            return asValue(patch);
        case FieldValues_1.AtomicValue.type:
            if (patch.type === FieldValues_1.AtomicValue.type) {
                return asValue(patch);
            }
            break;
        case FieldValues_1.CompositeValue.type:
            if (patch.type === FieldValues_1.CompositeValue.type) {
                return applyCompositePatch(base, patch);
            }
    }
    return base;
}
exports.applyValuePatch = applyValuePatch;
function applyCompositePatch(base, patch) {
    if (!patch.fields) {
        return base;
    }
    if (!base.subject.equals(patch.subject)) {
        return base;
    }
    var fields = base.fields.map(function (baseState, fieldId) {
        var statePatch = patch.fields[fieldId];
        return statePatch ? applyFieldPatch(baseState, statePatch) : baseState;
    }).toMap();
    return FieldValues_1.CompositeValue.set(base, { fields: fields });
}
function applyFieldPatch(base, patch) {
    var isValidValues = Array.isArray(patch.values);
    if (!isValidValues) {
        return base;
    }
    if (base.values.size > patch.baseLength) {
        return base;
    }
    var values = patch.values.map(function (valuePatch, index) {
        var baseValue = base.values.get(index, FieldValues_1.FieldValue.empty);
        return valuePatch ? applyValuePatch(baseValue, valuePatch) : baseValue;
    });
    return FieldValues_1.FieldState.set(base, { values: Immutable.List(values) });
}
function asValue(patch) {
    var isValid;
    switch (patch.type) {
        case FieldValues_1.AtomicValue.type:
            isValid = patch.value instanceof rdf_1.Rdf.Node && (typeof patch.label === 'undefined' ||
                typeof patch.label === 'string');
            if (isValid) {
                return {
                    type: FieldValues_1.AtomicValue.type,
                    value: patch.value,
                    label: patch.label,
                    errors: FieldValues_1.FieldError.noErrors,
                };
            }
            break;
        case FieldValues_1.CompositeValue.type:
            isValid = patch.subject instanceof rdf_1.Rdf.Node;
            if (isValid) {
                var states = Object.keys(patch.fields).map(function (fieldId) {
                    var statePatch = patch.fields[fieldId];
                    var values = statePatch && Array.isArray(statePatch.values)
                        ? statePatch.values.map(function (v) { return v ? asValue(v) : FieldValues_1.FieldValue.empty; })
                        : [];
                    return [fieldId, {
                            values: Immutable.List(values),
                            errors: FieldValues_1.FieldError.noErrors,
                        }];
                });
                return {
                    type: FieldValues_1.CompositeValue.type,
                    definitions: Immutable.Map(),
                    subject: patch.subject,
                    fields: Immutable.Map(states),
                    errors: FieldValues_1.FieldError.noErrors,
                };
            }
    }
    return FieldValues_1.FieldValue.empty;
}
