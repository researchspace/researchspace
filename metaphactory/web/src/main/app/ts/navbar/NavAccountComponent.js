Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
require("../../scss/main.scss");
var React = require("react");
var ReactBootstrap = require("react-bootstrap");
var SecurityService = require("platform/api/services/security");
var components_1 = require("platform/api/navigation/components");
var NavDropdown = React.createFactory(ReactBootstrap.NavDropdown);
var NavItem = React.createFactory(ReactBootstrap.NavItem);
var MenuItem = React.createFactory(ReactBootstrap.MenuItem);
var NavAccountComponentClass = (function (_super) {
    tslib_1.__extends(NavAccountComponentClass, _super);
    function NavAccountComponentClass() {
        var _this = _super.call(this) || this;
        _this.state = {
            user: { isAuthenticated: false },
        };
        return _this;
    }
    NavAccountComponentClass.prototype.componentWillMount = function () {
        var _this = this;
        SecurityService.Util.getUser(function (userObject) { return _this.setState({
            user: userObject,
        }); });
    };
    NavAccountComponentClass.prototype.render = function () {
        return this.state.user.isAuthenticated && !this.state.user.isAnonymous
            ? NavDropdown({ id: 'main-header-dropdown', title: 'Account' }, React.createElement(components_1.ResourceLinkContainer, { uri: this.state.user.userURI }, MenuItem({ title: 'userPrincipal' }, this.state.user.principal)), MenuItem({ divider: true }, ''), MenuItem({ title: 'logout', href: '/login' }, 'Logout'))
            : NavItem({ title: 'login', href: '/login' }, 'Login');
    };
    return NavAccountComponentClass;
}(React.Component));
exports.NavAccountComponentClass = NavAccountComponentClass;
exports.NavAccount = React.createFactory(NavAccountComponentClass);
exports.default = NavAccountComponentClass;
