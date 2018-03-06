Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var ReactSelect = require("react-select");
var sparqljs = require("sparqljs");
var _ = require("lodash");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var repository_1 = require("platform/api/services/repository");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var ory_editor_ui_1 = require("ory-editor-ui");
var inputs_1 = require("platform/components/ui/inputs");
var react_bootstrap_1 = require("react-bootstrap");
function getTypesFromRepository(repository, resource) {
    var TYPES_QUERY = (new sparqljs.Parser()).parse("SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }");
    return sparql_1.SparqlClient.select(sparql_1.SparqlClient.setBindings(TYPES_QUERY, { '__resource__': resource }), { context: { repository: repository } }).map(function (result) {
        return result.results.bindings.map(function (binding) {
            return rdf_1.Rdf.iri(binding['type'].value);
        });
    });
}
function getTypes(resource) {
    return repository_1.getRepositoryStatus().map(function (repos) { return repos.keySeq().toArray(); }).flatMap(function (repos) {
        return Kefir.combine(repos.map(function (r) {
            return getTypesFromRepository(r, resource);
        }));
    }).map(_.flatten).map(function (types) {
        return _.uniqWith(types, function (a, b) { return a.equals(b); });
    }).toProperty();
}
function selectTemplate(templates, key) {
    return templates.find(key ? function (tpl) { return tpl.id === key; } : function (tpl) { return true; }).template;
}
function findTemplatesForUri(dropTemplateConfig, uri) {
    return getTypes(rdf_1.Rdf.iri(uri)).map(function (types) {
        return dropTemplateConfig.filter(function (configItem) {
            return (configItem.type === 'any' || _.find(types, function (t) { return t.value === configItem.type; }));
        });
    });
}
var SemanticNarrativeResource = (function (_super) {
    tslib_1.__extends(SemanticNarrativeResource, _super);
    function SemanticNarrativeResource(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            loading: true,
        };
        return _this;
    }
    SemanticNarrativeResource.prototype.componentWillMount = function () {
        var _this = this;
        var urlValue = this.props.state.resourceIri.value;
        var dropTemplateConfig = this.props.editorProps.dropTemplateConfig;
        findTemplatesForUri(dropTemplateConfig, urlValue).onValue(function (templates) {
            _this.setState({
                loading: false,
                resourceTemplates: templates
            });
        });
    };
    SemanticNarrativeResource.prototype.renderTemplate = function () {
        var _a = this.props.state, resourceIri = _a.resourceIri, selectedTemplateKey = _a.selectedTemplateKey;
        var resourceTemplates = this.state.resourceTemplates;
        return React.createElement(template_1.TemplateItem, { template: {
                source: selectTemplate(resourceTemplates, selectedTemplateKey),
                options: { iri: resourceIri },
            } });
    };
    SemanticNarrativeResource.prototype.renderEditor = function () {
        var _this = this;
        var focused = this.props.focused;
        var rdfaRelationQueryConfig = this.props.editorProps.rdfaRelationQueryConfig;
        var resourceTemplates = this.state.resourceTemplates;
        var selectedTemplateKeyOuter = this.props.state.selectedTemplateKey ?
            this.props.state.selectedTemplateKey :
            resourceTemplates.find(function () { return true; }).id;
        var relBindingOuter = this.props.state.relBinding ? this.props.state.relBinding : {
            'label': rdf_1.Rdf.literal(rdfaRelationQueryConfig.defaultValueLabel),
            'value': rdf_1.Rdf.iri(rdfaRelationQueryConfig.defaultValue),
        };
        return React.createElement(ory_editor_ui_1.BottomToolbar, { open: focused },
            React.createElement(react_bootstrap_1.Form, { className: 'ory-resource-component-bottom-form' },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 4 }, "Display Entity as"),
                    React.createElement(react_bootstrap_1.Col, { sm: 8 },
                        React.createElement(ReactSelect, { className: 'react-select-open-top', multi: false, clearable: false, options: resourceTemplates.map(function (_a) {
                                var id = _a.id, type = _a.type, label = _a.label;
                                return ({ value: id, label: label });
                            }), value: selectedTemplateKeyOuter, placeholder: 'Display Entity as', onChange: function (selected) {
                                var selectedTemplateKey = selected.value;
                                var _a = _this.props.state, resourceIri = _a.resourceIri, relBinding = _a.relBinding;
                                _this.props.onChange({ resourceIri: resourceIri, relBinding: relBinding, selectedTemplateKey: selectedTemplateKey });
                            } }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 4 }, "Semantic Relation"),
                    React.createElement(react_bootstrap_1.Col, { sm: 8 },
                        React.createElement(inputs_1.AutoCompletionInput, tslib_1.__assign({ className: 'react-select-open-top' }, rdfaRelationQueryConfig, { autoload: true, value: relBindingOuter, actions: {
                                onSelected: function (relBinding) {
                                    var _a = _this.props.state, resourceIri = _a.resourceIri, selectedTemplateKey = _a.selectedTemplateKey;
                                    _this.props.onChange({ resourceIri: resourceIri, relBinding: relBinding, selectedTemplateKey: selectedTemplateKey });
                                },
                            } }))))));
    };
    SemanticNarrativeResource.prototype.render = function () {
        if (this.state.loading) {
            return React.createElement(spinner_1.Spinner, null);
        }
        if (this.props.editorProps.readOnly) {
            return this.renderTemplate();
        }
        else {
            return react_1.DOM.div({ className: SemanticNarrativeResource.className }, this.renderTemplate(), this.renderEditor());
        }
    };
    return SemanticNarrativeResource;
}(react_1.Component));
SemanticNarrativeResource.className = 'ory-resource-component';
exports.SemanticNarrativeResource = SemanticNarrativeResource;
