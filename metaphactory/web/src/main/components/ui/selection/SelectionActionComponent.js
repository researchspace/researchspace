Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var SelectionActionComponent = (function (_super) {
    tslib_1.__extends(SelectionActionComponent, _super);
    function SelectionActionComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSelect = function () {
            _this.props.onAction(_this.props.selection);
            _this.props.closeMenu();
        };
        return _this;
    }
    SelectionActionComponent.prototype.render = function () {
        return React.createElement(react_bootstrap_1.MenuItem, { eventKey: 1, onSelect: this.onSelect, disabled: this.props.disabled }, this.props.title);
    };
    return SelectionActionComponent;
}(react_1.Component));
exports.default = SelectionActionComponent;
