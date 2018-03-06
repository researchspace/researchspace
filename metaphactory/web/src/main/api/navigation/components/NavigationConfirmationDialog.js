Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var NavigationConfirmationDialog = (function (_super) {
    tslib_1.__extends(NavigationConfirmationDialog, _super);
    function NavigationConfirmationDialog() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NavigationConfirmationDialog.prototype.render = function () {
        var _a = this.props, onHide = _a.onHide, message = _a.message, onConfirm = _a.onConfirm;
        var dialog = React.createElement(react_bootstrap_1.Modal, { onHide: onHide, show: true },
            React.createElement(react_bootstrap_1.Modal.Header, null,
                React.createElement(react_bootstrap_1.Modal.Title, null, "Do you want to leave the page?")),
            React.createElement(react_bootstrap_1.Modal.Body, null,
                React.createElement("p", null, message)),
            React.createElement(react_bootstrap_1.Modal.Footer, null,
                React.createElement(react_bootstrap_1.ButtonGroup, null,
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'primary', onClick: function (e) { return onConfirm(false); } }, "Stay"),
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'danger', onClick: function (e) { return onConfirm(true); } }, "Leave"))));
        return dialog;
    };
    return NavigationConfirmationDialog;
}(React.Component));
exports.NavigationConfirmationDialog = NavigationConfirmationDialog;
