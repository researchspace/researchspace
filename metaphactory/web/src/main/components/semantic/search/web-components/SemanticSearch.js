Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var Kefir = require("kefir");
var Maybe = require("data.maybe");
var lz_string_1 = require("lz-string");
var async_1 = require("platform/api/async");
var navigation_1 = require("platform/api/navigation");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var SearchDefaults = require("../config/Defaults");
var Serialization_1 = require("../data/search/Serialization");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var SearchProfileStore_1 = require("../data/profiles/SearchProfileStore");
var SAVED_STATE_QUERY_KEY = 'semanticSearch';
var SemanticSearch = (function (_super) {
    tslib_1.__extends(SemanticSearch, _super);
    function SemanticSearch(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.savingState = _this.cancellation.derive();
        _this.loadingResults = _this.cancellation.derive();
        _this.activeResultOperations = 0;
        _this.useInExtendedFcFrSearch = function (item) {
            return _this.setState({
                extendedSearch: Maybe.Just(item),
                facetStructure: null,
            });
        };
        _this.setBaseQuery = function (query) {
            _this.setState(function (state) {
                _this.listenForResultsLoading();
                return {
                    baseQuery: query,
                    facetStructure: query.map(function (_) { return state.facetStructure; }).getOrElse(null),
                    hasFacet: query.isJust ? state.hasFacet : false,
                    resultQuery: query,
                    resultsLoaded: false,
                };
            });
        };
        _this.setBaseQueryStructure = function (baseQueryStructure) {
            if (baseQueryStructure === _this.state.baseQueryStructure) {
                return;
            }
            if (baseQueryStructure.isJust) {
                var queryStructure = _.cloneDeep(baseQueryStructure.get());
                _this.setState({
                    baseQueryStructure: Maybe.Just(queryStructure),
                    resultState: {},
                });
                _this.saveStateIntoHistory({
                    search: queryStructure,
                    facet: _this.state.facetStructure,
                    result: {},
                });
            }
            else {
                _this.setState({ baseQueryStructure: Maybe.Nothing() });
                _this.clearCurrentHistoryItem();
            }
        };
        _this.setFacetStructure = function (facetStructure) {
            var facetAstCopy = _.cloneDeep(facetStructure);
            _this.setState({ facetStructure: facetAstCopy });
            _this.saveStateIntoHistory({
                search: _this.state.baseQueryStructure.getOrElse(undefined),
                facet: facetAstCopy,
                result: _this.state.resultState,
            });
        };
        _this.setFacetedQuery = function (query) {
            _this.listenForResultsLoading();
            _this.setState({
                resultQuery: Maybe.Just(query),
                hasFacet: true,
                resultsLoaded: false,
            });
        };
        _this.setDomain = function (domain) {
            _this.setState({ domain: Maybe.Just(domain) });
        };
        _this.getStateFromHistory = function (profileStore, params) {
            if (params === void 0) { params = {}; }
            var compressed = (params.reload || _this.serializedState === undefined)
                ? navigation_1.getCurrentUrl().query(true)[SAVED_STATE_QUERY_KEY]
                : _this.serializedState;
            if (typeof compressed === 'string') {
                try {
                    var packedJson = lz_string_1.decompressFromEncodedURIComponent(compressed);
                    var packed = JSON.parse(packedJson);
                    var serialized = Serialization_1.unpackState(packed);
                    var raw = new Serialization_1.Deserializer(profileStore).deserializeState(serialized);
                    return Maybe.Just(raw);
                }
                catch (error) {
                    if (params.reload) {
                        notification_1.addNotification({ level: 'warning', message: 'Error restoring search state' });
                    }
                    console.error('Error restoring search state: ', error);
                    return Maybe.Nothing();
                }
            }
            else {
                return Maybe.Nothing();
            }
        };
        _this.saveStateIntoHistory = function (state) {
            var previousState = _this.state.searchProfileStore
                .map(function (store) { return _this.getStateFromHistory(store); })
                .getOrElse(Maybe.Nothing());
            var compressed = Serialization_1.serializeSearch(state.search || previousState.map(function (s) { return s.search; }).getOrElse(undefined), state.facet || previousState.map(function (s) { return s.facet; }).getOrElse(undefined), state.result);
            if (compressed === _this.serializedState) {
                return;
            }
            _this.serializedState = compressed;
            _this.savingState.cancelAll();
            _this.savingState = _this.cancellation.derive();
            var currentUrl = navigation_1.getCurrentUrl().clone();
            currentUrl.removeSearch(SAVED_STATE_QUERY_KEY)
                .addSearch((_a = {}, _a[SAVED_STATE_QUERY_KEY] = compressed, _a));
            _this.savingState.map(Kefir.constant(currentUrl)).onValue(function (url) {
                window.history.replaceState({}, '', url.toString());
            });
            var _a;
        };
        _this.notifyResultLoading = function (operation) {
            _this.activeResultOperations++;
            var task = operation.task;
            _this.loadingResults.map(task).observe({
                value: function (result) {
                    _this.activeResultOperations--;
                    if (operation.type === 'count' && typeof result === 'number') {
                        _this.resultCount = result;
                    }
                    if (_this.activeResultOperations === 0) {
                        _this.setState({ resultsLoaded: true });
                    }
                },
            });
        };
        _this.updateResultState = function (componentId, stateChange) {
            _this.setState(function (_a) {
                var resultState = _a.resultState;
                return ({
                    resultState: tslib_1.__assign({}, resultState, (_b = {}, _b[componentId] = tslib_1.__assign({}, resultState[componentId], stateChange), _b)),
                });
                var _b;
            }, function () { return _this.saveStateIntoHistory({
                search: _this.state.baseQueryStructure.get(),
                facet: _this.state.facetStructure,
                result: _this.state.resultState,
            }); });
        };
        _this.state = {
            domain: Maybe.Nothing(),
            baseQuery: Maybe.Nothing(),
            baseQueryStructure: Maybe.Nothing(),
            resultQuery: Maybe.Nothing(),
            searchProfileStore: Maybe.Nothing(),
            extendedSearch: Maybe.Nothing(),
            hasFacet: false,
            resultState: {},
        };
        return _this;
    }
    SemanticSearch.prototype.getChildContext = function () {
        var context = {
            baseQuery: this.state.baseQuery,
            useInExtendedFcFrSearch: this.useInExtendedFcFrSearch,
            extendedSearch: this.state.extendedSearch,
            baseQueryStructure: this.state.baseQueryStructure,
            resultsStatus: { loaded: this.state.resultsLoaded, count: this.resultCount },
            facetStructure: Maybe.fromNullable(this.state.facetStructure),
            baseConfig: this.props,
            domain: this.state.domain,
            setDomain: this.setDomain,
            setBaseQuery: this.setBaseQuery,
            setBaseQueryStructure: this.setBaseQueryStructure,
            setFacetStructure: this.setFacetStructure,
            setFacetedQuery: this.setFacetedQuery,
            resultQuery: this.state.resultQuery,
            searchProfileStore: this.state.searchProfileStore,
            bindings: {},
            notifyResultLoading: this.notifyResultLoading,
            resultState: this.state.resultState,
            updateResultState: this.updateResultState,
        };
        return tslib_1.__assign({}, _super.prototype.getChildContext.call(this), context);
    };
    SemanticSearch.prototype.componentDidMount = function () {
        var _this = this;
        if (this.props.searchProfile) {
            this.cancellation.map(SearchProfileStore_1.createSearchProfileStore(this.props, this.props.searchProfile)).onValue(function (store) {
                var savedState = _this.getStateFromHistory(store, { reload: true });
                _this.setState({
                    searchProfileStore: Maybe.Just(store),
                    baseQueryStructure: savedState.chain(function (state) { return Maybe.fromNullable(state.search); }),
                    facetStructure: savedState
                        .chain(function (state) { return Maybe.fromNullable(state.facet); })
                        .getOrElse(undefined),
                    resultState: savedState.map(function (state) { return state.result; }).getOrElse({}),
                });
            });
        }
    };
    SemanticSearch.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticSearch.prototype.listenForResultsLoading = function () {
        this.loadingResults = this.cancellation.deriveAndCancel(this.loadingResults);
        this.activeResultOperations = 0;
        this.resultCount = undefined;
    };
    SemanticSearch.prototype.render = function () {
        return react_1.DOM.div({}, this.props.children);
    };
    SemanticSearch.prototype.clearCurrentHistoryItem = function () {
        this.savingState.cancelAll();
        var currentUri = navigation_1.getCurrentUrl();
        if (SAVED_STATE_QUERY_KEY in currentUri.query(true)) {
            window.history.replaceState({}, '', currentUri.clone().removeQuery(SAVED_STATE_QUERY_KEY).toString());
        }
    };
    return SemanticSearch;
}(components_1.Component));
SemanticSearch.defaultProps = {
    optimizer: 'blazegraph',
    categories: SearchDefaults.DefaultTextPattern(),
    searchProfile: {
        categoriesQuery: SearchDefaults.DefaultSearchProfileCategoriesQuery,
        relationsQuery: SearchDefaults.DefaultSearchProfileRelationsQuery,
        defaultProfile: SearchDefaults.DefaultProfile,
    },
    limit: SearchDefaults.ResultLimit,
    selectorMode: 'stack',
};
SemanticSearch.childContextTypes = tslib_1.__assign({}, components_1.Component.childContextTypes, SemanticSearchApi_1.InitialQueryContextTypes, SemanticSearchApi_1.ResultContextTypes, SemanticSearchApi_1.FacetContextTypes);
exports.SemanticSearch = SemanticSearch;
exports.default = SemanticSearch;
