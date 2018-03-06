Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var immutable_1 = require("immutable");
var Maybe = require("data.maybe");
var components_1 = require("platform/api/components");
var OverlaySystem = (function (_super) {
    tslib_1.__extends(OverlaySystem, _super);
    function OverlaySystem(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.show = function (key, dialog, context) {
            _this.setState({
                dialogs: _this.state.dialogs.set(key, { element: dialog, context: context }),
            });
        };
        _this.hide = function (key) {
            _this.setState({
                dialogs: _this.state.dialogs.remove(key),
            });
        };
        _this.hideAll = function () {
            _this.setState({
                dialogs: _this.state.dialogs.clear(),
            });
        };
        _this.state = {
            dialogs: immutable_1.OrderedMap(),
        };
        return _this;
    }
    OverlaySystem.prototype.render = function () {
        return react_1.DOM.div({}, this.state.dialogs
            .map(function (modal, key) {
            var semanticContext = Maybe.fromNullable(modal.context).map(function (c) { return c.semanticContext; }).getOrElse({});
            return react_1.createElement(components_1.SemanticContextProvider, tslib_1.__assign({}, semanticContext), react_1.cloneElement(modal.element, { key: key }));
        })
            .toArray());
    };
    return OverlaySystem;
}(react_1.Component));
exports.OverlaySystem = OverlaySystem;
exports.default = OverlaySystem;
