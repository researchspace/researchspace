Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var URI = require("urijs");
var _ = require("lodash");
var navigation_1 = require("platform/api/navigation");
var ResourceLinkComponent_1 = require("platform/api/navigation/components/ResourceLinkComponent");
var utils_1 = require("platform/components/utils");
require("../scss/browse-history.scss");
var BrowseHistory = (function (_super) {
    tslib_1.__extends(BrowseHistory, _super);
    function BrowseHistory(props) {
        var _this = _super.call(this, props) || this;
        _this.goBack = function () {
            navigation_1.MemoryHistory.goBack();
        };
        _this.goForward = function () {
            navigation_1.MemoryHistory.goForward();
        };
        _this.clearRecent = function () {
            var BH_RECENT_PAGES = 'recentPages';
            var recentPages = [];
            utils_1.BrowserPersistence.setItem(BH_RECENT_PAGES, recentPages);
            navigation_1.resetMemoryHistory();
            _this.getMemoryEntries();
        };
        _this.state = {
            links: []
        };
        return _this;
    }
    BrowseHistory.prototype.componentWillMount = function () {
        this.getMemoryEntries();
    };
    BrowseHistory.prototype.getMemoryEntries = function () {
        var _this = this;
        this.setState({ links: [] });
        this.entries = _.uniqWith(navigation_1.MemoryHistory.entries, _.isEqual);
        this.locIndex = this.entries.indexOf(navigation_1.MemoryHistory.location);
        this.entries.map(function (entry, index) {
            var nextUri;
            var uriPath = entry.pathname + (entry.search ? entry.search : '');
            navigation_1.resolveResourceIri(URI(uriPath)).onValue(function (mUri) {
                nextUri = mUri.getOrElse(null);
                var regex = /^<(.*)>$/g;
                var strippedUri = regex.exec(nextUri.toString());
                var entryUri = strippedUri.length > 1 ? strippedUri[1] : nextUri.toString();
                if (entryUri) {
                    _this.setState(function (currentState) {
                        return { links: currentState.links.concat({ index: index, link: entryUri })
                                .sort(function (link1, link2) { return link2.index - link1.index; }) };
                    });
                }
            });
        });
    };
    BrowseHistory.prototype.render = function () {
        return React.createElement("div", { className: 'browse-history' },
            React.createElement(react_bootstrap_1.Nav, { bsStyle: 'pills' },
                React.createElement(react_bootstrap_1.NavDropdown, { disabled: this.entries.length < 1, title: 'Recent', id: 'basic-nav-dropdown' },
                    this.state.links.map(function (link, index) {
                        return React.createElement("li", { key: link.link + index },
                            React.createElement(ResourceLinkComponent_1.default, { uri: link.link, guessRepository: true }));
                    }),
                    this.state.links.length > 1 && React.createElement("li", { className: 'divider' }),
                    this.state.links.length > 1 && React.createElement("li", null,
                        React.createElement("a", { onClick: this.clearRecent }, "Clear recent"))),
                React.createElement(react_bootstrap_1.NavItem, { disabled: this.entries.length < 2 || this.locIndex === 0, title: 'Back', onClick: this.goBack, href: '#' },
                    React.createElement("i", { className: 'fa fa-caret-left' })),
                React.createElement(react_bootstrap_1.NavItem, { disabled: this.locIndex === this.entries.length - 1 || this.entries.length === 1, title: 'Forward', onClick: this.goForward, href: '#' },
                    React.createElement("i", { className: 'fa fa-caret-right' }))));
    };
    return BrowseHistory;
}(React.Component));
exports.c = BrowseHistory;
exports.f = React.createFactory(exports.c);
exports.default = exports.c;
