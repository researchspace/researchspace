Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var components_1 = require("platform/api/components");
var ReactBootstrap = require("react-bootstrap");
var data_maybe_1 = require("data.maybe");
var data_either_1 = require("data.either");
var Kefir = require("kefir");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var spin = rdf_1.vocabularies.spin;
var sparql_1 = require("platform/api/sparql");
var components_2 = require("platform/api/navigation/components");
var navigation_1 = require("platform/api/navigation");
var resource_label_1 = require("platform/api/services/resource-label");
var ldp_1 = require("platform/api/services/ldp");
var ldp_query_1 = require("platform/api/services/ldp-query");
var ldp_query_template_1 = require("platform/api/services/ldp-query-template");
var notification_1 = require("platform/components/ui/notification");
var inputs_1 = require("platform/components/ui/inputs");
var QueryValidatorComponent_1 = require("./QueryValidatorComponent");
var QueryTemplateArgumentsComponent = require("./QueryTemplateArgumentsComponent");
var Well = react_1.createFactory(ReactBootstrap.Well);
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var FormControl = react_1.createFactory(ReactBootstrap.FormControl);
var ControlLabel = react_1.createFactory(ReactBootstrap.ControlLabel);
var HelpBlock = react_1.createFactory(ReactBootstrap.HelpBlock);
var Button = react_1.createFactory(ReactBootstrap.Button);
var Radio = react_1.createFactory(ReactBootstrap.Radio);
var QueryValidator = react_1.createFactory(QueryValidatorComponent_1.QueryValidatorComponent);
var QUERY_OPTIONS = [
    { value: 'create', label: 'Create new query' },
    { value: 'update', label: 'Update query' },
    { value: 'reference', label: 'Reference existing query' },
];
var SELECT_TEMPLATE_COUNT_QUERY = "PREFIX spin: <http://spinrdf.org/spin#>\nSELECT (COUNT(?template) as ?templateCount) WHERE {\n  ?template spin:body ?query\n}";
var QueryTemplate = (function (_super) {
    tslib_1.__extends(QueryTemplate, _super);
    function QueryTemplate(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.identifier = Kefir.pool();
        _this.label = Kefir.pool();
        _this.description = Kefir.pool();
        _this.args = Kefir.pool();
        _this.query = Kefir.pool();
        _this.fetchTemplate = function (iri) {
            _this.queryTemplateService
                .getQueryTemplate(rdf_1.Rdf.iri(iri))
                .flatMap(_this.getQueryTemplateCount)
                .onValue(function (_a) {
                var template = _a.template, queryIri = _a.queryIri, templateCount = _a.templateCount;
                var identifier = template.identifier, label = template.label, description = template.description, args = template.args;
                resource_label_1.getLabels(template.categories).map(function (labels) { return _.map(labels.toObject(), function (v, k) {
                    return ({ iri: rdf_1.Rdf.iri(k), label: rdf_1.Rdf.iri(v) });
                }); }).onValue(function (categories) {
                    return _this.setState({ queryIri: queryIri, templateCount: templateCount, categories: categories, selectQuery: 'update' }, function () {
                        _this.identifier.plug(Kefir.constant(identifier));
                        _this.label.plug(Kefir.constant(label));
                        _this.description.plug(Kefir.constant(description));
                        args.forEach(function (arg, index) {
                            _this.setArgument(data_either_1.Right(arg), index);
                        });
                    });
                });
            });
        };
        _this.getQueryTemplateCount = function (_a) {
            var template = _a.template, queryIri = _a.queryIri;
            var query = sparql_1.SparqlClient.setBindings(sparql_1.SparqlUtil.parseQuery(SELECT_TEMPLATE_COUNT_QUERY), { 'query': rdf_1.Rdf.iri(queryIri) });
            var context = _this.context.semanticContext;
            return sparql_1.SparqlClient.select(query, { context: context }).map(function (res) {
                return {
                    template: template,
                    queryIri: queryIri,
                    templateCount: parseInt(res.results.bindings[0]['templateCount'].value),
                };
            });
        };
        _this.isUpdateMode = function () {
            return !!_this.props.iri;
        };
        _this.getTemplateTypeForQuery = function (q) {
            if (q.type === 'update') {
                return spin.UpdateTemplate;
            }
            else {
                switch (q.queryType) {
                    case 'SELECT':
                        return spin.SelectTemplate;
                    case 'CONSTRUCT':
                        return spin.ConstructTemplate;
                    case 'ASK':
                        return spin.AskTemplate;
                    default:
                        return spin.SelectTemplate;
                }
            }
        };
        _this.initPool = function () {
            var identifierMapped = _this.identifier.flatMap(_this.validateInputField);
            identifierMapped.onValue(function (v) { return _this.setState({ identifier: data_maybe_1.Just(v) }); }).onError(function (v) { return _this.setState({ identifier: data_maybe_1.Just(v), template: data_maybe_1.Nothing() }); });
            var labelMapped = _this.label.flatMap(_this.validateInputField);
            labelMapped.onValue(function (v) { return _this.setState({ label: data_maybe_1.Just(v) }); }).onError(function (v) { return _this.setState({ label: data_maybe_1.Just(v), template: data_maybe_1.Nothing() }); });
            var descriptionMapped = _this.description.flatMap(_this.validateInputField);
            descriptionMapped.onValue(function (v) { return _this.setState({ description: data_maybe_1.Just(v) }); }).onError(function (v) { return _this.setState({ description: data_maybe_1.Just(v), template: data_maybe_1.Nothing() }); });
            var argsMapped = _this.args.flatMap(_this.validateArguments);
            argsMapped.onError(function (v) { return _this.setState({ template: data_maybe_1.Nothing() }); });
            var queryMapped = _this.query;
            queryMapped.onValue(function (v) { return _this.setState({ query: v }); }).onError(function (v) { return _this.setState({ query: v, template: data_maybe_1.Nothing() }); });
            Kefir.combine({
                identifier: identifierMapped.map(function (v) { return v.value; }).toProperty(function () {
                    if (_this.state.identifier.isJust) {
                        return _this.state.identifier.get().value;
                    }
                }),
                label: labelMapped.map(function (v) { return v.value; }).toProperty(function () {
                    if (_this.state.label.isJust) {
                        return _this.state.label.get().value;
                    }
                }),
                description: descriptionMapped.map(function (v) { return v.value; }).toProperty(function () {
                    if (_this.state.description.isJust) {
                        return _this.state.description.get().value;
                    }
                }),
                args: argsMapped.toProperty(function () { return _this.state.args; }),
                query: queryMapped.toProperty(function () { return _this.state.query; }),
            }, function (_a) {
                var identifier = _a.identifier, label = _a.label, description = _a.description, args = _a.args, query = _a.query;
                if (!identifier || !label || !description || !query) {
                    return;
                }
                var categories = _this.state.categories.map(function (_a) {
                    var iri = _a.iri;
                    if (!iri.isIri()) {
                        throw new Error('Query template category is expected to be an IRI');
                    }
                    return iri;
                });
                var templateType = _this.getTemplateTypeForQuery(query);
                var template = {
                    templateType: templateType,
                    identifier: identifier,
                    label: label,
                    description: description,
                    categories: categories,
                    args: args.map(function (arg) {
                        return arg.get();
                    }),
                };
                _this.setState({ template: data_maybe_1.Just(template) });
                return {};
            }).onValue(function (o) { return o; });
        };
        _this.validateInputField = function (v) {
            if (v.length < 1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error('Please fill out this field.'),
                });
            }
            return Kefir.constant({ value: v });
        };
        _this.validateArguments = function (v) {
            var errorArgs = v.filter(function (arg) {
                return arg.isLeft;
            });
            if (errorArgs.length) {
                return Kefir.constantError(v);
            }
            return Kefir.constant(v);
        };
        _this.addArgument = function (arg) {
            _this.setState(function (prevState) {
                var args = prevState.args.slice();
                args.push(arg);
                return { args: args };
            }, function () { return _this.args.plug(Kefir.constant(_this.state.args)); });
        };
        _this.deleteArgument = function (index) {
            _this.setState(function (prevState) {
                var args = prevState.args.slice();
                args.splice(index, 1);
                return { args: args };
            }, function () { return _this.args.plug(Kefir.constant(_this.state.args)); });
        };
        _this.setArgument = function (arg, index) {
            _this.setState(function (prevState) {
                var args = prevState.args.slice();
                args.splice(index, 1, arg);
                return { args: args };
            }, function () { return _this.args.plug(Kefir.constant(_this.state.args)); });
        };
        _this.createQuery = function () {
            return _this.queryService.addItem(_this.state.query).map(function (iri) { return iri.value; });
        };
        _this.updateQuery = function () {
            var iri = rdf_1.Rdf.iri(_this.state.queryIri);
            return _this.queryService.updateItem(iri, _this.state.query);
        };
        _this.onSaveError = function () {
            _this.setState({ inProgress: false });
            notification_1.addNotification({
                title: 'Error!',
                message: 'An error has occurred while template saving. Try again later.',
                level: 'error',
            });
        };
        _this.onUpdateSuccess = function () {
            _this.setState({ inProgress: false });
            notification_1.addNotification({
                title: 'Success!',
                message: 'Template updated successfully',
                level: 'success',
            });
            navigation_1.refresh();
        };
        _this.onUpdateError = function () {
            _this.setState({ inProgress: false });
            notification_1.addNotification({
                title: 'Error!',
                message: 'An error has occurred while template updating. Try again later.',
                level: 'error',
            });
        };
        _this.createTemplate = function () {
            var namespace = _this.props.namespace;
            var _a = _this.state, selectQuery = _a.selectQuery, existingQueryIri = _a.existingQueryIri, template = _a.template;
            _this.setState({ inProgress: true });
            if (selectQuery === 'create') {
                _this.createQuery()
                    .flatMap(function (iri) { return _this.queryTemplateService.addItem(template.get(), iri, namespace); })
                    .onValue(function (iri) {
                    navigation_1.refresh();
                })
                    .onError(_this.onSaveError);
            }
            else if (selectQuery === 'reference') {
                _this.queryTemplateService
                    .addItem(template.get(), existingQueryIri, namespace)
                    .onValue(function (iri) {
                    navigation_1.refresh();
                })
                    .onError(_this.onSaveError);
            }
        };
        _this.updateTemplate = function () {
            var namespace = _this.props.namespace;
            var _a = _this.state, selectQuery = _a.selectQuery, queryIri = _a.queryIri, existingQueryIri = _a.existingQueryIri, template = _a.template;
            var iri = rdf_1.Rdf.iri(_this.props.iri);
            _this.setState({ inProgress: true });
            if (selectQuery === 'create') {
                _this.createQuery()
                    .flatMap(function (qIri) {
                    return _this.queryTemplateService.updateItem(iri, template.get(), qIri, namespace);
                })
                    .onValue(_this.onUpdateSuccess)
                    .onError(_this.onUpdateError);
            }
            else if (selectQuery === 'update') {
                _this.updateQuery()
                    .flatMap(function () {
                    return _this.queryTemplateService.updateItem(iri, template.get(), queryIri, namespace);
                })
                    .onValue(_this.onUpdateSuccess)
                    .onError(_this.onUpdateError);
            }
            else if (selectQuery === 'reference') {
                _this.queryTemplateService
                    .updateItem(iri, template.get(), existingQueryIri, namespace)
                    .onValue(_this.onUpdateSuccess)
                    .onError(_this.onUpdateError);
            }
        };
        _this.onChangeQuery = function (query, isValid) {
            if (isValid) {
                _this.query.plug(Kefir.constant(query));
            }
            else {
                _this.query.plug(Kefir.constantError(query));
            }
        };
        _this.getValidationState = function (value) {
            if (value.isJust && value.get().error) {
                return 'error';
            }
        };
        _this.getQuerySection = function () {
            var _a = _this.state, selectQuery = _a.selectQuery, queryIri = _a.queryIri, existingQueryIri = _a.existingQueryIri, templateCount = _a.templateCount;
            if (selectQuery === 'create') {
                return QueryValidator({
                    query: _this.state.query,
                    onChange: _this.onChangeQuery,
                    onChangeVariables: function (v) { return _this.setState({ variables: v }); },
                });
            }
            else if (selectQuery === 'update') {
                return react_1.DOM.div({}, templateCount > 1
                    ? HelpBlock({}, "* This query is used in " + templateCount + "\n             templates and inline editing is disabled. Click ", react_1.createElement(components_2.ResourceLink, {
                        resource: rdf_1.Rdf.iri('http://www.metaphacts.com/resource/admin/EditBaseQuery'),
                        params: { 'queryiri': queryIri },
                    }, 'here'), ' to edit the query.')
                    : null, QueryValidator({
                    iri: queryIri,
                    viewOnly: templateCount > 1,
                    onChange: _this.onChangeQuery,
                    onChangeVariables: function (v) { return _this.setState({ variables: v }); },
                }));
            }
            else if (selectQuery === 'reference') {
                var autoComplete = react_1.createElement(inputs_1.AutoCompletionInput, {
                    query: "PREFIX bds: <http://www.bigdata.com/rdf/search#>\n               PREFIX prov: <http://www.w3.org/ns/prov#>\n                SELECT ?iri ?label ?text ?modified  WHERE {\n                  ?iri a sp:Query ;\n                    sp:text ?text;\n                    prov:generatedAtTime ?modified;\n                    rdfs:label ?label;\n                    prov:wasAttributedTo ?user.\n                  FILTER(\n                    ?user in (<http://www.metaphacts.com/resource/user/querycatalog>,?__useruri__)\n                  )\n                  SERVICE bds:search {\n                                  ?label bds:search \"*?token*\" ;\n                                    bds:relevance ?score .\n                                }\n                } ORDER BY DESC(?score)  LIMIT 20\n                ",
                    defaultQuery: "PREFIX prov: <http://www.w3.org/ns/prov#>\n              SELECT ?iri ?label ?text ?modified WHERE {\n                  ?iri a sp:Query;\n                    sp:text ?text;\n                    prov:generatedAtTime ?modified;\n                    prov:wasAttributedTo ?user.\n                  FILTER(\n                    ?user in (<http://www.metaphacts.com/resource/user/querycatalog>,?__useruri__)\n                  )\n                  OPTIONAL {?iri rdfs:label ?label}\n                } ORDER BY DESC(?modified) LIMIT 10",
                    placeholder: 'Select query...',
                    templates: {
                        suggestion: "<mp-popover title=\"{{iri.value}}\">\n                  <mp-popover-trigger placement=\"top\"trigger='[\"hover\",\"focus\"]'>\n                    <span>{{label.value}} ({{dateTimeFormat modified.value \"LLL\"}})</span>\n                  </mp-popover-trigger>\n                  <mp-popover-content style=\"background:white;\">\n                      <div>{{text.value}}</div>\n                  </mp-popover-content>\n              </mp-popover>",
                    },
                    actions: {
                        onSelected: function (res) {
                            if (res) {
                                _this.setState({ existingQueryIri: res['iri'].value });
                            }
                            else {
                                _this.setState({ existingQueryIri: undefined, variables: [] }, function () {
                                    var query = {
                                        label: '',
                                        value: '',
                                        type: '',
                                    };
                                    _this.query.plug(Kefir.constantError(query));
                                });
                            }
                        },
                    },
                });
                return react_1.DOM.div({}, FormGroup({}, react_1.DOM.div({}, autoComplete)), (existingQueryIri
                    ? QueryValidator({
                        iri: existingQueryIri,
                        viewOnly: true,
                        onChange: _this.onChangeQuery,
                        onChangeVariables: function (v) { return _this.setState({ variables: v }); },
                    })
                    : null));
            }
            else {
                return null;
            }
        };
        _this.onLabelChanged = function (e) {
            var oldSource = _this.state.label.map(function (old) { return old.value; });
            var newSource = e.currentTarget.value;
            var newIdentifier = mapIfCorresponds({
                oldSource: oldSource, newSource: newSource,
                oldTarget: _this.state.identifier.map(function (_a) {
                    var value = _a.value;
                    return value;
                }),
                mapping: ldp_1.slugFromName,
            });
            var newDescription = mapIfCorresponds({
                oldSource: oldSource, newSource: newSource,
                oldTarget: _this.state.description.map(function (_a) {
                    var value = _a.value;
                    return value;
                }),
            });
            var newQueryLabel = mapIfCorresponds({
                oldSource: oldSource, newSource: newSource,
                oldTarget: data_maybe_1.fromNullable(_this.state.query).map(function (query) { return query.label; }),
            });
            _this.label.plug(Kefir.constant(newSource));
            if (newIdentifier.isJust) {
                _this.identifier.plug(Kefir.constant(newIdentifier.get()));
            }
            if (newDescription.isJust) {
                _this.description.plug(Kefir.constant(newDescription.get()));
            }
            if (newQueryLabel.isJust) {
                _this.query.plug(Kefir.constant(tslib_1.__assign({}, _this.state.query, { label: newQueryLabel.get() })));
            }
        };
        _this.onDescriptionChanged = function (e) {
            var oldSource = _this.state.description.map(function (old) { return old.value; });
            var newSource = e.currentTarget.value;
            var newQueryLabel = mapIfCorresponds({
                oldSource: oldSource, newSource: newSource,
                oldTarget: data_maybe_1.fromNullable(_this.state.query).map(function (query) { return query.label; }),
            });
            _this.description.plug(Kefir.constant(newSource));
            if (newQueryLabel.isJust) {
                _this.query.plug(Kefir.constant(tslib_1.__assign({}, _this.state.query, { label: newQueryLabel.get() })));
            }
        };
        var semanticContext = _this.context.semanticContext;
        _this.queryTemplateService = ldp_query_template_1.QueryTemplateService(semanticContext);
        _this.queryService = ldp_query_1.QueryService(semanticContext);
        _this.state = {
            identifier: data_maybe_1.Nothing(),
            label: data_maybe_1.Nothing(),
            description: data_maybe_1.Nothing(),
            categories: [],
            selectQuery: 'create',
            query: undefined,
            variables: [],
            args: [],
            template: data_maybe_1.Nothing(),
            inProgress: false,
        };
        return _this;
    }
    QueryTemplate.prototype.componentWillMount = function () {
        this.initPool();
    };
    QueryTemplate.prototype.componentDidMount = function () {
        var _this = this;
        if (this.isUpdateMode()) {
            this.fetchTemplate(this.props.iri);
        }
        else if (this.props.defaultQuery) {
            sparql_1.SparqlUtil.parseQueryAsync(this.props.defaultQuery).onValue(function (q) {
                var queryType = (q.type === 'update') ? 'UPDATE' : q.queryType;
                _this.query.plug(Kefir.constant({
                    value: _this.props.defaultQuery,
                    type: q.type,
                    queryType: queryType,
                    label: '',
                }));
            });
        }
    };
    QueryTemplate.prototype.render = function () {
        var _this = this;
        var _a = this.state, identifier = _a.identifier, label = _a.label, description = _a.description, selectQuery = _a.selectQuery, args = _a.args, variables = _a.variables, template = _a.template, inProgress = _a.inProgress;
        var identifierField = this.isUpdateMode()
            ? null
            : FormGroup({ validationState: this.getValidationState(identifier) }, ControlLabel({}, 'Preferred Identifier*'), FormControl({
                type: 'text',
                value: identifier.isJust ? identifier.get().value : '',
                onChange: function (e) { return _this.identifier.plug(e.currentTarget.value); },
                disabled: this.isUpdateMode(),
            }), this.getValidationState(identifier) === 'error'
                ? HelpBlock({}, identifier.get().error.message)
                : null);
        var labelField = FormGroup({ validationState: this.getValidationState(label) }, ControlLabel({}, 'Label*'), FormControl({
            type: 'text',
            value: label.isJust ? label.get().value : '',
            onChange: this.onLabelChanged,
        }), this.getValidationState(label) === 'error'
            ? HelpBlock({}, label.get().error.message)
            : null);
        var descriptionField = FormGroup({ validationState: this.getValidationState(description) }, ControlLabel({}, 'Description*'), FormControl({
            componentClass: 'textarea',
            style: { resize: 'vertical' },
            value: description.isJust ? description.get().value : '',
            onChange: this.onDescriptionChanged,
        }), this.getValidationState(description) === 'error'
            ? HelpBlock({}, description.get().error.message)
            : null);
        var selectQueryOptions = this.isUpdateMode()
            ? QUERY_OPTIONS
            : QUERY_OPTIONS.filter(function (item) {
                return item.value !== 'update';
            });
        var selectQueryField = FormGroup({}, selectQueryOptions.map(function (opt) { return Radio({
            key: opt.value,
            name: 'mode',
            value: opt.value,
            inline: true,
            checked: opt.value === selectQuery,
            onChange: function (e) { return e; },
            onClick: function (e) {
                var target = e.target;
                if (selectQuery !== target.value) {
                    _this.setState({ selectQuery: target.value, variables: [] }, function () {
                        var query = {
                            label: '',
                            value: '',
                            type: '',
                        };
                        _this.query.plug(Kefir.constantError(query));
                    });
                }
            },
        }, opt.label); }));
        var querySection = this.getQuerySection();
        return react_1.DOM.div({}, labelField, identifierField, descriptionField, this.renderCategoriesField(), ControlLabel({}, 'Query*'), Well({}, selectQueryField, querySection), QueryTemplateArgumentsComponent.factory({
            args: args,
            variables: variables,
            onAdd: this.addArgument,
            onDelete: this.deleteArgument,
            onChange: this.setArgument,
        }), Button({
            bsStyle: 'success',
            disabled: template.isNothing || inProgress,
            onClick: this.isUpdateMode() ? this.updateTemplate : this.createTemplate,
        }, this.isUpdateMode() ? 'Update' : 'Save'));
    };
    QueryTemplate.prototype.renderCategoriesField = function () {
        var _this = this;
        if (!this.props.categorySuggestionQuery) {
            return null;
        }
        return FormGroup({}, ControlLabel({}, 'Categories'), react_1.createElement(inputs_1.AutoCompletionInput, {
            query: this.props.categorySuggestionQuery,
            defaultQuery: this.props.categoryDefaultQuery,
            placeholder: 'Select categories',
            multi: true,
            value: this.state.categories,
            actions: {
                onSelected: function (bindings) {
                    var categories = bindings;
                    _this.setState({ categories: categories }, function () {
                        if (_this.state.label.isJust) {
                            _this.label.plug(Kefir.constant(_this.state.label.get().value));
                        }
                    });
                },
            },
        }));
    };
    return QueryTemplate;
}(components_1.Component));
QueryTemplate.defaultProps = {
    categorySuggestionQuery: "\n      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n      SELECT ?iri ?label WHERE {\n        ?iri a skos:Concept ;\n          rdfs:label ?label .\n        FILTER(REGEX(STR(?label), $__token__, \"i\")) .\n      }\n    ",
    categoryDefaultQuery: "\n      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n      SELECT ?iri ?label WHERE {\n        ?iri a skos:Concept ;\n          rdfs:label ?label .\n      } LIMIT 10\n    ",
};
exports.QueryTemplate = QueryTemplate;
function mapIfCorresponds(params) {
    var oldSource = params.oldSource, newSource = params.newSource, _a = params.mapping, mapping = _a === void 0 ? (function (v) { return v; }) : _a;
    var oldTarget = params.oldTarget.getOrElse(undefined);
    var generateTarget = !oldTarget || params.oldSource
        .map(mapping)
        .map(function (mapped) { return oldTarget === mapped; })
        .getOrElse(false);
    return generateTarget ? data_maybe_1.Just(mapping(newSource)) : data_maybe_1.Nothing();
}
exports.default = QueryTemplate;
