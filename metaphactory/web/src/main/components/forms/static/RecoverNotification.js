Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var StaticComponent_1 = require("./StaticComponent");
var CLASS_NAME = 'semantic-form-recover-notification';
var RecoverNotification = (function (_super) {
    tslib_1.__extends(RecoverNotification, _super);
    function RecoverNotification(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = { hidden: false };
        return _this;
    }
    RecoverNotification.prototype.render = function () {
        var _this = this;
        var showNotification = !this.state.hidden && this.props.recoveredFromStorage;
        var style = assign({}, { display: showNotification ? undefined : 'none' }, this.props.style);
        return react_1.DOM.div({
            className: CLASS_NAME,
            style: style,
        }, react_1.DOM.div({ className: CLASS_NAME + "__message" }, react_1.DOM.b({}, 'Form data has been recovered from browser storage!')), react_1.DOM.button({
            type: 'button',
            className: CLASS_NAME + "__hide btn btn-default btn-xs",
            onClick: function () { return _this.setState({ hidden: true }); },
            title: 'Hide notification',
        }, react_1.DOM.i({ id: 'hide-i', className: 'fa fa-check' }), react_1.DOM.span({ id: 'hide-span' }, ' Ok. Hide Notification.')), react_1.DOM.button({
            className: CLASS_NAME + "__discard-data btn btn-default btn-xs ",
            onClick: this.props.discardRecoveredData,
            title: 'Reset form to default state discarding all recovered data',
        }, react_1.DOM.i({ id: 'discard-i', className: 'fa fa-times' }), react_1.DOM.span({ id: 'discard-span' }, ' Discard recovered data.')));
    };
    return RecoverNotification;
}(StaticComponent_1.StaticComponent));
exports.RecoverNotification = RecoverNotification;
exports.component = RecoverNotification;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
