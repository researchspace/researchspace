Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var components_1 = require("platform/api/components");
var ReactBootstrap = require("react-bootstrap");
var data_maybe_1 = require("data.maybe");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var ldp_query_1 = require("platform/api/services/ldp-query");
var sparql_editor_1 = require("platform/components/sparql-editor");
require("./query-validator.scss");
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var FormControl = react_1.createFactory(ReactBootstrap.FormControl);
var ControlLabel = react_1.createFactory(ReactBootstrap.ControlLabel);
var HelpBlock = react_1.createFactory(ReactBootstrap.HelpBlock);
var QueryValidatorComponent = (function (_super) {
    tslib_1.__extends(QueryValidatorComponent, _super);
    function QueryValidatorComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.label = Kefir.pool();
        _this.query = Kefir.pool();
        _this.fetchQuery = function (iri) {
            _this.queryService.getQuery(rdf_1.Rdf.iri(iri)).onValue(function (query) {
                var label = query.label, value = query.value;
                _this.label.plug(Kefir.constant(label));
                _this.query.plug(Kefir.constant(value));
            });
        };
        _this.initPool = function () {
            var labelMapped = _this.label.flatMap(_this.validateLabel);
            labelMapped.onValue(function (v) { return _this.setState({ label: data_maybe_1.Just(v) }); }).onError(function (v) { return _this.setState({ label: data_maybe_1.Just(v), isValid: false }, _this.onChangeResult); });
            var queryMapped = _this.query.flatMap(_this.validateQuery);
            queryMapped.onValue(function (v) { return _this.setState({ query: data_maybe_1.Just(v), isValid: true }, function () {
                _this.onChangeVariables();
                _this.onChangeResult();
            }); }).onError(function (v) { return _this.setState({ query: data_maybe_1.Just(v), isValid: false }, function () {
                _this.onChangeVariables();
                _this.onChangeResult();
            }); });
            Kefir.combine([
                labelMapped.map(function (v) { return v.value; }).toProperty(function () { if (_this.state.label.isJust) {
                    return _this.state.label.get().value;
                } }),
                queryMapped.map(function (v) { return v.value; }).toProperty(function () { if (_this.state.query.isJust) {
                    return _this.state.query.get().value;
                } }),
            ], function (label, query) {
                if (!label || !query) {
                    return;
                }
                _this.setState({ isValid: true }, _this.onChangeResult);
                return {};
            }).onValue(function (o) { return o; });
        };
        _this.onChangeResult = function () {
            if (_this.props.onChange) {
                _this.props.onChange(_this.getQuery(), _this.state.isValid);
            }
        };
        _this.onChangeVariables = function () {
            if (_this.props.onChangeVariables) {
                var value = _this.state.query.get().value;
                _this.props.onChangeVariables(value.variables);
            }
        };
        _this.validateLabel = function (v) {
            if (v.length < 1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error('Short description is required.'),
                });
            }
            return Kefir.constant({ value: v });
        };
        _this.validateQuery = function (query) {
            return sparql_1.SparqlUtil.parseQueryAsync(query).flatMap(function (q) {
                var queryType = (q.type === 'update') ? 'UPDATE' : q.queryType;
                return Kefir.constant({
                    value: {
                        query: query,
                        type: q.type,
                        queryType: queryType,
                        variables: _this.getVariables(q),
                    },
                });
            }).flatMapErrors(function (e) {
                return Kefir.constantError({
                    value: {
                        query: query,
                        type: undefined,
                        queryType: undefined,
                        variables: [],
                    },
                    error: e.error || new Error(e.message),
                });
            }).toProperty();
        };
        _this.getFormValue = function (e) {
            return Kefir.constant(e.target.value);
        };
        _this.getVariables = function (query) {
            var visitor = new ((function (_super) {
                tslib_1.__extends(class_1, _super);
                function class_1() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this.variables = [];
                    return _this;
                }
                class_1.prototype.variableTerm = function (variable) {
                    var name = variable.substr(1);
                    if (this.variables.indexOf(name) === -1 && name !== '') {
                        this.variables.push(name);
                    }
                    return _super.prototype.variableTerm.call(this, variable);
                };
                return class_1;
            }(sparql_1.QueryVisitor)));
            visitor.sparqlQuery(query);
            return visitor.variables;
        };
        _this.getQuery = function () {
            var _a = _this.state, label = _a.label, query = _a.query;
            return {
                label: label.isJust ? label.get().value : '',
                value: query.isJust ? query.get().value.query : '',
                type: query.isJust ? query.get().value.type : '',
                queryType: query.isJust ? query.get().value.queryType : '',
            };
        };
        _this.getValidationState = function (value) {
            if (value.isJust && value.get().error) {
                return 'error';
            }
        };
        var semanticContext = _this.context.semanticContext;
        _this.queryService = ldp_query_1.QueryService(semanticContext);
        _this.state = {
            label: data_maybe_1.Nothing(),
            query: data_maybe_1.Nothing(),
            isValid: false,
        };
        return _this;
    }
    QueryValidatorComponent.prototype.componentWillMount = function () {
        this.initPool();
    };
    QueryValidatorComponent.prototype.componentDidMount = function () {
        this.onUpdateProps({}, this.props);
    };
    QueryValidatorComponent.prototype.componentWillReceiveProps = function (nextProps) {
        this.onUpdateProps(this.props, nextProps);
    };
    QueryValidatorComponent.prototype.onUpdateProps = function (previous, props) {
        var iri = props.iri, query = props.query;
        if (iri && iri !== previous.iri) {
            this.fetchQuery(props.iri);
        }
        else if (query && query !== previous.query) {
            if (!(previous.query && previous.query.value === query.value)) {
                this.query.plug(Kefir.constant(query.value));
            }
            if (!(previous.query && previous.query.label === query.label)) {
                var labelValue = { value: query.label };
                this.setState({ label: data_maybe_1.Just(labelValue) });
            }
        }
    };
    QueryValidatorComponent.prototype.render = function () {
        var _this = this;
        var viewOnly = this.props.viewOnly;
        var _a = this.state, label = _a.label, query = _a.query;
        var queryValue = query.isJust ? query.get().value.query : '';
        return react_1.DOM.div({ className: 'mp-query-validator' }, FormGroup({ validationState: this.getValidationState(label) }, ControlLabel({}, 'Short Description*'), FormControl({
            type: 'text',
            value: label.isJust ? label.get().value : '',
            onChange: function (e) { return _this.label.plug(_this.getFormValue(e)); },
            disabled: viewOnly,
        }), this.getValidationState(label) === 'error'
            ? HelpBlock({}, label.get().error.message)
            : null), FormGroup({}, ControlLabel({}, 'Query Type'), FormControl({
            type: 'text',
            value: query.isJust ? query.get().value.queryType : '',
            disabled: true,
        })), viewOnly
            ? react_1.DOM.pre({}, react_1.DOM.code({}, queryValue))
            : react_1.createElement(sparql_editor_1.SparqlEditor, {
                query: queryValue,
                syntaxErrorCheck: false,
                onChange: function (e) { return _this.query.plug(Kefir.constant(e.value)); },
            }), FormGroup({ validationState: this.getValidationState(query), style: { marginBottom: 0 } }, this.getValidationState(query) === 'error'
            ? HelpBlock({ style: { marginBottom: 0 } }, query.get().error.message)
            : null));
    };
    return QueryValidatorComponent;
}(components_1.Component));
exports.QueryValidatorComponent = QueryValidatorComponent;
exports.component = QueryValidatorComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
