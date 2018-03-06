Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var ReactNotificationSystem = require("react-notification-system");
var NOTIFICATIAN_SYSTEM_REF = 'notificationSystem';
var _system;
function renderNotificationSystem() {
    return React.createElement(ReactNotificationSystem, { key: NOTIFICATIAN_SYSTEM_REF, ref: NOTIFICATIAN_SYSTEM_REF });
}
exports.renderNotificationSystem = renderNotificationSystem;
function registerNotificationSystem(_this) {
    _system = _this.refs[NOTIFICATIAN_SYSTEM_REF];
}
exports.registerNotificationSystem = registerNotificationSystem;
function addNotification(notification, exception) {
    if (exception) {
        console.error(exception);
    }
    return _system.addNotification(notification);
}
exports.addNotification = addNotification;
function removeNotification(uidOrNotification) {
    _system.removeNotification(uidOrNotification);
}
exports.removeNotification = removeNotification;
function clearNotifications() {
    _system.clearNotifications();
}
exports.clearNotifications = clearNotifications;
