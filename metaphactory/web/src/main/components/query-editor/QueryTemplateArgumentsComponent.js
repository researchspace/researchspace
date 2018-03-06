Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var data_either_1 = require("data.either");
var overlay_1 = require("platform/components/ui/overlay");
var QueryTemplateEditArgument_1 = require("./QueryTemplateEditArgument");
var Well = react_1.createFactory(ReactBootstrap.Well);
var Panel = react_1.createFactory(ReactBootstrap.Panel);
var PanelGroup = react_1.createFactory(ReactBootstrap.PanelGroup);
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var ControlLabel = react_1.createFactory(ReactBootstrap.ControlLabel);
var Button = react_1.createFactory(ReactBootstrap.Button);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var QueryTemplateArgumentsComponent = (function (_super) {
    tslib_1.__extends(QueryTemplateArgumentsComponent, _super);
    function QueryTemplateArgumentsComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.handleAddNewArgument = function () {
            var emptyArgument = {
                label: '',
                variable: '',
                comment: '',
                optional: false,
                valueType: '',
            };
            _this.setState({ activeKey: _this.props.args.length }, function () {
                _this.props.onAdd(data_either_1.Left(emptyArgument));
            });
        };
        _this.handleDeleteArgument = function (index) {
            var title = 'Delete Argument';
            var body = react_1.DOM.div({ style: { textAlign: 'center' } }, react_1.DOM.h5({ style: { margin: '0 0 20px' } }, 'Are You Sure?'), ButtonToolbar({ style: { display: 'inline-block' } }, Button({ bsStyle: 'success', onClick: function () {
                    overlay_1.getOverlaySystem().hide(title);
                    _this.props.onDelete(index);
                } }, 'Yes'), Button({ bsStyle: 'danger', onClick: function () { return overlay_1.getOverlaySystem().hide(title); } }, 'No')));
            overlay_1.getOverlaySystem().show(title, react_1.createElement(overlay_1.OverlayDialog, {
                show: true,
                title: title,
                bsSize: 'sm',
                onHide: function () { return overlay_1.getOverlaySystem().hide(title); },
                children: body,
            }));
        };
        _this.handleChangeArgument = function (arg, index, isValid) {
            var argument = isValid ? data_either_1.Right(arg) : data_either_1.Left(arg);
            _this.props.onChange(argument, index);
        };
        _this.renderArgument = function (argument, index, isValid) {
            var _a = _this.props, args = _a.args, variables = _a.variables;
            var filteredArgs = args.filter(function (arg, i) {
                return i !== index;
            });
            var notAvailableLabels = filteredArgs.map(function (arg) {
                return arg.fold(function (item) { return item.label; }, function (item) { return item.label; });
            });
            var notAvailableVariables = filteredArgs.map(function (arg) {
                return arg.fold(function (item) { return item.variable; }, function (item) { return item.variable; });
            });
            return Panel({
                key: index,
                header: argument.label.length ? argument.label : 'No Label',
                eventKey: index,
                onSelect: function (key) { return _this.setState({ activeKey: key }); },
                bsStyle: isValid ? 'default' : 'danger',
            }, react_1.createElement(QueryTemplateEditArgument_1.QueryTemplateEditArgument, {
                argument: argument,
                variables: variables,
                notAvailableLabels: notAvailableLabels,
                notAvailableVariables: notAvailableVariables,
                onDelete: function () {
                    _this.handleDeleteArgument(index);
                },
                onChange: function (arg, flag) {
                    _this.handleChangeArgument(arg, index, flag);
                },
            }));
        };
        _this.state = {
            activeKey: 0,
        };
        return _this;
    }
    QueryTemplateArgumentsComponent.prototype.render = function () {
        var _this = this;
        var activeKey = this.state.activeKey;
        return FormGroup({ style: { width: '50%' } }, ControlLabel({}, 'Arguments'), Well({}, this.props.args.length
            ? PanelGroup({ activeKey: activeKey, accordion: true }, this.props.args.map(function (item, index) {
                return item.fold(function (arg) { return _this.renderArgument(arg, index, false); }, function (arg) { return _this.renderArgument(arg, index, true); });
            }))
            : null, Button({ bsSize: 'small', onClick: this.handleAddNewArgument }, 'Add New Argument')));
    };
    return QueryTemplateArgumentsComponent;
}(react_1.Component));
exports.QueryTemplateArgumentsComponent = QueryTemplateArgumentsComponent;
exports.component = QueryTemplateArgumentsComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
