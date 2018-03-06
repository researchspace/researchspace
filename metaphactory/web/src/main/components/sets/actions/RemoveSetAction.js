Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var SetManagementApi_1 = require("../SetManagementApi");
var RemoveSetAction = (function (_super) {
    tslib_1.__extends(RemoveSetAction, _super);
    function RemoveSetAction(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onClick = function (e) {
            if (!_this.state.showConfirmation) {
                _this.setState({ showConfirmation: true });
                document.body.addEventListener('click', _this.handleClickOutside);
                e.stopPropagation();
            }
        };
        _this.onYesClick = function () {
            _this.setState({ isRemoving: true });
            _this.context['mp-set-management'].removeSet(_this.context['mp-set-management--set-view'].getCurrentSet());
        };
        _this.onNoClick = function () {
            _this.setState({ showConfirmation: false });
            if (_this.props.onSelect) {
                _this.props.onSelect();
            }
        };
        _this.handleClickOutside = function (event) {
            if (_this.confirmationRef && !_this.confirmationRef.contains(event.target)) {
                _this.setState({ showConfirmation: false });
            }
        };
        _this.state = {
            showConfirmation: false,
            isRemoving: false,
        };
        return _this;
    }
    RemoveSetAction.prototype.componentWillUnmount = function () {
        document.body.removeEventListener('click', this.handleClickOutside);
    };
    RemoveSetAction.prototype.render = function () {
        var _this = this;
        var child = react_1.Children.only(this.props.children);
        var props = { onClick: this.onClick };
        if (this.state.showConfirmation) {
            return React.createElement("div", { className: 'remove-set-confirmation', ref: function (node) { return (_this.confirmationRef = node); } },
                React.createElement("span", null, "Are you sure?"),
                React.createElement(react_bootstrap_1.ButtonToolbar, null,
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'default', bsSize: 'xsmall', onClick: this.onNoClick }, "no"),
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'danger', bsSize: 'xsmall', onClick: this.onYesClick }, this.state.isRemoving ? '...' : 'yes')));
        }
        else {
            return react_1.cloneElement(child, props);
        }
    };
    return RemoveSetAction;
}(react_1.Component));
RemoveSetAction.contextTypes = tslib_1.__assign({}, SetManagementApi_1.SetManagementContextTypes, SetManagementApi_1.SetViewContextTypes);
exports.RemoveSetAction = RemoveSetAction;
exports.default = RemoveSetAction;
