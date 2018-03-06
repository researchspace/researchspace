Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var Kefir = require("kefir");
var immutable_1 = require("immutable");
var Maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var template_1 = require("platform/components/ui/template");
var resource_label_1 = require("platform/components/ui/resource-label");
var module_loader_1 = require("platform/api/module-loader");
var forms_1 = require("platform/components/forms");
var FieldBasedVisualization_1 = require("platform/components/forms/FieldBasedVisualization");
var ArgumentsApi_1 = require("./ArgumentsApi");
var styles = require("./AssertionComponent.scss");
var AssertionsComponent = (function (_super) {
    tslib_1.__extends(AssertionsComponent, _super);
    function AssertionsComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.noBeliefs = function () {
            var noBeliefForNewValues = _.some(_this.state.newValues.map(function (value) { return Maybe.fromNullable(_this.props.beliefs.get(value)).map(function (belief) { return belief.belief.value === 'No Opinion'; }).getOrElse(true); }), function (x) { return x === true; });
            return _this.props.beliefs.isEmpty() || noBeliefForNewValues ||
                _this.props.beliefs.every(function (b) { return b.belief.value === 'No Opinion'; });
        };
        _this.assertionHeader = function (subject, field) {
            return React.createElement("div", { className: styles.header },
                React.createElement("div", { className: styles.subject },
                    React.createElement(resource_label_1.ResourceLabel, { iri: subject.value })),
                React.createElement("div", { className: styles.field }, field.label));
        };
        _this.onBeliefChange = function (belief) {
            if (belief.isCanonical && belief.belief.value === 'No Opinion') {
                _this.props.onBeliefsChange(_this.props.beliefs.remove(belief.targetValue));
            }
            else {
                _this.props.onBeliefsChange(_this.props.beliefs.set(belief.targetValue, belief));
            }
        };
        _this.removeBelief = function (belief) {
            _this.setState({
                newValues: _.filter(_this.state.newValues, function (value) { return !value.equals(belief.targetValue); })
            });
            _this.props.onBeliefsChange(_this.props.beliefs.remove(belief.targetValue));
        };
        _this.getBeliefValue = function (forValue, isCanonical) {
            var node = AssertionsComponent.deserializeBeliefValue(_this.props.field, forValue);
            return _this.props.beliefs.has(node) ? _this.props.beliefs.get(node) :
                AssertionsComponent.getDefaultBelief(_this.props.target, _this.props.field, node, isCanonical, 'default');
        };
        _this.toggleAddNewValue = function (event) {
            if (event) {
                event.preventDefault();
            }
            _this.setState(function (state) { return ({ addingNewValue: !state.addingNewValue }); });
        };
        _this.postAction = function (subject) {
            _this.toggleAddNewValue();
        };
        _this.state = {
            addingNewValue: props.quickAssertion || false,
            newValues: props.beliefs.filter(function (b) { return !b.isCanonical; }).keySeq().toJS(),
            formTemplate: Maybe.Nothing(),
        };
        return _this;
    }
    AssertionsComponent.prototype.getChildContext = function () {
        var superContext = _super.prototype.getChildContext.call(this);
        return tslib_1.__assign({}, superContext, { changeBelief: this.onBeliefChange, removeBelief: this.removeBelief, getBeliefValue: this.getBeliefValue });
    };
    AssertionsComponent.prototype.componentDidMount = function () {
        var _this = this;
        var _a = this.context.templateDataContext, templateDataContext = _a === void 0 ? function () { return undefined; } : _a;
        this.appliedTemplateScope.compile(this.props.formTemplate).then(function (template) { return module_loader_1.ModuleRegistry.parseHtmlToReact(template({ field: _this.props.field }, templateDataContext)); }).then(function (formTemplate) { return _this.setState({ formTemplate: Maybe.Just(formTemplate) }); });
    };
    AssertionsComponent.prototype.render = function () {
        var _a = this.props, target = _a.target, valueTemplate = _a.valueTemplate, field = _a.field, title = _a.title;
        var visualizationTemplate = "\n      <div>\n        {{#each fields as |field|}}\n            {{#each field.values as |value|}}\n              <div data-flex-layout='row center-center' class=" + styles.valuesRow + ">\n                <div data-flex-self='right'>\n                  " + valueTemplate + "\n                </div>\n                <div data-flex-self='right'>\n                  <rs-argument-simple-belief-selector for-value='{{value.value}}' is-canonical='{{#if ../../isNotCanonical}}false{{else}}true{{/if}}'>\n                  </rs-argument-simple-belief-selector>\n                </div>\n              </div>\n            {{/each}}\n        {{/each}}\n      </div>\n";
        var fieldClone = _.cloneDeep(field);
        fieldClone.values = this.state.newValues;
        fieldClone.minOccurs = 1;
        fieldClone.maxOccurs = 1;
        return React.createElement(react_bootstrap_1.Panel, { header: title },
            this.assertionHeader(target, fieldClone),
            React.createElement("hr", null),
            this.noBeliefs() ? React.createElement(react_bootstrap_1.Alert, { bsStyle: 'warning' },
                React.createElement("p", null,
                    React.createElement("i", { className: "fa fa-exclamation-triangle", style: { marginRight: 6 } }),
                    React.createElement("strong", null, "Please add an opinion to at least one value!"),
                    " Opinions are required for newly asserted values.")) : null,
            React.createElement(components_1.SemanticContextProvider, { repository: 'default' },
                React.createElement(FieldBasedVisualization_1.FieldBasedVisualization, { subject: target.value, template: visualizationTemplate, fields: [fieldClone] })),
            React.createElement("hr", null),
            React.createElement(template_1.TemplateItem, { template: {
                    source: visualizationTemplate, options: { fields: [forms_1.normalizeFieldDefinition(_.cloneDeep(fieldClone))], isNotCanonical: true }
                } }),
            _.isEmpty(fieldClone.values) ? null : React.createElement("hr", null),
            this.state.addingNewValue && this.state.formTemplate.isJust ?
                React.createElement(components_1.SemanticContextProvider, { repository: 'default' },
                    React.createElement(forms_1.ResourceEditorForm, { newSubjectTemplate: target.value, fields: [fieldClone], persistence: this, browserPersistence: false, postAction: this.postAction },
                        React.createElement("div", { "data-flex-layout": 'column justify-stretch', className: styles.valueHolder },
                            React.createElement("div", null, this.state.formTemplate.getOrElse(null)),
                            React.createElement("div", { className: styles.actions, "data-flex-layout": 'row top-right' },
                                React.createElement("button", { className: 'btn btn-danger', onClick: this.toggleAddNewValue }, "Cancel"),
                                React.createElement("button", { style: { marginLeft: 12 }, name: 'submit', className: 'btn btn-success' }, "Submit")))))
                : React.createElement("div", { "data-flex-layout": 'row center-right' },
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'link', onClick: this.toggleAddNewValue }, "Add an alternative value ...")));
    };
    AssertionsComponent.prototype.persist = function (initialModel, currentModel) {
        var _this = this;
        return this.persistCompositeValue(initialModel, currentModel).map(function (values) {
            if (_this.props.quickAssertion) {
                var beliefs = values.map(function (value) {
                    var belief = AssertionsComponent.getDefaultBelief(_this.props.target, _this.props.field, value, false, 'default');
                    belief.belief.value = 'Agree';
                    return [value, belief];
                });
                _this.props.onBeliefsChange(immutable_1.Map(beliefs));
            }
            _this.props.onBeliefsChange(_this.props.beliefs.set(values[0], AssertionsComponent.getDefaultBelief(_this.props.target, _this.props.field, values[0], false, 'default')));
            _this.setState(function (state) { return ({
                newValues: state.newValues.concat(values)
            }); });
        });
    };
    AssertionsComponent.prototype.persistCompositeValue = function (initialModel, currentModel) {
        var _this = this;
        var entries = forms_1.computeModelDiff(forms_1.FieldValue.empty, currentModel);
        if (entries.length > 1) {
            var topLevelFieldValue_1 = _.find(entries, function (entry) { return entry.subject.equals(_this.props.target); });
            var nestedValues = _.filter(entries, function (entry) { return !entry.subject.equals(_this.props.target); });
            return forms_1.LdpPersistence.default
                .persistModelUpdates(nestedValues[0].subject, nestedValues)
                .map(function () { return topLevelFieldValue_1.inserted; });
        }
        else {
            return Kefir.constant(_.flatten(entries.map(function (entry) { return entry.inserted; })));
        }
    };
    return AssertionsComponent;
}(components_1.Component));
AssertionsComponent.defaultProps = {
    quickAssertion: false,
};
AssertionsComponent.childContextTypes = tslib_1.__assign({}, components_1.Component.childContextTypes, ArgumentsApi_1.ArgumentsContextTypes, components_1.TemplateContextTypes);
AssertionsComponent.deserializeBeliefValue = function (field, value) {
    if (rdf_1.vocabularies.xsd.anyURI.value === field.xsdDatatype) {
        return rdf_1.Rdf.iri(value);
    }
    else {
        return rdf_1.Rdf.literal(value, rdf_1.Rdf.iri(field.xsdDatatype));
    }
};
AssertionsComponent.getDefaultBelief = function (target, field, value, isCanonical, repository) {
    return ({
        iri: Maybe.Nothing(),
        beliefType: ArgumentsApi_1.AssertedBeliefTypeKind,
        target: target,
        field: field,
        targetValue: value,
        isCanonical: isCanonical,
        originRepository: repository,
        belief: {
            type: 'simple',
            value: 'No Opinion',
        }
    });
};
exports.AssertionsComponent = AssertionsComponent;
exports.default = AssertionsComponent;
