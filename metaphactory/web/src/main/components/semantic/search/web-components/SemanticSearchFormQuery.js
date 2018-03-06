Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var lodash_1 = require("lodash");
var data_maybe_1 = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var utils_1 = require("platform/components/utils");
var forms_1 = require("platform/components/forms");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var Utils_1 = require("../commons/Utils");
var PLACEHOLDER_SUBJECT = rdf_1.Rdf.iri(rdf_1.vocabularies.VocabPlatform._NAMESPACE + 'FormQuerySubject');
var FormQuery = (function (_super) {
    tslib_1.__extends(FormQuery, _super);
    function FormQuery(props) {
        var _this = _super.call(this, props) || this;
        _this.setFormRef = function (form) {
            _this.form = form;
        };
        _this.onFormChanged = function (model) {
            _this.setState({ model: model });
        };
        _this.onFormLoaded = function (model) {
            var queryTemplate = _this.props.queryTemplate;
            var validationErrors = [];
            lodash_1.each(queryTemplate.arguments, function (argument, argumentId) {
                var field = model.definitions.get(argumentId);
                validateArgumentAndField(argumentId, argument, field, validationErrors);
            });
            _this.setState({
                model: forms_1.CompositeValue.set(model, {
                    errors: model.errors.concat(validationErrors),
                })
            });
        };
        _this.onFormStateChanged = function (modelState) {
            _this.setState({ modelState: modelState });
        };
        _this.mapChildren = function (children) {
            return React.Children.map(children, function (element) {
                if (!utils_1.isValidChild(element)) {
                    return element;
                }
                var type = element.type, props = element.props;
                if (type === 'button') {
                    if (props.name === 'submit') {
                        return React.cloneElement(element, {
                            disabled: !_this.canSubmit(_this.state.model),
                            onClick: _this.executeSearch,
                        });
                    }
                }
                if ('children' in props && props.children.length > 0) {
                    return React.cloneElement(element, {}, _this.mapChildren(props.children));
                }
                return element;
            });
        };
        _this.executeSearch = function () {
            var model = _this.form.validate(_this.state.model);
            _this.setState({ model: model });
            if (!_this.canSubmit(model)) {
                return;
            }
            if (_this.props.domainField) {
                Utils_1.setSearchDomain('<' + forms_1.FieldValue.asRdfNode(model.fields.get(_this.props.domainField).values.first()).value + '>', _this.context);
            }
            var parametrized = parametrizeQueryFromForm(_this.props.queryTemplate, model);
            return _this.context.setBaseQuery(data_maybe_1.Just(parametrized));
        };
        _this.state = {
            definitions: adjustDefinitionsToTemplate(_this.props.queryTemplate, _this.props.fields),
        };
        return _this;
    }
    FormQuery.prototype.componentWillReceiveProps = function (props, context) {
        if (context.searchProfileStore.isJust && context.domain.isNothing) {
            Utils_1.setSearchDomain(props.domain, context);
        }
    };
    FormQuery.prototype.render = function () {
        return (React.createElement(forms_1.SemanticForm, { ref: this.setFormRef, fields: this.state.definitions, model: this.state.model || forms_1.FieldValue.fromLabeled({ value: PLACEHOLDER_SUBJECT }), onChanged: this.onFormChanged, onLoaded: this.onFormLoaded, onUpdated: this.onFormStateChanged }, this.mapChildren(this.props.children)));
    };
    FormQuery.prototype.canSubmit = function (model) {
        return this.state.modelState === forms_1.DataState.Ready
            && forms_1.readyToSubmit(model, function (error) { return true; });
    };
    return FormQuery;
}(React.Component));
FormQuery.contextTypes = SemanticSearchApi_1.InitialQueryContextTypes;
exports.FormQuery = FormQuery;
function adjustDefinitionsToTemplate(queryTemplate, defs) {
    return defs.map(forms_1.normalizeFieldDefinition)
        .map(function (def) {
        var argument = queryTemplate.arguments[def.id];
        if (!argument) {
            return def;
        }
        return tslib_1.__assign({}, def, { maxOccurs: 1, minOccurs: argument.optional ? 0 : 1 });
    });
}
function validateArgumentAndField(argumentId, argument, field, validationErrors) {
    if (!field) {
        validationErrors.push({
            kind: forms_1.ErrorKind.Configuration,
            message: "Missing field definition or input for argument '" + argumentId + "'",
        });
        return;
    }
    var argumentType = rdf_1.XsdDataTypeValidation.parseXsdDatatype(argument.type);
    if (argumentType) {
        if (!rdf_1.XsdDataTypeValidation.sameXsdDatatype(argumentType.iri, field.xsdDatatype)) {
            validationErrors.push({
                kind: forms_1.ErrorKind.Configuration,
                message: "Mismatched argument type " + argumentType.iri + " and field type " + field.xsdDatatype,
            });
        }
    }
    else {
        validationErrors.push({
            kind: forms_1.ErrorKind.Configuration,
            message: "Invalid XSD datatype '" + argument.type + "' for argument '" + argumentId + "'",
        });
    }
}
function parametrizeQueryFromForm(queryTemplate, model) {
    var queryArguments = queryTemplate.arguments;
    var bindings = {};
    for (var argumentID in queryArguments) {
        if (!queryArguments.hasOwnProperty(argumentID)) {
            continue;
        }
        var argument = queryArguments[argumentID];
        var fieldState = model.fields.get(argumentID);
        var values = fieldState.values;
        if (values.size === 0) {
            if (argument.optional) {
                continue;
            }
            throw new Error("No field value for query argument " + argumentID);
        }
        var value = forms_1.FieldValue.asRdfNode(values.first());
        if (!value) {
            if (argument.optional) {
                continue;
            }
            throw new Error("Empty field value for query argument " + argumentID);
        }
        bindings[argumentID] = value;
    }
    var parsedQuery = sparql_1.SparqlUtil.parseQuery(queryTemplate.queryString);
    if (parsedQuery.type !== 'query' || parsedQuery.queryType !== 'SELECT') {
        throw new Error('Query must be SELECT SPARQL query');
    }
    return sparql_1.SparqlClient.setBindings(parsedQuery, bindings);
}
exports.default = FormQuery;
