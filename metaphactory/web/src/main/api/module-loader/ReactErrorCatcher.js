Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var _ = require("lodash");
var notification_1 = require("platform/components/ui/notification");
var ERROR = '__unsafeError';
var WRAPPED_BY_CATCHER = '__wrappedByErrorCatcher';
var METHODS_TO_WRAP = [
    'componentWillMount',
    'componentDidMount',
    'componentWillReceiveProps',
    'componentWillUpdate',
    'componentDidUpdate',
    'componentWillUnmount',
];
function wrap(component) {
    return function (method) {
        var isMethodNotDefined = _.isUndefined(component.prototype) ||
            !(component.prototype.hasOwnProperty(method) && component.prototype[method]);
        if (isMethodNotDefined) {
            return;
        }
        var unsafe = component.prototype[method];
        var safe = function () {
            try {
                unsafe.apply(this, arguments);
            }
            catch (e) {
                console.error(e);
                this.setState((_a = {}, _a[ERROR] = e, _a));
            }
            var _a;
        };
        safe[WRAPPED_BY_CATCHER] = true;
        component.prototype[method] = safe;
    };
}
function wrapComponent(original) {
    return function (comp) {
        if (_.isUndefined(comp.prototype) ||
            comp instanceof notification_1.ErrorNotification ||
            comp[WRAPPED_BY_CATCHER]) {
            return original.apply(this, arguments);
        }
        comp[WRAPPED_BY_CATCHER] = true;
        var unsafeRender = comp.prototype.render;
        if (!comp.prototype.unstable_handleError) {
            comp.prototype.unstable_handleError = function (e) {
                this.setState((_a = {}, _a[ERROR] = e, _a));
                var _a;
            };
        }
        comp.prototype.render = function () {
            var error = getError(this);
            if (error !== undefined) {
                return React.createElement(notification_1.ErrorNotification, { errorMessage: error });
            }
            else {
                try {
                    return unsafeRender.apply(this);
                }
                catch (e) {
                    console.error(e);
                    return React.createElement(notification_1.ErrorNotification, { errorMessage: e });
                }
            }
        };
        _.forEach(METHODS_TO_WRAP, wrap(comp));
        if (comp.prototype.getChildContext) {
            var unsafeGetChildContext_1 = comp.prototype.getChildContext;
            comp.prototype.getChildContext = function () {
                if (getError(this) !== undefined) {
                    return undefined;
                }
                try {
                    return unsafeGetChildContext_1.apply(this);
                }
                catch (e) {
                    console.error(e);
                    this.setState((_a = {}, _a[ERROR] = e, _a));
                    return undefined;
                }
                var _a;
            };
        }
        return original.apply(this, arguments);
    };
}
function getError(componentInstance) {
    return componentInstance.state ? componentInstance.state[ERROR] : undefined;
}
exports.safeReactCreateElement = wrapComponent(React.createElement);
exports.safeReactCreateFactory = wrapComponent(React.createFactory);
function initReactErrorCatcher() {
}
exports.initReactErrorCatcher = initReactErrorCatcher;
