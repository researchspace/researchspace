Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Pagination = (function (_super) {
    tslib_1.__extends(Pagination, _super);
    function Pagination(props) {
        var _this = _super.call(this, props) || this;
        _this.pageChange = function (event) {
            _this.setPage(parseInt(event.target.getAttribute('data-value')));
        };
        return _this;
    }
    Pagination.prototype.componentDidMount = function () {
        this.updateCurrentPageIfRequested(this.props);
    };
    Pagination.prototype.componentWillUpdate = function (nextProps) {
        if (this.props.onPageChange) {
            this.updateCurrentPageIfRequested(nextProps);
        }
    };
    Pagination.prototype.updateCurrentPageIfRequested = function (props) {
        var shouldUpdatePage = typeof props.externalCurrentPage === 'number' &&
            props.externalCurrentPage !== props.currentPage;
        if (shouldUpdatePage) {
            this.setPage(props.externalCurrentPage);
        }
    };
    Pagination.prototype.setPage = function (newPage) {
        this.props.setPage(newPage);
        if (this.props.onPageChange) {
            this.props.onPageChange(newPage);
        }
    };
    Pagination.prototype.render = function () {
        if (this.props.maxPage > 1) {
            var previous = react_1.DOM.li({
                className: this.props.currentPage == 0 ? 'disabled' : '',
            }, react_1.DOM.a({
                onClick: this.props.previous,
            }, react_1.DOM.span({}, '\xAB')));
            var next = react_1.DOM.li({
                className: this.props.currentPage == (this.props.maxPage - 1) ? 'disabled' : '',
            }, react_1.DOM.a({
                onClick: this.props.next,
            }, react_1.DOM.span({}, '\xBB')));
            var startIndex = Math.max(this.props.currentPage - 5, 0);
            var endIndex = Math.min(startIndex + 11, this.props.maxPage);
            if (this.props.maxPage >= 11 && (endIndex - startIndex) <= 10) {
                startIndex = endIndex - 11;
            }
            var options = [];
            for (var i = startIndex; i < endIndex; i++) {
                var selected = this.props.currentPage == i ? 'active' : '';
                options.push(react_1.DOM.li({
                    key: i, className: selected,
                }, react_1.DOM.a({ 'data-value': i, onClick: this.pageChange }, i + 1)));
            }
            return react_1.DOM.nav({}, react_1.DOM.ul({ className: 'pagination' }, previous, options, next));
        }
        else {
            return react_1.DOM.nav({});
        }
    };
    return Pagination;
}(react_1.Component));
Pagination.defaultProps = {
    maxPage: 0,
    currentPage: 0,
};
exports.Pagination = Pagination;
