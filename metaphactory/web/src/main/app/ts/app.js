Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
require("../scss/main.scss");
require("../scss/help.scss");
var module_loader_1 = require("platform/api/module-loader");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var moment = require("moment");
var _ = require("lodash");
var Kefir = require("kefir");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var overlay_1 = require("platform/components/ui/overlay");
var navigation_1 = require("platform/api/navigation");
var config_holder_1 = require("platform/api/services/config-holder");
var namespace_1 = require("platform/api/services/namespace");
var TemplateService = require("platform/api/services/template");
var SecurityService = require("platform/api/services/security");
var events_1 = require("platform/api/events");
var Page_1 = require("./page/Page");
var template_1 = require("platform/components/ui/template");
document.registerElement('mp-template-item', template_1.TemplateItemComponent);
var Cookies = require("js-cookie");
var WINDOW_SESSION_TIMEOUT = 'sessionTimeout';
var WINDOW_LAST_REQUEST_TIME = 'lastRequestTime';
var WINDOW_ANONYMOUS_WARNING = 'anonymousWarning';
var AsyncSparqlEndpointComponent = function (props) { return module_loader_1.ComponentsLoader.factory({
    componentTagName: 'mp-internal-sparql-endpoint', componentProps: props,
}); };
var MainAppComponent = (function (_super) {
    tslib_1.__extends(MainAppComponent, _super);
    function MainAppComponent() {
        var _this = _super.call(this) || this;
        _this.getSessionTimeout = function () {
            SecurityService.Util.getSessionInfo(function (sessionObject) {
                Cookies.set(WINDOW_SESSION_TIMEOUT, sessionObject.timout);
            });
        };
        _this.setupSessionTimeoutCheck = function () {
            SecurityService.Util.getUser(function (user) {
                if (user.isAnonymous && !_.isEqual(Cookies.get(WINDOW_ANONYMOUS_WARNING), Cookies.get('JSESSIONID'))) {
                    notification_1.addNotification({
                        message: 'Your are authenticated as anonymous "guest" user only',
                        level: 'warning',
                        autoDismiss: 2,
                        action: {
                            label: 'Login',
                            callback: function () { return window.location.href = '/login'; },
                        },
                    });
                    Cookies.set(WINDOW_ANONYMOUS_WARNING, Cookies.get('JSESSIONID'));
                }
                else if (!user.isAnonymous) {
                    _this.sessionIntervalID = window.setInterval(_this.checkSessionTimeout.bind(_this), 60000);
                }
            });
        };
        _this.checkSessionTimeout = function () {
            var lastRequestTime = parseInt(Cookies.get(WINDOW_LAST_REQUEST_TIME));
            var sessionTimeout = parseInt(Cookies.get(WINDOW_SESSION_TIMEOUT));
            if (_.isNaN(sessionTimeout) && _.isNaN(lastRequestTime)) {
                return;
            }
            var timeLeftMinutes = moment(sessionTimeout).diff(moment(Date.now() - lastRequestTime), 'minutes');
            if (timeLeftMinutes > 10) {
                return;
            }
            var timeLeftFormated = moment(Date.now() - lastRequestTime).to(sessionTimeout);
            if (timeLeftMinutes < 0) {
                notification_1.addNotification({
                    title: 'Session Info',
                    autoDismiss: 0,
                    message: 'Your session is expired.',
                    level: 'error',
                    action: {
                        label: 'Login',
                        callback: function () { return window.location.href = '/login'; },
                    },
                });
                window.clearInterval(_this.sessionIntervalID);
            }
            notification_1.addNotification({
                title: 'Session Info',
                autoDismiss: 57,
                message: 'Your session is about to expire ' + timeLeftFormated,
                level: 'warning',
                action: {
                    label: 'Extend Session',
                    callback: function () { return SecurityService.Util.touchSession(function () { }); },
                },
            });
        };
        _this.state = {
            headerHTML: maybe.Nothing(),
            footerHTML: maybe.Nothing(),
            route: _this.getRoute(navigation_1.getCurrentUrl()),
        };
        return _this;
    }
    MainAppComponent.prototype.getRoute = function (location) {
        if (_.last(location.segment()) === 'sparql') {
            return AsyncSparqlEndpointComponent;
        }
        else {
            return Page_1.default;
        }
    };
    MainAppComponent.prototype.componentDidMount = function () {
        var _this = this;
        this.getSessionTimeout();
        TemplateService.getHeader(function (html) {
            return module_loader_1.ModuleRegistry.parseHtmlToReact(html).then(function (components) {
                return _this.setState({
                    headerHTML: maybe.Just(components),
                });
            });
        });
        TemplateService.getFooter(function (html) {
            return module_loader_1.ModuleRegistry.parseHtmlToReact(html).then(function (components) {
                return _this.setState({
                    footerHTML: maybe.Just(components),
                });
            });
        });
        this.addLastRequestTimeInterceptorToHttpRequests();
        notification_1.registerNotificationSystem(this);
        overlay_1.registerOverlaySystem(this);
        this.setupSessionTimeoutCheck();
        navigation_1.listen({
            eventType: 'NAVIGATED',
            callback: function (event) {
                _this.setState({ route: _this.getRoute(event.url) });
            },
        });
    };
    MainAppComponent.prototype.addLastRequestTimeInterceptorToHttpRequests = function () {
        (function (open) {
            XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
                this.addEventListener('readystatechange', function () {
                    Cookies.set(WINDOW_LAST_REQUEST_TIME, Date.now());
                }, false);
                open.call(this, method, url, async, user, pass);
            };
        })(XMLHttpRequest.prototype.open);
    };
    MainAppComponent.prototype.render = function () {
        return react_1.DOM.div.apply(react_1.DOM, [{}].concat(this.getHeader(), [notification_1.renderNotificationSystem(),
            overlay_1.renderOverlaySystem(),
            react_1.createElement(this.state.route),
            this.state.footerHTML.isNothing ? null : this.state.footerHTML.get()]));
    };
    MainAppComponent.prototype.getHeader = function () {
        if (this.state.headerHTML.isNothing) {
            return [null];
        }
        else {
            var header = this.state.headerHTML.get();
            var hiddenHeader = react_1.cloneElement(header, { style: { visibility: 'hidden', position: 'relative' }, key: 'hidden-header' });
            return [header, hiddenHeader];
        }
    };
    return MainAppComponent;
}(react_1.Component));
exports.MainAppComponent = MainAppComponent;
navigation_1.listen({
    eventType: 'NAVIGATED',
    callback: function (event) {
        if (overlay_1.getOverlaySystem()) {
            overlay_1.getOverlaySystem().hideAll();
        }
    },
});
window.addEventListener('DOMContentLoaded', function () {
    Kefir.combine([navigation_1.init(), namespace_1.getRegisteredPrefixes(), config_holder_1.ConfigHolder.initializeConfig()], function (url, prefixes) {
        sparql_1.SparqlUtil.init(prefixes);
        return url;
    }).onValue(function () {
        react_dom_1.render(react_1.createElement(events_1.GlobalContextProvider, null, react_1.createElement(MainAppComponent)), document.getElementById('application'));
    }).onError(function (e) {
        var message = "Platform initialization failed: \n\n    " + e + " \n\n    Please contact the system administrator.";
        react_dom_1.render(react_1.createElement('div', { style: { color: 'red' } }, message), document.getElementById('application'));
    });
});
