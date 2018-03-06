function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var OverlaySystem_1 = require("./OverlaySystem");
var OVERLAY_SYSTEM_REF = 'overlaySystem';
var _system;
function renderOverlaySystem() {
    return React.createElement(OverlaySystem_1.OverlaySystem, { key: OVERLAY_SYSTEM_REF, ref: OVERLAY_SYSTEM_REF });
}
exports.renderOverlaySystem = renderOverlaySystem;
function registerOverlaySystem(_this) {
    _system = _this.refs[OVERLAY_SYSTEM_REF];
}
exports.registerOverlaySystem = registerOverlaySystem;
function getOverlaySystem() {
    return _system;
}
exports.getOverlaySystem = getOverlaySystem;
__export(require("./OverlayDialog"));
