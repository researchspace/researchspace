Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var components_1 = require("platform/api/components");
var StaticComponent = (function (_super) {
    tslib_1.__extends(StaticComponent, _super);
    function StaticComponent(props, context) {
        return _super.call(this, props, context) || this;
    }
    return StaticComponent;
}(components_1.Component));
exports.StaticComponent = StaticComponent;
exports.default = StaticComponent;
