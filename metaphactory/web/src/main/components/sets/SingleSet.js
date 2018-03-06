Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Immutable = require("immutable");
var classnames = require("classnames");
var async_1 = require("platform/api/async");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var rdf_1 = require("platform/api/rdf");
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
var SetManagement_1 = require("./SetManagement");
var SingleSet = (function (_super) {
    tslib_1.__extends(SingleSet, _super);
    function SingleSet(props, context) {
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
    SingleSet.prototype.getChildContext = function () {
        var _this = this;
        var superContext = _super.prototype.getChildContext.call(this);
        var childContext = {
            'mp-set-management': {
                removeSet: this.model.removeSet,
                removeSetItem: this.model.removeSetItem,
                startRenamingSet: this.model.startRenamingSet,
            },
            'mp-set-management--set-view': {
                getCurrentSet: function () { return _this.state.openedSet; },
            },
        };
        return tslib_1.__assign({}, superContext, childContext);
    };
    SingleSet.prototype.setState = function (state) {
        _super.prototype.setState.call(this, state);
        this.state = tslib_1.__assign({}, this.state, state);
    };
    SingleSet.prototype.componentDidMount = function () {
        this.registerEventsListener();
        var placeholder = ViewModel_1.emptySet(rdf_1.Rdf.iri(this.props.openedSet));
        this.setState({
            sets: Immutable.Map()
                .set(placeholder.iri.value, placeholder)
        });
        this.model.openAndLoadSet(placeholder.iri);
    };
    SingleSet.prototype.registerEventsListener = function () {
        var _this = this;
        this.cancellation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: events_1.BuiltInEvents.ComponentRefresh,
            target: this.props.id,
        })).onValue(function () { return _this.model.loadSets({ keepItems: false }); });
    };
    SingleSet.prototype.trigger = function (eventType) {
        this.context.GLOBAL_EVENTS.trigger({ eventType: eventType, source: this.props.id });
    };
    SingleSet.prototype.render = function () {
        var _this = this;
        var className = classnames((_a = {},
            _a[SetManagement_1.CLASS_NAME] = true,
            _a[SetManagement_1.CLASS_NAME + "--list-view"] = this.state.itemViewMode === 'list',
            _a[SetManagement_1.CLASS_NAME + "--grid-view"] = this.state.itemViewMode === 'grid',
            _a));
        return (React.createElement(DropArea_1.DropArea, { className: className, shouldReactToDrag: function () { return !_this.state.draggingItem; }, query: this.props.acceptResourceQuery, onDrop: function (iri) {
                var targetSet = ViewModel_1.ViewState.displayedSetIri(_this.state);
                _this.model.onDropItemToSet(iri, targetSet);
            }, dropMessage: React.createElement("span", null,
                "Drop items here to add to set \"",
                React.createElement(resource_label_1.ResourceLabel, { iri: this.props.openedSet }),
                "\"") },
            this.renderHeader(),
            this.renderItems()));
        var _a;
    };
    SingleSet.prototype.renderHeader = function () {
        var _this = this;
        var set = ViewModel_1.ViewState.openedSet(this.state);
        if (!set) {
            return React.createElement(spinner_1.Spinner, null);
        }
        var _a = this.state, itemsOrdering = _a.itemsOrdering, itemViewMode = _a.itemViewMode;
        var setHasItems = set.items && set.items.length > 0;
        var reorderProps = setHasItems ? {
            baseClass: SetManagement_1.CLASS_NAME,
            canReorder: setHasItems,
            isReordering: Boolean(itemsOrdering),
            onPressReorder: function () { return _this.setState({
                itemsOrdering: itemsOrdering ? undefined : reorderable_list_1.Ordering.empty,
            }); },
            onPressReorderApply: this.model.applyItemsOrder,
        } : undefined;
        return (React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-header" },
            React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-header-top" },
                this.renderCaption(set),
                React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-header-spacer" }),
                React.createElement(SearchAndFilters_1.SearchAndFilters, { baseClass: SetManagement_1.CLASS_NAME, keywordFilter: this.props.keywordFilter, filters: this.props.filters, setIsOpen: true, minInputLength: this.model.minSearchTermLength(), searchText: this.state.search.searchText, filterValues: this.state.search.filterValues, onSearchTextChanged: function (searchText) {
                        _this.model.onFilterChanged(true, searchText, _this.state.search.filterValues);
                    }, onFilterChanged: function (filterValues) {
                        _this.model.onFilterChanged(false, _this.state.search.searchText, filterValues);
                    } })),
            React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-header-bottom" },
                this.props.children,
                React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-header-spacer" }),
                reorderProps ? React.createElement(Footer_1.ReorderItemsButton, tslib_1.__assign({}, reorderProps)) : null,
                React.createElement(Footer_1.ItemViewModeSwitch, { baseClass: SetManagement_1.CLASS_NAME, mode: itemViewMode, onModeChanged: this.model.setItemViewMode })),
            (reorderProps && itemsOrdering) ? React.createElement(Footer_1.ReorderConfirmation, tslib_1.__assign({}, reorderProps)) : null));
    };
    SingleSet.prototype.renderCaption = function (set) {
        var _this = this;
        var isEditing = Boolean(set.editing);
        return (React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-caption" },
            React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__single-set-icon" },
                React.createElement("span", { className: 'fa fa-folder-open' })),
            isEditing
                ? React.createElement(SetsAndItems_1.EditableLabel, { editing: set.editing, onEditCompleted: function (newName) { return _this.model.onSetEditCompleted(set, newName); }, className: SetManagement_1.CLASS_NAME + "__single-set-label" })
                : React.createElement(resource_label_1.ResourceLabel, { iri: this.props.openedSet, className: SetManagement_1.CLASS_NAME + "__single-set-label" }),
            !isEditing ? (React.createElement("button", { type: 'button', title: 'Rename set', className: SetManagement_1.CLASS_NAME + "__single-set-rename-button", onClick: function () { return _this.model.startRenamingSet(set.iri); } },
                React.createElement("span", { className: 'fa fa-pencil' }))) : null));
    };
    SingleSet.prototype.renderItems = function () {
        var _this = this;
        var itemsOrdering = this.state.itemsOrdering;
        var set = ViewModel_1.ViewState.openedSet(this.state);
        var highlightedTerm = undefined;
        if (ViewModel_1.ViewState.isSearchOpened(this.state)) {
            highlightedTerm = this.state.search.searchText;
            var results = this.state.search.results;
            var searchSet = results ? results.get(this.props.openedSet) : undefined;
            if (searchSet) {
                set = searchSet;
            }
            else {
                return React.createElement("div", { className: SetManagement_1.CLASS_NAME + "__search-results-empty" }, "No results found");
            }
        }
        return (React.createElement(SetsAndItems_1.ItemsView, { key: 'default-set-items', baseClass: SetManagement_1.CLASS_NAME, set: set, template: this.model.templateForKind, highlightedTerm: highlightedTerm, onDragStart: this.onDragStart, onDragEnd: this.onDragEnd, itemsOrdering: itemsOrdering, onOrderChanged: function (order) { return _this.setState({ itemsOrdering: order }); } }));
    };
    return SingleSet;
}(components_1.Component));
SingleSet.defaultProps = Defaults.ForAllProps;
SingleSet.childContextTypes = tslib_1.__assign({}, components_1.Component.childContextTypes, SetManagementApi_1.SetManagementContextTypes, SetManagementApi_1.SetViewContextTypes);
exports.SingleSet = SingleSet;
exports.default = SingleSet;
