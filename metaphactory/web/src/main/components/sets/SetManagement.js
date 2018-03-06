Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var classnames = require("classnames");
var async_1 = require("platform/api/async");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var notification_1 = require("platform/components/ui/notification");
var reorderable_list_1 = require("platform/components/ui/reorderable-list");
var resource_label_1 = require("platform/components/ui/resource-label");
var spinner_1 = require("platform/components/ui/spinner");
var DropArea_1 = require("platform/components/dnd/DropArea");
var SetManagementApi_1 = require("./SetManagementApi");
var Defaults = require("./Defaults");
var ViewModel_1 = require("./ViewModel");
var SearchAndFilters_1 = require("./views/SearchAndFilters");
var SetsAndItems_1 = require("./views/SetsAndItems");
var Footer_1 = require("./views/Footer");
require("./set-management.scss");
exports.CLASS_NAME = 'set-management';
var SetManagement = (function (_super) {
    tslib_1.__extends(SetManagement, _super);
    function SetManagement(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.onDragStart = function () { return _this.setState({ draggingItem: true }); };
        _this.onDragEnd = function () { return _this.setState({ draggingItem: false }); };
        _this.state = ViewModel_1.ViewModel.loadState(_this.props);
        _this.model = new ViewModel_1.ViewModel({
            props: _this.props,
            cancellation: _this.cancellation,
            getState: function () { return _this.state; },
            setState: function (state) { return _this.setState(state); },
            getContext: function () { return _this.context.semanticContext; },
            trigger: function (eventType) { return _this.trigger(eventType); },
        });
        return _this;
    }
    SetManagement.prototype.getChildContext = function () {
        var superContext = _super.prototype.getChildContext.call(this);
        var childContext = {
            'mp-set-management': {
                removeSet: this.model.removeSet,
                removeSetItem: this.model.removeSetItem,
                startRenamingSet: this.model.startRenamingSet,
            },
        };
        return tslib_1.__assign({}, superContext, childContext);
    };
    SetManagement.prototype.setState = function (state) {
        _super.prototype.setState.call(this, state);
        this.state = tslib_1.__assign({}, this.state, state);
    };
    SetManagement.prototype.componentDidMount = function () {
        this.model.loadSets({ keepItems: false });
        this.registerEventsListener();
    };
    SetManagement.prototype.registerEventsListener = function () {
        var _this = this;
        this.cancellation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: events_1.BuiltInEvents.ComponentRefresh,
            target: this.props.id,
        })).onValue(function () {
            _this.setState({ sets: undefined });
            _this.model.loadSets({ keepItems: false });
        });
    };
    SetManagement.prototype.trigger = function (eventType) {
        this.context.GLOBAL_EVENTS.trigger({ eventType: eventType, source: this.props.id });
    };
    SetManagement.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SetManagement.prototype.render = function () {
        var _this = this;
        var className = classnames((_a = {},
            _a[exports.CLASS_NAME] = true,
            _a[exports.CLASS_NAME + "--list-view"] = this.state.itemViewMode === 'list',
            _a[exports.CLASS_NAME + "--grid-view"] = this.state.itemViewMode === 'grid',
            _a[exports.CLASS_NAME + "--only-opened-set"] = this.state.openedSet && !ViewModel_1.ViewState.isSearchOpened(this.state),
            _a));
        var displayedSetIri = ViewModel_1.ViewState.displayedSetIri(this.state);
        var view = this.renderView();
        return (React.createElement(DropArea_1.DropArea, { className: className, shouldReactToDrag: function () { return !_this.state.draggingItem; }, query: this.props.acceptResourceQuery, onDrop: function (iri) {
                _this.model.onDropItemToSet(iri, displayedSetIri);
            }, dropMessage: displayedSetIri
                ? React.createElement("span", null,
                    "Drop items here to add to set \"",
                    React.createElement(resource_label_1.ResourceLabel, { iri: displayedSetIri.value }),
                    "\"")
                : React.createElement("span", null, "Drop items here to add to the default set") }, view));
        var _a;
    };
    SetManagement.prototype.renderView = function () {
        var _this = this;
        var readonly = this.props.readonly;
        var _a = this.state, itemViewMode = _a.itemViewMode, itemsOrdering = _a.itemsOrdering;
        var hasOpenedSet = Boolean(this.state.openedSet);
        var hasSearchOpened = ViewModel_1.ViewState.isSearchOpened(this.state);
        var displayedSet = ViewModel_1.ViewState.displayedSet(this.state);
        var setHasItems = displayedSet &&
            displayedSet.items && displayedSet.items.length > 0;
        var view = (React.createElement("div", { className: exports.CLASS_NAME + "__drop-area-children" },
            this.renderSearchAndFilters(),
            hasOpenedSet ? this.renderBackToContentsButton() : undefined,
            (hasSearchOpened ? this.renderSearchResults() :
                hasOpenedSet ? this.renderOpenedSet() :
                    this.renderAllSets()),
            React.createElement(Footer_1.Footer, { baseClass: exports.CLASS_NAME, readonly: readonly, itemViewMode: itemViewMode, onModeChanged: this.model.setItemViewMode, canReorder: setHasItems, isReordering: Boolean(itemsOrdering), onPressReorder: function () { return _this.setState({
                    itemsOrdering: itemsOrdering ? undefined : reorderable_list_1.Ordering.empty,
                }); }, onPressCreateNewSet: this.model.startCreatingNewSet, onPressReorderApply: this.model.applyItemsOrder })));
        return react_1.Children.toArray(view.props.children);
    };
    SetManagement.prototype.renderAllSets = function () {
        var _this = this;
        if (this.state.loadingError) {
            return React.createElement(notification_1.ErrorNotification, { key: 'sets-error', errorMessage: this.state.loadingError });
        }
        var _a = this.state, defaultSet = _a.defaultSet, sets = _a.sets, itemsOrdering = _a.itemsOrdering;
        var renderedSets = sets ? sets.filterNot(function (set) { return set.iri.equals(defaultSet); }).map(function (set) { return (React.createElement(SetsAndItems_1.SetWithItems, { key: set.iri.value, baseClass: exports.CLASS_NAME, set: set, showItems: false, template: _this.model.templateForKind, onOpen: function (iri) { return _this.model.openAndLoadSet(iri); }, onDragStart: _this.onDragStart, onDragEnd: _this.onDragEnd, onEditCompleted: function (newName) { return _this.model.onSetEditCompleted(set, newName); } })); }).toArray() : [React.createElement(spinner_1.Spinner, { key: 'sets-loading' })];
        return (React.createElement("div", { key: 'all-sets', className: exports.CLASS_NAME + "__sets" },
            renderedSets,
            React.createElement(SetsAndItems_1.ItemsView, { key: 'default-set-items', baseClass: exports.CLASS_NAME, set: sets ? sets.get(defaultSet.value) : undefined, template: this.model.templateForKind, onDragStart: this.onDragStart, onDragEnd: this.onDragEnd, itemsOrdering: itemsOrdering, onOrderChanged: function (order) { return _this.setState({ itemsOrdering: order }); } })));
    };
    SetManagement.prototype.renderSearchAndFilters = function () {
        var _this = this;
        var search = this.state.search;
        return (React.createElement(SearchAndFilters_1.SearchAndFilters, { key: 'search-and-filters', baseClass: exports.CLASS_NAME, keywordFilter: this.props.keywordFilter, setIsOpen: Boolean(this.state.openedSet), minInputLength: this.model.minSearchTermLength(), filters: this.props.filters, searchText: search.searchText, filterValues: search.filterValues, onSearchTextChanged: function (searchText) {
                _this.model.onFilterChanged(true, searchText, _this.state.search.filterValues);
            }, onFilterChanged: function (filterValues) {
                _this.model.onFilterChanged(false, _this.state.search.searchText, filterValues);
            } }));
    };
    SetManagement.prototype.renderSearchResults = function () {
        return (React.createElement("div", { key: 'search-results', className: exports.CLASS_NAME + "__search-results" }, this.renderSearchResultsContent()));
    };
    SetManagement.prototype.renderSearchResultsContent = function () {
        var _this = this;
        if (this.state.search.results) {
            if (this.state.search.results.size === 0) {
                return React.createElement("div", { className: exports.CLASS_NAME + "__search-results-empty" }, "No results found");
            }
            return this.state.search.results.map(function (set) { return (React.createElement(SetsAndItems_1.SetWithItems, { key: set.iri.value, baseClass: exports.CLASS_NAME, set: set, template: _this.model.templateForKind, highlightedTerm: _this.state.search.searchText, onOpen: function (iri) { return _this.model.openAndLoadSet(iri); }, onDragStart: _this.onDragStart, onDragEnd: _this.onDragEnd, onEditCompleted: function (newName) { return _this.model.onSetEditCompleted(set, newName); } })); }).toArray();
        }
        else if (this.state.search.error) {
            return React.createElement(notification_1.ErrorNotification, { key: 'search-error', errorMessage: this.state.search.error });
        }
        else {
            return React.createElement(spinner_1.Spinner, { key: 'search-loading' });
        }
    };
    SetManagement.prototype.renderBackToContentsButton = function () {
        var _this = this;
        return (React.createElement("button", { className: exports.CLASS_NAME + "__back-to-contents btn btn-success", onClick: function () { return _this.setState({
                openedSet: undefined,
                search: {},
                itemsOrdering: undefined,
            }); } },
            React.createElement("span", { className: 'fa fa-chevron-left' }),
            " Back to contents"));
    };
    SetManagement.prototype.renderOpenedSet = function () {
        var _this = this;
        var _a = this.state, openedSet = _a.openedSet, itemsOrdering = _a.itemsOrdering, sets = _a.sets;
        var set = sets ? sets.get(openedSet.value) : undefined;
        return (React.createElement(SetsAndItems_1.OpenedSetView, { set: set, baseClass: exports.CLASS_NAME, template: this.model.templateForKind, onDragStart: this.onDragStart, onDragEnd: this.onDragEnd, onEditCompleted: function (newName) { return _this.model.onSetEditCompleted(set, newName); }, itemsOrdering: itemsOrdering, onOrderChanged: function (order) { return _this.setState({ itemsOrdering: order }); } }));
    };
    return SetManagement;
}(components_1.Component));
SetManagement.defaultProps = Defaults.ForAllProps;
SetManagement.childContextTypes = tslib_1.__assign({}, components_1.Component.childContextTypes, SetManagementApi_1.SetManagementContextTypes);
exports.SetManagement = SetManagement;
exports.default = SetManagement;
