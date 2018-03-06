Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Immutable = require("immutable");
var classnames = require("classnames");
var inputs_1 = require("platform/components/ui/inputs");
var SearchAndFilters = (function (_super) {
    tslib_1.__extends(SearchAndFilters, _super);
    function SearchAndFilters() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SearchAndFilters.prototype.showAdditionalFilters = function () {
        return Boolean(this.props.filterValues);
    };
    SearchAndFilters.prototype.render = function () {
        var _this = this;
        var _a = this.props, baseClass = _a.baseClass, minInputLength = _a.minInputLength, searchText = _a.searchText, filters = _a.filters;
        return React.createElement("div", { className: baseClass + "__search-and-filters" },
            this.renderKeywordSearch(filters.length > 0),
            (searchText && searchText.length < minInputLength) ?
                React.createElement("div", { key: 'search-message', className: baseClass + "__search-message" }, "Minimum length of search term is " + minInputLength + " characters.") : undefined,
            React.createElement("div", { key: 'filters-and-badges', className: classnames((_b = {},
                    _b[baseClass + "__filters"] = true,
                    _b[baseClass + "__filters--hidden"] = !this.showAdditionalFilters(),
                    _b)) },
                React.createElement("div", { key: 'filters' }, filters.map(function (filter, index) { return _this.renderFilter(filter, index); }))));
        var _b;
    };
    SearchAndFilters.prototype.renderKeywordSearch = function (hasFilters) {
        var _this = this;
        var baseClass = this.props.baseClass;
        var placeholder = this.props.keywordFilter.placeholder;
        var _a = this.props.keywordFilter.placeholderInSet, placeholderInSet = _a === void 0 ? placeholder : _a;
        return React.createElement("div", { key: 'keyword-search', className: baseClass + "__search" },
            React.createElement(inputs_1.ClearableInput, { className: baseClass + "__search-input", value: this.props.searchText || '', placeholder: this.props.setIsOpen ? placeholderInSet : placeholder, onChange: function (e) { return _this.props.onSearchTextChanged(e.currentTarget.value); }, onClear: function () { return _this.props.onSearchTextChanged(''); } }),
            React.createElement("button", { className: classnames((_b = {},
                    _b[baseClass + "__show-filters"] = true,
                    _b['btn btn-default'] = true,
                    _b['active'] = this.showAdditionalFilters(),
                    _b)), "aria-pressed": this.showAdditionalFilters(), style: { display: hasFilters ? undefined : 'none' }, onClick: function () {
                    if (_this.showAdditionalFilters()) {
                        _this.props.onFilterChanged(undefined);
                    }
                    else {
                        _this.props.onFilterChanged(Immutable.List());
                    }
                } },
                React.createElement("span", { className: 'fa fa-ellipsis-v', title: 'Show additional filters' })));
        var _b;
    };
    SearchAndFilters.prototype.renderFilter = function (filter, index) {
        var _this = this;
        var _a = this.props, baseClass = _a.baseClass, _b = _a.filterValues, filterValues = _b === void 0 ? Immutable.List() : _b;
        return React.createElement("div", { key: index, className: baseClass + "__filter" },
            React.createElement(inputs_1.AutoCompletionInput, { placeholder: filter.placeholder, query: filter.suggestionsQuery, defaultQuery: filter.suggestionsQuery, minimumInput: this.props.minInputLength, value: filterValues
                    .filter(function (fv) { return fv.filter === filter; })
                    .map(function (fv) { return fv.binding; })
                    .toArray(), multi: true, actions: {
                    onSelected: function (bindings) {
                        if (bindings && Array.isArray(bindings)) {
                            var newFilterValues = (_a = filterValues
                                .filter(function (fv) { return fv.filter !== filter; })
                                .toList()).push.apply(_a, bindings.map(function (binding) { return ({ filter: filter, binding: binding }); }));
                            _this.props.onFilterChanged(newFilterValues);
                        }
                        var _a;
                    },
                } }));
    };
    return SearchAndFilters;
}(React.Component));
exports.SearchAndFilters = SearchAndFilters;
