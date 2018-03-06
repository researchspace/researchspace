Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var immutable_1 = require("immutable");
var Kefir = require("kefir");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var classnames = require("classnames");
var async_1 = require("platform/api/async");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var LabelsService = require("platform/api/services/resource-label");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var inputs_1 = require("platform/components/ui/inputs");
var spinner_1 = require("platform/components/ui/spinner");
var dnd_1 = require("platform/components/dnd");
var TreeSelection_1 = require("./TreeSelection");
var SelectionMode_1 = require("./SelectionMode");
var NodeModel_1 = require("./NodeModel");
var styles = require("./SemanticTreeInput.scss");
var ITEMS_LIMIT = 200;
var MIN_SEARCH_TERM_LENGTH = 3;
var SEARCH_DELAY_MS = 300;
var SemanticTreeInput = (function (_super) {
    tslib_1.__extends(SemanticTreeInput, _super);
    function SemanticTreeInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.search = _this.cancellation.cache(function (text, cancellation) {
            var parametrized = sparql_1.SparqlClient.setBindings(_this.state.searchQuery, { '__token__': sparql_1.SparqlUtil.makeLuceneQuery(text) });
            return Kefir.later(SEARCH_DELAY_MS, {})
                .flatMap(function () { return sparql_1.SparqlClient.select(parametrized); })
                .flatMap(function (result) {
                return _this.restoreTreeFromLeafNodes(result.results.bindings, cancellation)
                    .map(function (forest) { return ({
                    forest: forest,
                    matchedCount: result.results.bindings.length,
                    matchLimit: parametrized.limit,
                }); });
            });
        });
        _this.setInitialSelection = function () {
            var initialSelection = _this.props.initialSelection;
            if (!initialSelection || initialSelection.length === 0) {
                return;
            }
            _this.cancellation.map(LabelsService.getLabels(initialSelection)).flatMap(function (labels) {
                var bindings = initialSelection.map(function (iri) { return ({
                    item: iri,
                    label: labels.has(iri) ? rdf_1.Rdf.literal(labels.get(iri)) : undefined,
                    hasChildren: rdf_1.Rdf.literal(true),
                }); });
                return _this.restoreTreeFromLeafNodes(bindings, _this.cancellation);
            }).observe({
                value: function (forest) {
                    var confirmedSelection = forest;
                    _this.setState({ confirmedSelection: confirmedSelection });
                },
                error: function (error) { return console.error('Failed to restore initial tree selection', error); },
            });
        };
        _this.state = {
            mode: { type: 'collapsed' },
            forest: NodeModel_1.EmptyForest.setRoot({
                iri: undefined,
                children: immutable_1.List(),
                hasMoreItems: true,
            }),
            confirmedSelection: TreeSelection_1.TreeSelection.empty(NodeModel_1.EmptyForest.keyOf),
        };
        return _this;
    }
    SemanticTreeInput.prototype.componentDidMount = function () {
        this.load(this.props, this.setInitialSelection);
    };
    SemanticTreeInput.prototype.componentWillReceiveProps = function (nextProps) {
        this.load(nextProps);
    };
    SemanticTreeInput.prototype.load = function (props, cb) {
        this.setState({
            rootsQuery: sparql_1.SparqlUtil.parseQuerySync(props.rootsQuery),
            childrenQuery: sparql_1.SparqlUtil.parseQuerySync(props.childrenQuery),
            parentsQuery: sparql_1.SparqlUtil.parseQuerySync(props.parentsQuery),
            searchQuery: sparql_1.SparqlUtil.parseQuerySync(props.searchQuery),
        }, cb);
    };
    SemanticTreeInput.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticTreeInput.prototype.render = function () {
        var _this = this;
        var queriesLoaded = this.state.rootsQuery &&
            this.state.childrenQuery &&
            this.state.parentsQuery &&
            this.state.searchQuery;
        if (this.state.loadError) {
            return react_1.DOM.div({ className: classnames(styles.holder, this.props.className) }, react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.loadError }));
        }
        else if (queriesLoaded) {
            var result = react_1.DOM.div({
                ref: function (holder) { return _this.overlayHolder = holder; },
                className: classnames(styles.holder, this.props.className),
            }, react_1.DOM.div({ className: styles.inputAndButtons }, this.renderTextField(), this.renderBrowseButton()), this.renderOverlay());
            if (this.props.droppable) {
                return react_1.createElement(dnd_1.Droppable, {
                    query: this.props.droppable.query,
                    dropStyles: this.props.droppable.styles,
                    dropComponents: tslib_1.__assign({}, this.props.droppable.components, { rootStyle: { position: 'relative' } }),
                    onDrop: function (drop) {
                        _this.setValue(drop);
                    },
                }, result);
            }
            else {
                return result;
            }
        }
        else {
            return react_1.DOM.div({ className: styles.holder }, react_1.createElement(spinner_1.Spinner));
        }
    };
    SemanticTreeInput.prototype.setValue = function (iri) {
        var _this = this;
        this.cancellation.map(LabelsService.getLabel(iri)).onValue(function (label) {
            var newValue = TreeSelection_1.TreeSelection.empty(NodeModel_1.EmptyForest.keyOf).setRoot({
                iri: undefined,
                children: immutable_1.List([
                    { iri: iri, label: rdf_1.Rdf.literal(label) },
                ]),
            });
            _this.setState({
                mode: { type: 'collapsed' },
                searchText: undefined,
                searching: false,
                searchResult: undefined,
                confirmedSelection: newValue,
            }, function () {
                if (_this.props.onSelectionChanged) {
                    _this.props.onSelectionChanged(_this.state.confirmedSelection);
                }
            });
        });
    };
    SemanticTreeInput.prototype.renderTextField = function () {
        var _this = this;
        var textFieldProps = {
            ref: function (input) { return _this.textInput = input; },
            className: styles.textInput,
            inputClassName: styles.input,
            value: this.state.searchText || '',
            placeholder: this.props.placeholder,
            onFocus: function () { return _this.setState({
                searchInputFocused: true,
                mode: (_this.state.mode.type === 'collapsed' && _this.props.openDropdownOnFocus)
                    ? { type: 'full', selection: _this.state.confirmedSelection } : _this.state.mode,
            }); },
            onBlur: function () {
                _this.setState({ searchInputFocused: false });
                if (!_this.state.searchText && _this.props.openDropdownOnFocus) {
                    _this.closeDropdown({ saveSelection: false });
                }
            },
            onChange: function (e) { return _this.searchFor(e.currentTarget.value, false); },
            onKeyDown: function (e) {
                if (e.keyCode === 13 && _this.state.searchInputFocused) {
                    _this.searchFor(_this.state.searchText, true);
                }
            },
            onClear: function () {
                if (_this.state.searchInputFocused || _this.state.searchText) {
                    _this.closeDropdown({ saveSelection: false });
                }
            },
        };
        var selectedItems = TreeSelection_1.TreeSelection.leafs(this.state.confirmedSelection)
            .sortBy(function (item) { return item.label.value; });
        return react_1.createElement(inputs_1.ClearableInput, textFieldProps, selectedItems.map(function (item) {
            return react_1.createElement(inputs_1.RemovableBadge, {
                key: item.iri.value,
                onRemove: function () {
                    var previous = _this.state.confirmedSelection;
                    var newSelection = TreeSelection_1.TreeSelection.unselect(previous, previous.keyOf(item));
                    _this.setState({ confirmedSelection: newSelection }, function () {
                        if (_this.props.onSelectionChanged) {
                            _this.props.onSelectionChanged(newSelection);
                        }
                    });
                },
            }, item.label.value);
        }).toArray());
    };
    SemanticTreeInput.prototype.searchFor = function (text, force) {
        var _this = this;
        var hasEnoughSearchText = (this.props.allowForceSuggestion && force) || text.length >= MIN_SEARCH_TERM_LENGTH;
        if (hasEnoughSearchText) {
            this.setState({
                searchText: text,
                searchForce: force,
                searching: hasEnoughSearchText,
                mode: { type: 'search', selection: this.state.confirmedSelection },
            });
            this.search.compute(text, this.props.allowForceSuggestion && force)
                .onValue(function (searchResult) {
                _this.setState({ searchResult: searchResult, searching: false });
            }).onError(function (error) {
                _this.setState({ searchResult: { error: error }, searching: false });
            });
        }
        else {
            this.search.cancel();
            var mode = this.state.mode;
            if (text.length === 0 && !this.props.openDropdownOnFocus) {
                mode = { type: 'collapsed' };
            }
            else if (text.length > 0) {
                mode = { type: 'search', selection: this.state.confirmedSelection };
            }
            this.setState({
                mode: mode,
                searchText: text,
                searchForce: force,
            });
        }
    };
    SemanticTreeInput.prototype.renderBrowseButton = function () {
        var _this = this;
        return react_1.createElement(react_bootstrap_1.OverlayTrigger, {
            placement: 'bottom',
            overlay: react_1.createElement(react_bootstrap_1.Tooltip, {
                id: 'SemanticTreeInput__tooltip',
            }, 'Browse full hierarchy'),
        }, react_1.createElement(react_bootstrap_1.Button, {
            className: styles.browseButton,
            active: this.state.mode.type === 'full',
            onClick: function () {
                var modeType = _this.state.mode.type;
                if (modeType === 'collapsed' || modeType === 'search') {
                    _this.search.cancel();
                    _this.setState({
                        searchText: undefined,
                        searching: false,
                        searchResult: undefined,
                        mode: { type: 'full', selection: _this.state.confirmedSelection },
                    });
                }
                else if (modeType === 'full') {
                    _this.closeDropdown({ saveSelection: false });
                }
            },
        }, react_1.DOM.span((_a = {
                className: 'fa fa-sitemap fa-lg'
            },
            _a['aria-hidden'] = true,
            _a))));
        var _a;
    };
    SemanticTreeInput.prototype.closeDropdown = function (options) {
        this.search.cancel();
        this.setState(function (state, props) {
            var mode = state.mode;
            var newState = {
                mode: { type: 'collapsed' },
                searchText: undefined,
                searching: false,
                searchResult: undefined,
            };
            if (mode.type !== 'collapsed' && options.saveSelection) {
                newState.confirmedSelection = mode.selection;
                if (props.onSelectionChanged) {
                    props.onSelectionChanged(mode.selection);
                }
            }
            return newState;
        });
    };
    SemanticTreeInput.prototype.renderOverlay = function () {
        var _this = this;
        var mode = this.state.mode;
        return react_1.createElement(react_bootstrap_1.Overlay, {
            show: mode.type !== 'collapsed',
            placement: 'bottom',
            container: this.overlayHolder,
            target: function () { return react_dom_1.findDOMNode(_this.textInput); },
        }, react_1.createElement(OverlayProxy, {}, mode.type === 'collapsed'
            ? react_1.DOM.div({})
            : react_1.DOM.div({ className: styles.dropdown }, this.renderDropdownContent(mode), this.renderDropdownFooter(mode))));
    };
    SemanticTreeInput.prototype.updateForest = function (displayingSearch, update, callback) {
        this.setState(function (state, props) {
            if (displayingSearch) {
                return { searchResult: _.assign({}, state.searchResult, {
                        forest: update(state.searchResult.forest, state, props),
                    }) };
            }
            else {
                return { forest: update(state.forest, state, props) };
            }
        }, callback);
    };
    SemanticTreeInput.prototype.renderDropdownContent = function (mode) {
        if (mode.type === 'search') {
            if (this.state.searchText.length < MIN_SEARCH_TERM_LENGTH &&
                (!this.state.searchForce || !this.props.allowForceSuggestion)) {
                return react_1.DOM.span({ className: styles.searchMessage }, "Minimum length of search term is " + MIN_SEARCH_TERM_LENGTH + " characters.");
            }
            else if (this.state.searching) {
                return react_1.createElement(spinner_1.Spinner, { style: { margin: '10px 0;' } });
            }
            else if (this.state.searchResult.error) {
                return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.searchResult.error });
            }
        }
        return this.renderScrollableDropdownContent(mode);
    };
    SemanticTreeInput.prototype.renderScrollableDropdownContent = function (mode) {
        var limitMessage = null;
        var noResultsMessage = null;
        if (mode.type === 'search') {
            var _a = this.state.searchResult, matchedCount = _a.matchedCount, matchLimit = _a.matchLimit, forest = _a.forest;
            if (matchLimit && matchedCount === matchLimit) {
                limitMessage = react_1.DOM.span({ className: styles.searchMessage }, "Only first " + matchedCount + " matches are shown. Please refine your search.");
            }
            else if (forest.root.children.size === 0) {
                noResultsMessage = react_1.DOM.span({ className: styles.searchMessage }, "No results found.");
            }
        }
        return react_1.DOM.div({ className: styles.tree }, this.renderTree(mode), limitMessage, noResultsMessage);
    };
    SemanticTreeInput.prototype.renderDropdownFooter = function (mode) {
        var _this = this;
        var enableSelectionSave = mode.selection !== this.state.confirmedSelection;
        return react_1.DOM.div({ className: styles.dropdownFooter }, react_1.createElement(react_bootstrap_1.Button, {
            className: styles.dropdownButton,
            bsStyle: 'danger',
            onClick: function () { return _this.closeDropdown({ saveSelection: false }); },
        }, 'Cancel'), react_1.createElement(react_bootstrap_1.Button, {
            className: styles.dropdownButton,
            bsStyle: 'success',
            disabled: !enableSelectionSave,
            onClick: function () { return _this.closeDropdown({ saveSelection: true }); },
        }, 'Select'));
    };
    SemanticTreeInput.prototype.renderTree = function (mode) {
        var _this = this;
        var inSearchMode = mode.type === 'search';
        var renderedForest = inSearchMode ? this.state.searchResult.forest : this.state.forest;
        var searchTerm = (inSearchMode && this.state.searchText)
            ? this.state.searchText.toLowerCase() : undefined;
        return react_1.createElement(NodeModel_1.NodeTreeSelector, {
            forest: renderedForest,
            isLeaf: function (item) { return item.children
                ? (item.children.size === 0 && !item.hasMoreItems) : undefined; },
            childrenOf: function (_a) {
                var children = _a.children, loading = _a.loading, hasMoreItems = _a.hasMoreItems, error = _a.error;
                return ({
                    children: children, loading: loading, hasMoreItems: hasMoreItems && !error,
                });
            },
            renderItem: function (node) { return _this.renderItem(node, searchTerm); },
            requestMore: function (node) {
                var path = renderedForest.getOffsetPath(node);
                _this.requestChildren(path, inSearchMode);
            },
            selectionMode: this.props.multipleSelection
                ? SelectionMode_1.MultipleFullSubtrees() : SelectionMode_1.SingleFullSubtree(),
            selection: mode.selection,
            onSelectionChanged: function (selection) {
                _this.setState(function (state) {
                    if (state.mode.type === 'collapsed') {
                        return {};
                    }
                    return { mode: { type: state.mode.type, selection: selection } };
                });
            },
            isExpanded: function (node) { return node.expanded; },
            onExpandedOrCollapsed: function (item, expanded) {
                var path = renderedForest.getOffsetPath(item);
                _this.updateForest(inSearchMode, function (forest) {
                    return forest.updateNode(path, function (node) { return NodeModel_1.Node.set(node, { expanded: expanded }); });
                });
            },
        });
    };
    SemanticTreeInput.prototype.renderItem = function (node, highlightedTerm) {
        var text = node.label ? node.label.value : node.iri.value;
        var parts = [text];
        if (highlightedTerm) {
            var startIndex = text.toLowerCase().indexOf(highlightedTerm);
            if (startIndex >= 0) {
                var endIndex = startIndex + highlightedTerm.length;
                parts = [
                    text.substring(0, startIndex),
                    react_1.DOM.span({ className: styles.highlighted }, text.substring(startIndex, endIndex)),
                    text.substring(endIndex),
                ];
            }
        }
        return react_1.DOM.span.apply(react_1.DOM, [{
                title: node.iri.value,
                className: node.error ? styles.error : undefined,
            }].concat(parts));
    };
    SemanticTreeInput.prototype.requestChildren = function (path, isSearching) {
        var _this = this;
        var context = this.context.semanticContext;
        var changePromise;
        this.updateForest(isSearching, function (forest, state) {
            var _a = NodeModel_1.queryMoreChildren(forest, path, state.rootsQuery, state.childrenQuery, ITEMS_LIMIT, { context: context }), loadingForest = _a[0], forestChange = _a[1];
            changePromise = forestChange;
            return loadingForest;
        }, function () {
            var cancellation = isSearching ? _this.search.cancellation : _this.cancellation;
            cancellation.map(changePromise)
                .onValue(function (change) { return _this.updateForest(isSearching, change); });
        });
    };
    SemanticTreeInput.prototype.restoreTreeFromLeafNodes = function (searchResult, cancellation) {
        var leafs = immutable_1.List(searchResult).map(function (_a) {
            var item = _a.item, _b = _a.score, score = _b === void 0 ? rdf_1.Rdf.literal('0') : _b, label = _a.label, hasChildren = _a.hasChildren;
            if (!(item.isIri() && label.isLiteral())) {
                return undefined;
            }
            var certainlyLeaf = hasChildren.isLiteral() && hasChildren.value === 'false';
            return {
                iri: item,
                label: label,
                score: parseFloat(score.isLiteral() ? score.value : ''),
                children: immutable_1.List(),
                hasMoreItems: !certainlyLeaf,
            };
        }).filter(function (node) { return node !== undefined; });
        var context = this.context.semanticContext;
        return NodeModel_1.restoreForestFromLeafs(leafs, this.state.parentsQuery, cancellation, { context: context }).map(function (children) { return NodeModel_1.EmptyForest.setRoot({ iri: undefined, children: children }); });
    };
    return SemanticTreeInput;
}(components_1.Component));
exports.SemanticTreeInput = SemanticTreeInput;
var OverlayProxy = (function (_super) {
    tslib_1.__extends(OverlayProxy, _super);
    function OverlayProxy() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OverlayProxy.prototype.render = function () { return react_1.Children.only(this.props.children); };
    return OverlayProxy;
}(components_1.Component));
function leafsToCommaSeparatedValues(leafs) {
    return leafs.map(function (node) { return node.label ? node.label.value : ''; })
        .sort().join(', ');
}
exports.default = SemanticTreeInput;
