Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var react_1 = require("react");
var Immutable = require("immutable");
var utils_1 = require("platform/components/utils");
var FieldValues_1 = require("./FieldValues");
var static_1 = require("./static");
var SingleValueInput_1 = require("./inputs/SingleValueInput");
var MultipleValuesInput_1 = require("./inputs/MultipleValuesInput");
var CardinalitySupport_1 = require("./inputs/CardinalitySupport");
var Decorations_1 = require("./inputs/Decorations");
var FieldMapping;
(function (FieldMapping) {
    function isInput(mapping) {
        return 'inputType' in mapping;
    }
    FieldMapping.isInput = isInput;
    function isStatic(mapping) {
        return 'staticType' in mapping;
    }
    FieldMapping.isStatic = isStatic;
    function isOtherElement(mapping) {
        return 'child' in mapping && 'children' in mapping;
    }
    FieldMapping.isOtherElement = isOtherElement;
    function assertNever(mapping) {
        console.error('Invalid mapping', mapping);
        throw new Error('Invalid mapping');
    }
    FieldMapping.assertNever = assertNever;
})(FieldMapping = exports.FieldMapping || (exports.FieldMapping = {}));
function mapChildToComponent(child) {
    if (!utils_1.isValidChild(child)) {
        return undefined;
    }
    var element = child;
    if (utils_1.hasBaseDerivedRelationship(SingleValueInput_1.SingleValueInput, element.type)) {
        var props = _.clone(element.props);
        props.children = element;
        return { inputType: CardinalitySupport_1.CardinalitySupport, props: props };
    }
    else if (utils_1.hasBaseDerivedRelationship(MultipleValuesInput_1.MultipleValuesInput, element.type)) {
        var props = _.clone(element.props);
        return { inputType: element.type, props: props };
    }
    else if (utils_1.hasBaseDerivedRelationship(static_1.StaticComponent, element.type)) {
        var props = _.clone(element.props);
        return { staticType: element.type, props: props };
    }
    else if ('children' in element.props) {
        return { child: child, children: element.props.children };
    }
    else {
        return undefined;
    }
}
exports.mapChildToComponent = mapChildToComponent;
function validateFieldConfiguration(definitions, children) {
    var inputs = Immutable.Map().asMutable();
    var errors = Immutable.List().asMutable();
    collectFieldConfiguration(definitions, children, inputs, errors);
    return { inputs: inputs.asImmutable(), errors: errors.asImmutable() };
}
exports.validateFieldConfiguration = validateFieldConfiguration;
function collectFieldConfiguration(definitions, children, collectedInputs, collectedErrors) {
    return react_1.Children.forEach(children, function (child) {
        var mapping = mapChildToComponent(child);
        if (!mapping) {
            return;
        }
        if (FieldMapping.isInput(mapping)) {
            var props = mapping.props;
            if (props.for) {
                var definition = definitions.get(props.for);
                if (!definition) {
                    collectedErrors.push({
                        kind: FieldValues_1.ErrorKind.Configuration,
                        message: "Field definition '" + props.for + "' not found",
                    });
                }
                collectedInputs.set(props.for, mapping);
            }
            else {
                collectedErrors.push({
                    kind: FieldValues_1.ErrorKind.Configuration,
                    message: "Missing 'for' attribute on " + utils_1.componentDisplayName(child),
                });
            }
        }
        else if (FieldMapping.isStatic(mapping)) {
            var staticType = mapping.staticType, props = mapping.props;
            if (props.for) {
                var definition = definitions.get(props.for);
                if (!definition) {
                    collectedErrors.push({
                        kind: FieldValues_1.ErrorKind.Configuration,
                        message: "Field definition '" + props.for + "' not found",
                    });
                }
            }
        }
        else if (FieldMapping.isOtherElement(mapping)) {
            collectFieldConfiguration(definitions, mapping.children, collectedInputs, collectedErrors);
        }
        else {
            FieldMapping.assertNever(mapping);
        }
    });
}
function renderFields(children, model, getDataState, onValuesChanged, onInputMounted) {
    return utils_1.universalChildren(react_1.Children.map(children, function (child) {
        var mapping = mapChildToComponent(child);
        if (!mapping) {
            return child;
        }
        else if (FieldMapping.isInput(mapping)) {
            var inputType = mapping.inputType, props_1 = mapping.props;
            if (!props_1.for) {
                return null;
            }
            props_1.definition = model.definitions.get(props_1.for);
            if (!props_1.definition) {
                return null;
            }
            var state = model.fields.get(props_1.for);
            props_1.dataState = getDataState(props_1.for);
            props_1.values = state.values;
            props_1.errors = state.errors;
            props_1.valueSet = state.valueSet;
            props_1.updateValues = function (reducer) { return onValuesChanged(props_1.definition, reducer); };
            var onMounted = function (input) {
                onInputMounted(props_1.for, input);
            };
            return react_1.createElement(Decorations_1.InputDecorator, props_1, react_1.createElement(inputType, tslib_1.__assign({}, props_1, { ref: onMounted })));
        }
        else if (FieldMapping.isStatic(mapping)) {
            var staticType = mapping.staticType, props = mapping.props;
            if (props.for) {
                props.definition = model.definitions.get(props.for);
                if (!props.definition) {
                    return null;
                }
            }
            props.model = model;
            return react_1.createElement(staticType, props);
        }
        else if (FieldMapping.isOtherElement(mapping)) {
            var mappedChildren = utils_1.universalChildren(renderFields(mapping.children, model, getDataState, onValuesChanged, onInputMounted));
            return react_1.cloneElement(mapping.child, {}, mappedChildren);
        }
        else {
            throw new Error('Invalid mapping');
        }
    }));
}
exports.renderFields = renderFields;
