Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var lambda = require("core.lambda");
var assign = require("object-assign");
var classNames = require("classnames");
var ReactSelectComponent = require("react-select");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var LabelsService = require("platform/api/services/resource-label");
var async_1 = require("platform/api/async");
var template_1 = require("platform/components/ui/template");
var ReactSelect = react_1.createFactory(ReactSelectComponent);
var AbstractAutoCompletionInput = (function (_super) {
    tslib_1.__extends(AbstractAutoCompletionInput, _super);
    function AbstractAutoCompletionInput(props) {
        var _this = _super.call(this, props) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.keyPressStream = Kefir.pool();
        _this.initStream = Kefir.pool();
        _this.forceSuggestionStream = Kefir.pool();
        _this.loadOptions = function (query) {
            _this.keyPressStream.plug(Kefir.constant(query));
        };
        _this.onChange = function (x) {
            _this.setState({ value: x });
            _this.props.actions.onSelected(x);
        };
        _this.onKeyDown = function (event) {
            if (_this.props.allowForceSuggestion) {
                if (event.keyCode === 13) {
                    _this.forceSuggestionStream.plug(Kefir.constant(event.keyCode));
                }
            }
        };
        _this.customSuggestionRenderer = function (template) { return function (option) {
            return react_1.createElement(template_1.TemplateItem, {
                template: {
                    source: template,
                    options: option,
                },
            });
        }; };
        _this.executeSuggestionQuery = function (token) {
            var _a = _this.props, defaultQueryFn = _a.defaultQueryFn, queryFn = _a.queryFn;
            var queryToUse = _.isEmpty(token) && defaultQueryFn ? defaultQueryFn : queryFn;
            return queryToUse(token, _this.state.searchTermVariable);
        };
        _this.state = {
            value: undefined,
            options: undefined,
            loading: false,
        };
        return _this;
    }
    AbstractAutoCompletionInput.prototype.componentWillMount = function () {
        this.setState(assign(this.applyDefaultProps(this.props)));
    };
    AbstractAutoCompletionInput.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    AbstractAutoCompletionInput.prototype.componentDidMount = function () {
        var _this = this;
        if (this.props.defaultQueryFn) {
            this.initStream.plug(Kefir.constant(''));
        }
        var requestProperty = Kefir.merge([
            this.initStream
                .take(1)
                .map(function (query) {
                _this.setState({ loading: true });
                return query;
            }),
            this.forceSuggestionStream
                .map(function (event) {
                var query = _this.state.query;
                if (query.length < _this.state.minimumInput) {
                    _this.setState({ loading: true });
                }
                else {
                    _this.setState({ loading: false, options: undefined });
                }
                return query;
            })
                .filter(function (query) { return query.length < _this.state.minimumInput; }),
            this.keyPressStream
                .map(function (query) {
                _this.setState({ query: query });
                if (query.length >= _this.state.minimumInput) {
                    _this.setState({ loading: true });
                }
                else {
                    _this.setState({ loading: false, options: undefined });
                }
                return query;
            })
                .filter(function (query) { return query.length >= _this.state.minimumInput; })
                .debounce(300),
        ])
            .flatMapLatest(this.executeSuggestionQuery);
        this.cancellation.map(requestProperty)
            .onValue(function (vals) { return _this.setState(function (state) {
            return { options: vals, loading: false };
        }); });
    };
    AbstractAutoCompletionInput.prototype.componentWillReceiveProps = function (nextProps) {
        this.setState(this.applyDefaultProps(nextProps));
    };
    AbstractAutoCompletionInput.prototype.render = function () {
        var valueRenderer = this.customSuggestionRenderer(this.state.templates.suggestion);
        return ReactSelect({
            multi: this.state.multi,
            autofocus: this.props.autofocus,
            onCloseResetsInput: true,
            filterOptions: lambda.identity,
            isLoading: this.state.loading,
            autoload: false,
            disabled: this.state.disabled,
            className: classNames(this.state.className),
            style: this.props.style,
            ref: 'input',
            name: this.state.name,
            placeholder: this.state.placeholder,
            value: this.state.value,
            onChange: this.onChange,
            onInputChange: this.loadOptions,
            onInputKeyDown: this.onKeyDown,
            noResultsText: this.state.loading ? 'Loading ...' : (_.isUndefined(this.state.options) ? "Minimum " + this.state.minimumInput + " characters to search" :
                this.customSuggestionRenderer(this.state.templates.empty)({})),
            optionRenderer: valueRenderer,
            valueRenderer: valueRenderer,
            labelKey: this.state.labelBindingName,
            valueKey: this.state.valueBindingName,
            options: this.state.options,
            'data-datatype': this.state.datatype,
        });
    };
    AbstractAutoCompletionInput.prototype.getValue = function () {
        return this.state.value;
    };
    AbstractAutoCompletionInput.prototype.setValue = function (iri) {
        var _this = this;
        LabelsService.getLabel(iri).onValue(function (label) {
            var newValue = (_a = {},
                _a[_this.state.labelBindingName] = rdf_1.Rdf.literal(label),
                _a[_this.state.valueBindingName] = iri,
                _a);
            _this.onChange(newValue);
            var _a;
        });
    };
    AbstractAutoCompletionInput.prototype.focus = function () {
        return this.refs.input.focus();
    };
    AbstractAutoCompletionInput.prototype.applyDefaultProps = function (props) {
        var actions = assign({
            onSelected: function (token) { },
        }, props.actions);
        var templates = assign({
            empty: 'No matches for your query.',
            suggestion: '<span title="{{value.value}}">{{label.value}}</span>',
            displayKey: function (x) { return x.label.value; },
        }, props.templates);
        return assign({
            multi: false,
            placeholder: 'search',
            valueBindingName: 'value',
            labelBindingName: 'label',
            searchTermVariable: 'token',
            name: 'search-input',
            minimumInput: AbstractAutoCompletionInput.MIN_LENGTH,
            datatype: 'xsd:string',
        }, props, {
            actions: actions,
            templates: templates,
        });
    };
    return AbstractAutoCompletionInput;
}(react_1.Component));
AbstractAutoCompletionInput.defaultProps = {
    autofocus: true,
};
AbstractAutoCompletionInput.MIN_LENGTH = 3;
exports.AbstractAutoCompletionInput = AbstractAutoCompletionInput;
ReactSelectComponent.Async.propTypes['noResultsText'] = react_1.PropTypes.oneOfType([
    react_1.PropTypes.node,
    react_1.PropTypes.string,
]);
