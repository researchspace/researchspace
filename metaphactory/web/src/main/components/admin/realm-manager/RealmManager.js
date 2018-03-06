Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var AccountManagerComponent_1 = require("./AccountManagerComponent");
require("./RealmManager.scss");
var Tab = react_1.createFactory(ReactBootstrap.Tab);
var Tabs = react_1.createFactory(ReactBootstrap.Tabs);
var RealmManager = (function (_super) {
    tslib_1.__extends(RealmManager, _super);
    function RealmManager(props) {
        return _super.call(this, props) || this;
    }
    RealmManager.prototype.render = function () {
        return react_1.DOM.div({ className: 'realm-manager-component' }, Tabs({
            id: 'security-manager-tabs', defaultActiveKey: 'ini-realm',
            bsStyle: 'tabs', animation: true,
        }, Tab({ eventKey: 'ini-realm', title: 'INI Realm' }, AccountManagerComponent_1.default()), Tab({ eventKey: 'ldap-realm', title: 'LDAP Realm' }, react_1.DOM.div({}, 'Please contact ', react_1.DOM.a({ href: 'mailto:support@metaphacts.com' }, 'support@metaphacts.com'), ' in case you are interested in connecting the platform to LDAP.'))));
    };
    return RealmManager;
}(react_1.Component));
exports.default = RealmManager;
