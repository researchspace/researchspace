Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Immutable = require("immutable");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var ldp_set_1 = require("platform/api/services/ldp-set");
var resource_label_1 = require("platform/api/services/resource-label");
var notification_1 = require("platform/components/ui/notification");
var utils_1 = require("platform/components/utils");
var SetManagementEvents_1 = require("platform/api/services/ldp-set/SetManagementEvents");
var Defaults = require("./Defaults");
var SetsModel_1 = require("./SetsModel");
var LocalStorageState = utils_1.BrowserPersistence.adapter();
var ViewState;
(function (ViewState) {
    function openedSet(state) {
        return state.openedSet ? state.sets.get(state.openedSet.value) : undefined;
    }
    ViewState.openedSet = openedSet;
    function displayedSetIri(state) {
        if (state.openedSet) {
            return state.openedSet;
        }
        else if (state.defaultSet) {
            return state.defaultSet;
        }
        else {
            return undefined;
        }
    }
    ViewState.displayedSetIri = displayedSetIri;
    function displayedSet(state) {
        var iri = displayedSetIri(state);
        return (iri && state.sets) ? state.sets.get(iri.value) : undefined;
    }
    ViewState.displayedSet = displayedSet;
    function isSearchOpened(state) {
        var _a = state.search, quering = _a.quering, results = _a.results, error = _a.error;
        return quering || results || error;
    }
    ViewState.isSearchOpened = isSearchOpened;
})(ViewState = exports.ViewState || (exports.ViewState = {}));
var SEARCH_DELAY_MS = 300;
var ViewModel = (function () {
    function ViewModel(options) {
        bindAllMethods(this, ViewModel);
        this.props = options.props;
        this.getState = options.getState;
        this.setState = options.setState;
        this.getContext = options.getContext;
        this.trigger = options.trigger;
        this.cancellation = options.cancellation;
        this.loadingSets = this.cancellation.derive();
        this.searching = this.cancellation.derive();
        this.fetchingSetNameToRename = this.cancellation.derive();
    }
    ViewModel.prototype.itemConfig = function (kind) {
        if (this.props.itemConfig) {
            return this.props.itemConfig[kind.toString()];
        }
        else {
            return Defaults.itemConfig(kind);
        }
    };
    ViewModel.prototype.templateForKind = function (kind, expectedToBeSet) {
        var config = this.itemConfig(kind);
        var viewMode = this.getState().itemViewMode;
        if (viewMode === 'list') {
            return config && config.listTemplate || (expectedToBeSet ? Defaults.SetListTemplate : Defaults.ItemListTemplate);
        }
        else if (viewMode === 'grid') {
            var template = config && config.gridTemplate;
            return template || (expectedToBeSet ? Defaults.SetListTemplate : Defaults.GridTemplate);
        }
        else {
            throw new Error("Unknown item view mode");
        }
    };
    ViewModel.prototype.isSet = function (kind) {
        var config = this.itemConfig(kind);
        return config && config.isSet;
    };
    ViewModel.prototype.minSearchTermLength = function () {
        var minLength = this.props.keywordFilter.minSearchTermLength;
        return minLength === undefined ? Defaults.MinSearchTermLength : minLength;
    };
    ViewModel.prototype.rootSetIri = function () {
        return this.props.rootSetIri
            ? Kefir.constant(rdf_1.Rdf.iri(this.props.rootSetIri))
            : Kefir.fromPromise(ldp_set_1.getUserSetRootContainerIri()).toProperty();
    };
    ViewModel.prototype.defaultSetIri = function () {
        return this.props.defaultSetIri
            ? Kefir.constant(rdf_1.Rdf.iri(this.props.defaultSetIri))
            : Kefir.fromPromise(ldp_set_1.getUserDefaultSetIri()).toProperty();
    };
    ViewModel.localStorageId = function (props) {
        var suffix = props.id;
        return "mp-set-management" + (suffix ? "-" + suffix : '');
    };
    ViewModel.loadState = function (props) {
        var itemViewMode;
        if (props.persistViewMode) {
            var localState = LocalStorageState.get(ViewModel.localStorageId(props));
            if (localState.itemViewMode === 'list' || localState.itemViewMode === 'grid') {
                itemViewMode = localState.itemViewMode;
            }
        }
        return {
            search: {},
            itemViewMode: itemViewMode || props.defaultViewMode,
        };
    };
    ViewModel.prototype.setItemViewMode = function (itemViewMode) {
        if (this.props.persistViewMode) {
            LocalStorageState.update(ViewModel.localStorageId(this.props), { itemViewMode: itemViewMode });
        }
        this.setState({ itemViewMode: itemViewMode });
    };
    ViewModel.prototype.loadSets = function (params) {
        var _this = this;
        var _a = this.props, setItemsQuery = _a.setItemsQuery, setItemsMetadataQuery = _a.setItemsMetadataQuery, setCountQuery = _a.setCountQuery;
        var context = this.getContext();
        this.loadingSets.cancelAll();
        this.loadingSets = this.cancellation.derive();
        this.setState({ loadingSets: true });
        this.loadingSets.map(this.rootSetIri().flatMap(function (rootSet) { return Kefir.combine([
            _this.defaultSetIri(),
            SetsModel_1.searchForSetsAndItems({
                setItemsQuery: setItemsQuery, setItemsMetadataQuery: setItemsMetadataQuery, setCountQuery: setCountQuery, context: context,
                rootSet: rootSet, isSet: _this.isSet,
            }),
        ]); })).observe({
            value: function (_a) {
                var defaultSet = _a[0], loadedSets = _a[1];
                var state = _this.getState();
                var sets = params.keepItems ? reuseOldSetItems(loadedSets, state.sets) : loadedSets;
                if (!sets.has(defaultSet.value)) {
                    console.warn("Default set " + defaultSet + " not found");
                    sets = sets.set(defaultSet.value, emptySet(defaultSet));
                }
                var openedSet = (state.openedSet && sets.has(state.openedSet.value))
                    ? state.openedSet : undefined;
                _this.setState({ loadingSets: false, sets: sets, defaultSet: defaultSet, openedSet: openedSet });
                var activeSet = openedSet || defaultSet;
                _this.loadSetItems(activeSet, { forceReload: !params.keepItems });
                if (!activeSet.equals(defaultSet)) {
                    _this.loadSetItems(defaultSet, { forceReload: !params.keepItems });
                }
            },
            error: function (loadingError) { return _this.setState({ loadingSets: false, loadingError: loadingError }); },
        });
    };
    ViewModel.prototype.loadSetItems = function (setIri, params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        var state = this.getState();
        var set = state.sets.get(setIri.value);
        if (!set) {
            return;
        }
        if (set.items && !params.forceReload) {
            return;
        }
        this.setState({
            sets: state.sets.set(set.iri.value, tslib_1.__assign({}, set, { isLoading: true, loadingError: undefined })),
        });
        this.loadingSets.map(SetsModel_1.fetchSetItems(this.props.setItemsQuery, this.props.setItemsMetadataQuery, this.getContext(), setIri, function (kind) { return !_this.isSet(kind); })).observe({
            value: function (items) { return _this.onSetItemsLoaded(setIri, items, undefined); },
            error: function (error) { return _this.onSetItemsLoaded(setIri, undefined, error); },
        });
    };
    ViewModel.prototype.onSetItemsLoaded = function (setIri, allSetsItems, loadingError) {
        var state = this.getState();
        this.setState({
            sets: state.sets.update(setIri.value, function (set) {
                var items = set.items, itemCount = set.itemCount;
                if (!loadingError) {
                    items = allSetsItems.get(setIri.value) || [];
                    itemCount = items.length;
                }
                return tslib_1.__assign({}, set, { isLoading: false, loadingError: loadingError, items: items, itemCount: itemCount });
            }),
        });
    };
    ViewModel.prototype.openAndLoadSet = function (setIri) {
        var state = this.getState();
        if (state.openedSet && state.openedSet.equals(setIri)) {
            return;
        }
        this.loadSetItems(setIri);
        this.setState({ openedSet: setIri, search: {}, itemsOrdering: undefined });
    };
    ViewModel.prototype.onDropItemToSet = function (item, targetSet) {
        var _this = this;
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext()).flatMap(function (service) {
            return service.addToExistingSet(targetSet, item);
        })).observe({
            value: function () {
                _this.trigger(SetManagementEvents_1.SetManagementEvents.ItemAdded);
                _this.loadSetItems(targetSet, { forceReload: true });
            },
            error: function (error) {
                notification_1.addNotification({
                    level: 'error',
                    message: 'Error adding item to set',
                }, error);
            },
        });
    };
    ViewModel.prototype.onFilterChanged = function (textInput, searchText, filterValues) {
        var _this = this;
        var cancellation = this.cancellation.derive();
        this.searching.cancelAll();
        this.searching = cancellation;
        var state = this.getState();
        var search = tslib_1.__assign({}, state.search, { searchText: searchText, filterValues: filterValues });
        var hasSearchText = searchText && searchText.length >= this.minSearchTermLength();
        var hasFilterValues = filterValues && filterValues.size > 0;
        if (textInput && hasSearchText) {
            this.setState({ search: tslib_1.__assign({}, search, { quering: true }) });
            cancellation.map(Kefir.later(SEARCH_DELAY_MS, {})).onValue(function () {
                _this.startSearching(cancellation, searchText, filterValues);
            });
        }
        else if (hasSearchText || hasFilterValues) {
            this.setState({ search: tslib_1.__assign({}, search, { quering: true }) });
            this.startSearching(cancellation, hasSearchText ? searchText : undefined, filterValues);
        }
        else {
            this.setState({ search: tslib_1.__assign({}, search, { quering: false, results: undefined, error: undefined }) });
        }
    };
    ViewModel.prototype.startSearching = function (cancellation, searchText, filterValues) {
        var _this = this;
        var _a = this.props, setItemsQuery = _a.setItemsQuery, setItemsMetadataQuery = _a.setItemsMetadataQuery, setCountQuery = _a.setCountQuery;
        var state = this.getState();
        var filterPatterns = SetsModel_1.createFilterPatterns({
            setItemsQuery: this.props.setItemsQuery,
            searchPattern: this.props.keywordFilter.queryPattern,
            searchText: searchText,
            filterValues: filterValues,
        });
        cancellation.map(this.rootSetIri().flatMap(function (rootSetIri) {
            return SetsModel_1.searchForSetsAndItems({
                setItemsQuery: setItemsQuery,
                setCountQuery: setCountQuery,
                setItemsMetadataQuery: setItemsMetadataQuery,
                context: _this.getContext(),
                rootSet: rootSetIri,
                isSet: _this.isSet,
                setToSearch: state.openedSet,
                filterPatterns: filterPatterns,
            });
        })).map(function (results) { return results.filter(function (set) { return set.items && set.items.length > 0; }).toMap(); })
            .observe({
            value: function (results) { return _this.setState({ search: tslib_1.__assign({}, state.search, { quering: false, results: results }) }); },
            error: function (error) { return _this.setState({ search: tslib_1.__assign({}, state.search, { quering: false, error: error }) }); },
        });
    };
    ViewModel.prototype.startCreatingNewSet = function () {
        var newSet = tslib_1.__assign({}, emptySet(rdf_1.Rdf.iri('')), { editing: { type: SetsModel_1.EditType.Create, newName: 'My New Set' } });
        var state = this.getState();
        var sets = Immutable.OrderedMap((_a = {}, _a[newSet.iri.value] = newSet, _a))
            .concat(state.sets)
            .toOrderedMap();
        this.setState({ sets: sets, openedSet: undefined, search: {} });
        var _a;
    };
    ViewModel.prototype.onSetEditCompleted = function (modifiedSet, newName) {
        var state = this.getState();
        var editing = modifiedSet.editing;
        if (editing && editing.type === SetsModel_1.EditType.Create) {
            if (newName) {
                this.createNewSet(modifiedSet.iri, newName);
            }
            else {
                var sets = state.sets.delete(modifiedSet.iri.value);
                this.setState({ sets: sets });
            }
        }
        else if (editing && editing.type === SetsModel_1.EditType.Rename) {
            if (!editing.fetchingName && newName && newName !== editing.oldName) {
                this.renameSet(modifiedSet.iri, editing.oldName, newName);
            }
            else {
                var sets = state.sets.update(modifiedSet.iri.value, function (set) { return (tslib_1.__assign({}, set, { editing: undefined, newName: undefined })); });
                this.setState({ sets: sets });
            }
        }
    };
    ViewModel.prototype.createNewSet = function (placeholderSetIri, name) {
        var _this = this;
        var sets = this.getState().sets;
        this.setState({
            sets: sets.update(placeholderSetIri.value, function (set) { return (tslib_1.__assign({}, set, { editing: { type: SetsModel_1.EditType.ApplyingChanges } })); }),
        });
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext())
            .flatMap(function (service) { return service.createSet(name); })).observe({
            value: function () {
                _this.loadSets({ keepItems: true });
                _this.trigger(SetManagementEvents_1.SetManagementEvents.SetAdded);
            },
            error: function (error) {
                notification_1.addNotification({
                    level: 'error',
                    message: "Error creating new set '" + name,
                }, error);
            },
        });
    };
    ViewModel.prototype.renameSet = function (setIri, oldName, newName) {
        var _this = this;
        var sets = this.getState().sets;
        this.setState({
            sets: sets.update(setIri.value, function (set) { return (tslib_1.__assign({}, set, { editing: { type: SetsModel_1.EditType.ApplyingChanges } })); }),
        });
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext())
            .flatMap(function (service) { return service.renameResource(setIri, newName); })).observe({
            value: function () {
                _this.loadSets({ keepItems: true });
                _this.trigger(SetManagementEvents_1.SetManagementEvents.SetRenamed);
            },
            error: function (error) {
                notification_1.addNotification({
                    level: 'error',
                    message: "Error renaming set '" + oldName + "' to '" + newName + "'",
                }, error);
            },
        });
    };
    ViewModel.prototype.removeSet = function (set) {
        var _this = this;
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext()).flatMap(function (service) { return service.deleteResource(set); })).observe({
            value: function () {
                _this.setState({ openedSet: undefined });
                _this.loadSets({ keepItems: true });
                _this.trigger(SetManagementEvents_1.SetManagementEvents.SetRemoved);
            },
            error: function (error) {
                notification_1.addNotification({
                    level: 'error',
                    message: "Error removing set",
                }, error);
            },
        });
    };
    ViewModel.prototype.removeSetItem = function (set, item) {
        var _this = this;
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext()).flatMap(function () { return new ldp_set_1.SetService(set.value).deleteResource(item); })).observe({
            value: function () {
                _this.loadSetItems(set, { forceReload: true });
                _this.trigger(SetManagementEvents_1.SetManagementEvents.ItemRemoved);
            },
            error: function (error) {
                notification_1.addNotification({
                    level: 'error',
                    message: 'Error removing set item',
                }, error);
            },
        });
    };
    ViewModel.prototype.startRenamingSet = function (targetSet) {
        var _this = this;
        var state = this.getState();
        this.setState({
            search: {},
            sets: state.sets.update(targetSet.value, function (set) {
                if (!set || set.editing) {
                    return set;
                }
                return tslib_1.__assign({}, set, { editing: { type: SetsModel_1.EditType.Rename, fetchingName: true } });
            }),
        });
        this.fetchingSetNameToRename.cancelAll();
        this.fetchingSetNameToRename = this.cancellation.derive();
        this.fetchingSetNameToRename.map(resource_label_1.getLabel(targetSet)).observe({
            value: function (oldName) {
                var sets = _this.getState().sets;
                _this.setState({
                    sets: sets.update(targetSet.value, function (set) {
                        if (!(set && set.editing)) {
                            return set;
                        }
                        var editing = set.editing;
                        if (!(editing.type === SetsModel_1.EditType.Rename && editing.fetchingName)) {
                            return set;
                        }
                        return tslib_1.__assign({}, set, { editing: { type: SetsModel_1.EditType.Rename, oldName: oldName, newName: oldName } });
                    })
                });
            },
        });
    };
    ViewModel.prototype.applyItemsOrder = function () {
        var _this = this;
        var state = this.getState();
        var displayedSet = ViewState.displayedSet(state);
        if (!displayedSet) {
            return;
        }
        var items = state.itemsOrdering.apply(displayedSet.items);
        this.setState({
            itemsOrdering: undefined,
            sets: state.sets.update(displayedSet.iri.value, function (set) { return (tslib_1.__assign({}, set, { items: items, isLoading: true })); }),
        });
        var holders = Immutable.List(items.map(function (item) { return ({ holder: item.itemHolder, item: item.iri }); }));
        this.cancellation.map(ldp_set_1.getSetServiceForUser(this.getContext())
            .flatMap(function (service) { return service.reorderItems(displayedSet.iri, holders); })).observe({
            value: function () {
                _this.loadSetItems(displayedSet.iri, { forceReload: true });
                _this.trigger(SetManagementEvents_1.SetManagementEvents.ItemsReordered);
            },
            error: function (error) {
                var sets = _this.getState().sets;
                var set = sets.get(displayedSet.iri.value);
                if (set && set.isLoading) {
                    _this.setState({
                        sets: sets.set(set.iri.value, tslib_1.__assign({}, set, { isLoading: false })),
                    });
                }
                notification_1.addNotification({
                    level: 'error',
                    message: 'Error reordering set items',
                }, error);
            },
        });
    };
    return ViewModel;
}());
exports.ViewModel = ViewModel;
function bindAllMethods(instance, type) {
    for (var methodName in type.prototype) {
        if (type.prototype.hasOwnProperty(methodName)) {
            var method = type.prototype[methodName];
            if (typeof method === 'function') {
                instance[methodName] = method.bind(instance);
            }
        }
    }
}
function emptySet(iri) {
    return { iri: iri, kind: Defaults.SetKind, metadata: {} };
}
exports.emptySet = emptySet;
function reuseOldSetItems(newSets, oldSets) {
    if (!oldSets) {
        return newSets;
    }
    return newSets.map(function (set, key) {
        var oldSet = oldSets.get(key);
        if (!oldSet || !oldSet.items || set.items) {
            return set;
        }
        return tslib_1.__assign({}, set, { items: oldSet.items, itemCount: oldSet.itemCount });
    }).toOrderedMap();
}
