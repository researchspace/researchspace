Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var moment = require("moment");
var async_1 = require("platform/api/async");
var utils_1 = require("platform/components/utils");
var SparqlQueryEditorContext_1 = require("./SparqlQueryEditorContext");
var LS_RECENT_QUERIES = 'recentQueries';
var MAX_LS_RECENT_QUERIES = 10;
var RecentQueries = (function (_super) {
    tslib_1.__extends(RecentQueries, _super);
    function RecentQueries() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.addRecentQueries = function (query) {
            var recentQueries = utils_1.BrowserPersistence.getItem(LS_RECENT_QUERIES);
            var recentQuery = {
                query: query,
                date: moment().format('MM/DD/YY, HH:mm'),
            };
            if (recentQueries) {
                var queries = recentQueries.toArray();
                if (queries[0].get('query') !== query) {
                    queries.unshift(recentQuery);
                }
                else {
                    queries.splice(0, 1, recentQuery);
                }
                if (queries.length > MAX_LS_RECENT_QUERIES) {
                    queries.pop();
                }
                utils_1.BrowserPersistence.setItem(LS_RECENT_QUERIES, queries);
            }
            else {
                utils_1.BrowserPersistence.setItem(LS_RECENT_QUERIES, [recentQuery]);
            }
            _this.forceUpdate();
        };
        return _this;
    }
    RecentQueries.prototype.render = function () {
        var _this = this;
        var recentQueries = utils_1.BrowserPersistence.getItem(LS_RECENT_QUERIES);
        if (!recentQueries) {
            return React.createElement("span", null, "no queries");
        }
        return React.createElement("div", { className: 'list-group', style: { marginBottom: 0 } }, recentQueries.map(function (item, index) {
            return React.createElement("a", { key: index, href: '', className: 'list-group-item', title: item.get('query'), onClick: function (e) {
                    e.preventDefault();
                    var queryEditorContext = _this.context.queryEditorContext;
                    var query = item.get('query');
                    _this.lastQuery = query;
                    queryEditorContext.setQuery(query);
                } },
                React.createElement("span", { style: {
                        background: 'lightgrey',
                        color: '#fff',
                        display: 'inline-block',
                        fontSize: '0.8em',
                        padding: '1px 5px',
                        marginBottom: 3,
                    } }, item.get('date')),
                React.createElement("div", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.get('query')));
        }));
    };
    RecentQueries.prototype.componentDidMount = function () {
        var _this = this;
        var queryEditorContext = this.context.queryEditorContext;
        this.cancellation.map(queryEditorContext.queryChanges).onValue(function (query) {
            if (query.isJust && query.get() !== _this.lastQuery) {
                _this.addRecentQueries(query.get());
            }
        });
    };
    return RecentQueries;
}(react_1.Component));
RecentQueries.contextTypes = SparqlQueryEditorContext_1.ContextTypes;
exports.RecentQueries = RecentQueries;
exports.default = RecentQueries;
