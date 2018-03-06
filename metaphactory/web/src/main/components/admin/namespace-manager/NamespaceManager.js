Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var _ = require("lodash");
var ReactBootstrap = require("react-bootstrap");
var Either = require("data.either");
var navigation_1 = require("platform/api/navigation");
var NamespaceService = require("platform/api/services/namespace");
var notification_1 = require("platform/components/ui/notification");
var table_1 = require("platform/components/semantic/table");
var spinner_1 = require("platform/components/ui/spinner");
var alert_1 = require("platform/components/ui/alert");
var Button = react_1.createFactory(ReactBootstrap.Button);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var Input = react_1.createFactory(ReactBootstrap.FormControl);
var NamespaceManager = (function (_super) {
    tslib_1.__extends(NamespaceManager, _super);
    function NamespaceManager(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.getTable = function () {
            var griddleOptions = {
                resultsPerPage: 20,
            };
            var columnConfig = [
                { variableName: 'Prefix',
                    displayName: 'Prefix',
                }, {
                    variableName: 'Namespace',
                    displayName: 'Namespace',
                }, {
                    displayName: 'Delete',
                    cellTemplate: "<mp-admin-namespace-delete-action title=\"Delete\" prefix=\"{{Prefix}}\">\n                        <i class=\"fa fa-trash-o\"></i>\n                      </mp-admin-namespace-delete-action>",
                },
            ];
            var tableData = _.map(_this.state.data, function (value, key) {
                return { Prefix: key, Namespace: value };
            }).filter(function (o) { return o.Prefix.length !== 0; });
            return react_1.createElement(table_1.Table, {
                numberOfDisplayedRows: maybe.Just(10),
                columnConfiguration: columnConfig,
                data: Either.Left(tableData),
                layout: maybe.Just({ options: griddleOptions, tupleTemplate: maybe.Nothing() }),
            });
        };
        _this.getUpdatePanel = function () {
            return react_1.DOM.div({ className: 'row' }, react_1.DOM.div({ className: 'col-xs-2' }, Input({
                type: 'text',
                placeholder: 'Prefix',
                value: _this.state.selectedPrefix,
                onChange: _this.onPrefixInput,
            })), react_1.DOM.div({ className: 'col-xs-6' }, Input({
                type: 'text',
                placeholder: 'Namespace',
                value: _this.state.selectedNamespace,
                onChange: _this.onNamespaceInput,
            })), react_1.DOM.div({ className: 'col-xs-4' }, ButtonToolbar({}, Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: _this.onSetNamespace,
                disabled: (_this.state.selectedPrefix.length === 0
                    && _this.state.selectedNamespace.length === 0),
            }, 'Set Namespace'))));
        };
        _this.onPrefixInput = function (e) {
            _this.setState({
                isLoading: false,
                selectedPrefix: e.target.value.trim(),
            });
        };
        _this.onNamespaceInput = function (e) {
            _this.setState({
                isLoading: false,
                selectedNamespace: e.target.value.trim(),
            });
        };
        _this.onSetNamespace = function (e) {
            e.stopPropagation();
            e.preventDefault();
            NamespaceService.setPrefix(_this.state.selectedPrefix, _this.state.selectedNamespace).onValue(function (v) { return navigation_1.refresh(); }).onError(function (err) {
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
            selectedPrefix: '',
            selectedNamespace: '',
        };
        return _this;
    }
    NamespaceManager.prototype.render = function () {
        if (this.state.err.isJust) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.err.get() });
        }
        if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        return react_1.DOM.div({ className: 'mph-namespace-admin-component' }, this.getTable(), react_1.DOM.hr(), react_1.createElement(alert_1.Alert, this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' })), this.getUpdatePanel());
    };
    NamespaceManager.prototype.componentWillMount = function () {
        var _this = this;
        NamespaceService.getRegisteredPrefixes().onValue(function (res) {
            _this.setState({
                isLoading: false,
                data: res,
            });
        }).onError(function (err) {
            return _this.setState({
                isLoading: false,
                err: maybe.Just(err),
            });
        });
    };
    return NamespaceManager;
}(react_1.Component));
exports.NamespaceManager = NamespaceManager;
exports.default = NamespaceManager;
