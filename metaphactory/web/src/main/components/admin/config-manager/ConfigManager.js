Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var _ = require("lodash");
var ReactBootstrap = require("react-bootstrap");
var Either = require("data.either");
var ReactSelectComponent = require("react-select");
var ConfigService = require("platform/api/services/config");
var table_1 = require("platform/components/semantic/table");
var notification_1 = require("platform/components/ui/notification");
var alert_1 = require("platform/components/ui/alert");
var spinner_1 = require("platform/components/ui/spinner");
var navigation_1 = require("platform/api/navigation");
var Button = react_1.createFactory(ReactBootstrap.Button);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var Input = react_1.createFactory(ReactBootstrap.FormControl);
var ReactSelect = react_1.createFactory(ReactSelectComponent);
var ConfigManager = (function (_super) {
    tslib_1.__extends(ConfigManager, _super);
    function ConfigManager(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.getTable = function () {
            var griddleOptions = {
                resultsPerPage: 20,
            };
            var columnConfig = [
                {
                    variableName: 'key',
                    displayName: 'Name',
                },
                {
                    variableName: 'value',
                    displayName: 'Value',
                },
                {
                    variableName: 'shadowed',
                    displayName: 'Shadowed',
                },
            ];
            var tableData = _this.state.data;
            return react_1.createElement(table_1.Table, {
                numberOfDisplayedRows: maybe.Just(10),
                columnConfiguration: columnConfig,
                data: Either.Left(tableData),
                layout: maybe.Just({ options: griddleOptions, tupleTemplate: maybe.Nothing() }),
            });
        };
        _this.getUpdatePanel = function () {
            var selectOptions = {
                multi: false,
                options: _.map(_.filter(_this.state.data, function (o) { return o.shadowed !== 'yes'; }), function (value, key) { return { value: value.key, label: value.key }; }),
                clearable: true,
                allowCreate: false,
                autoload: true,
                ignoreCase: true,
                matchPos: 'any',
                matchProp: 'any',
                noResultsText: '',
                searchable: true,
                placeholder: 'Select Property',
                onChange: function (selected) {
                    var idx = -1;
                    if (selected) {
                        idx = _.findIndex(_this.state.data, function (o) { return o.key === selected.value; });
                    }
                    _this.setState({
                        isLoading: false,
                        selectedProperty: idx >= 0 ? _this.state.data[idx].key : '',
                        selectedPropertyValue: idx >= 0 ? _this.state.data[idx].value : '',
                    });
                },
                value: _this.state.selectedProperty,
            };
            return react_1.DOM.div({ className: 'row' }, [
                react_1.DOM.div({ className: 'col-xs-4' }, ReactSelect(selectOptions)),
                react_1.DOM.div({ className: 'col-xs-6' }, Input({
                    type: 'text',
                    placeholder: 'Value',
                    value: _this.state.selectedPropertyValue,
                    onChange: _this.onPropertyValueInput,
                })),
                react_1.DOM.div({ className: 'col-xs-2' }, ButtonToolbar({}, Button({
                    type: 'submit',
                    bsSize: 'small',
                    bsStyle: 'primary',
                    onClick: _this.onSetConfig,
                    disabled: (_this.state.selectedProperty.length === 0
                        && _this.state.selectedPropertyValue.length === 0
                        || _this.state.data[_this.state.selectedProperty]
                            === _this.state.selectedPropertyValue),
                }, 'Set Property'))),
            ]);
        };
        _this.onPropertyValueInput = function (e) {
            _this.setState({
                isLoading: false,
                selectedPropertyValue: e.target.value,
            });
        };
        _this.onSetConfig = function (e) {
            e.stopPropagation();
            e.preventDefault();
            ConfigService.setConfig(_this.props.group, _this.state.selectedProperty, _this.state.selectedPropertyValue.trim()).onValue(function (v) { return navigation_1.refresh(); }).onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    alert: maybe.Just(alert_1.Error(err)),
                });
            });
        };
        _this.state = {
            isLoading: true,
            alert: maybe.Nothing(),
            err: maybe.Nothing(),
            selectedProperty: '',
            selectedPropertyValue: '',
        };
        return _this;
    }
    ConfigManager.prototype.render = function () {
        if (this.state.err.isJust) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.err.get() });
        }
        if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        return react_1.DOM.div({ className: 'mph-namespace-admin-component' }, [
            this.getTable(),
            react_1.DOM.hr(),
            react_1.createElement(alert_1.Alert, this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' })),
            this.props.editable !== true
                ? react_1.DOM.i({}, this.capitalizeFirstLetter(this.props.group)
                    + ' configuration group is not editable during runtime.')
                : this.getUpdatePanel(),
        ]);
    };
    ConfigManager.prototype.componentWillMount = function () {
        var _this = this;
        if (!this.props.group) {
            this.setState({
                isLoading: false,
                err: maybe.Just('Config property group must not be empty.'),
            });
        }
        else {
            ConfigService.getConfigsInGroup(this.props.group).onValue(function (res) {
                _this.setState({
                    isLoading: false,
                    data: _.map(res, function (v, k) {
                        return {
                            'key': k,
                            'value': Array.isArray(v.value) ? v.value.join(',') : v.value,
                            'shadowed': v.shadowed ? 'yes' : '',
                        };
                    }),
                });
            }).onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    err: maybe.Just(err),
                });
            });
        }
    };
    ConfigManager.prototype.capitalizeFirstLetter = function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };
    return ConfigManager;
}(react_1.Component));
exports.ConfigManager = ConfigManager;
exports.default = ConfigManager;
