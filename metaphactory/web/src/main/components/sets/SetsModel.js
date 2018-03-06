Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Immutable = require("immutable");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var config_holder_1 = require("platform/api/services/config-holder");
var Defaults = require("./Defaults");
var EditType;
(function (EditType) {
    EditType[EditType["Create"] = 1] = "Create";
    EditType[EditType["Rename"] = 2] = "Rename";
    EditType[EditType["ApplyingChanges"] = 3] = "ApplyingChanges";
})(EditType = exports.EditType || (exports.EditType = {}));
var FilterValue;
(function (FilterValue) {
    function value(fv) { return fv.binding['value']; }
    FilterValue.value = value;
    function label(fv) {
        var label = fv.binding['label'];
        return label && label.value;
    }
    FilterValue.label = label;
})(FilterValue = exports.FilterValue || (exports.FilterValue = {}));
var SetItemsBindings;
(function (SetItemsBindings) {
    SetItemsBindings.RootSet = '__rootSet__';
    SetItemsBindings.IsSearch = '__isSearch__';
    SetItemsBindings.SetToSearch = '__setToSearch__';
    SetItemsBindings.FilterPatterns = '__filterPatterns__';
    SetItemsBindings.PreferredLabel = '__preferredLabel__';
})(SetItemsBindings || (SetItemsBindings = {}));
var SetItemsMetadataBindings;
(function (SetItemsMetadataBindings) {
    SetItemsMetadataBindings.Item = 'item';
    SetItemsMetadataBindings.Kind = 'kind';
})(SetItemsMetadataBindings || (SetItemsMetadataBindings = {}));
var SetCountBindings;
(function (SetCountBindings) {
    SetCountBindings.RootSet = '__rootSet__';
})(SetCountBindings || (SetCountBindings = {}));
var FilterBindings;
(function (FilterBindings) {
    FilterBindings.SelectedValue = '__value__';
    FilterBindings.InputText = /\?__token__/;
})(FilterBindings || (FilterBindings = {}));
function searchForSetsAndItems(params) {
    var setItemsQuery = params.setItemsQuery, setItemsMetadataQuery = params.setItemsMetadataQuery, setCountQuery = params.setCountQuery, context = params.context, rootSet = params.rootSet, isSet = params.isSet, setToSearch = params.setToSearch, filterPatterns = params.filterPatterns;
    var hasFilterPatterns = filterPatterns && filterPatterns.length > 0;
    return Kefir.combine([
        querySetItems(setItemsQuery, context, rootSet, setToSearch, filterPatterns),
        hasFilterPatterns
            ? Kefir.constant(new Map())
            : loadSetItemCounts(setCountQuery, context, rootSet),
    ], function (itemsResult, counts) {
        var sets = parseSets(itemsResult, isSet, counts);
        var items = parseSetItems(itemsResult, function (kind) { return !isSet(kind); });
        var allItems = items.reduce(function (all, setItems) { return all.concat(setItems); }, []);
        var unlistedSets = items.map(function (setItems, setIri) { return ({ iri: rdf_1.Rdf.iri(setIri), kind: Defaults.SetKind }); });
        var metadataItems = allItems.concat(sets.toArray(), unlistedSets.toArray());
        return queryMetadata(setItemsMetadataQuery, context, metadataItems)
            .map(function (metadata) { return combineItemsIntoSets(sets, items, metadata); });
    }).flatMap(function (sets) { return sets; }).toProperty();
}
exports.searchForSetsAndItems = searchForSetsAndItems;
function querySetItems(setItemsQuery, context, rootSet, setToSearch, filterPatterns) {
    try {
        var parsedQuery = sparql_1.SparqlUtil.parseQuery(setItemsQuery);
        var hasFilterPatterns = Boolean(filterPatterns && filterPatterns.length > 0);
        new sparql_1.PatternBinder(SetItemsBindings.FilterPatterns, hasFilterPatterns ? filterPatterns : []).sparqlQuery(parsedQuery);
        var preferredLabels = config_holder_1.ConfigHolder.getUIConfig().preferredLabels.value;
        new sparql_1.PropertyPathBinder((_a = {}, _a[SetItemsBindings.PreferredLabel] = {
            type: 'path',
            pathType: '|',
            items: preferredLabels.map(function (iri) { return rdf_1.Rdf.fullIri(iri).value; }),
        }, _a)).sparqlQuery(parsedQuery);
        var parametrizedQuery = sparql_1.SparqlClient.setBindings(parsedQuery, (_b = {},
            _b[SetItemsBindings.RootSet] = rootSet,
            _b[SetItemsBindings.IsSearch] = rdf_1.Rdf.literal(hasFilterPatterns),
            _b[SetItemsBindings.SetToSearch] = setToSearch,
            _b));
        return sparql_1.SparqlClient.select(parametrizedQuery, { context: context });
    }
    catch (e) {
        console.error(e);
        return Kefir.constantError(e);
    }
    var _a, _b;
}
function parseSets(result, isSet, itemCounts) {
    var sets = Immutable.OrderedMap().asMutable();
    for (var _i = 0, _a = result.results.bindings; _i < _a.length; _i++) {
        var _b = _a[_i], item = _b.item, kind = _b.kind;
        if (!(item && item.isIri())) {
            continue;
        }
        if (!isSet(kind)) {
            continue;
        }
        var itemCount = itemCounts.get(item.value);
        sets.set(item.value, { iri: item, kind: kind, itemCount: itemCount, metadata: {} });
    }
    return sets.asImmutable();
}
function loadSetItemCounts(setCountQuery, context, rootSet) {
    var parsedQuery = sparql_1.SparqlUtil.parseQuery(setCountQuery);
    var parametrizedQuery = sparql_1.SparqlClient.setBindings(parsedQuery, (_a = {},
        _a[SetCountBindings.RootSet] = rootSet,
        _a));
    return sparql_1.SparqlClient.select(parametrizedQuery, { context: context }).map(function (_a) {
        var results = _a.results;
        var counts = new Map();
        for (var _i = 0, _b = results.bindings; _i < _b.length; _i++) {
            var _c = _b[_i], set = _c.set, count = _c.count;
            if (!(set && set.isIri() && count && count.isLiteral())) {
                continue;
            }
            var itemCount = Number(count.value);
            if (!isNaN(itemCount)) {
                counts.set(set.value, itemCount);
            }
        }
        return counts;
    });
    var _a;
}
function fetchSetItems(setItemsQuery, setItemsMetadataQuery, context, rootSet, isItem, setToSearch, filterPatterns) {
    return querySetItems(setItemsQuery, context, rootSet, setToSearch, filterPatterns)
        .map(function (result) { return parseSetItems(result, isItem); })
        .flatMap(function (sets) {
        return queryMetadata(setItemsMetadataQuery, context, sets.reduce(function (all, items) { return all.concat(items); }, [])).map(function (metadata) {
            var setsWithMetadata = new Map();
            sets.forEach(function (items, setIri) {
                setsWithMetadata.set(setIri, mergeMetadata(items, metadata));
            });
            return setsWithMetadata;
        });
    });
}
exports.fetchSetItems = fetchSetItems;
function parseSetItems(result, isItem) {
    var setItems = Immutable.OrderedMap().asMutable();
    for (var _i = 0, _a = result.results.bindings; _i < _a.length; _i++) {
        var binding = _a[_i];
        var item = binding.item, kind = binding.kind, parent_1 = binding.parent, itemHolder = binding.itemHolder;
        if (!(item && item.isIri())) {
            continue;
        }
        if (!(itemHolder && itemHolder.isIri())) {
            continue;
        }
        if (!(parent_1 && parent_1.isIri())) {
            continue;
        }
        if (!isItem(kind)) {
            continue;
        }
        var clipboardItem = { iri: item, itemHolder: itemHolder, kind: kind, metadata: {} };
        var parentItems = setItems.get(parent_1.value) || Immutable.OrderedMap();
        setItems.set(parent_1.value, parentItems.set(item.value, clipboardItem));
    }
    return setItems.asImmutable().map(function (items) { return items.toArray(); }).toOrderedMap();
}
function combineItemsIntoSets(sets, items, metadata) {
    return Immutable.OrderedMap().withMutations(function (result) {
        sets.forEach(function (set) {
            var setItems = items.get(set.iri.value);
            result.set(set.iri.value, setItems
                ? tslib_1.__assign({}, set, { items: mergeMetadata(setItems, metadata) }) : set);
        });
        items.forEach(function (setItems, setIri) {
            if (sets.has(setIri)) {
                return;
            }
            result.set(setIri, {
                iri: rdf_1.Rdf.iri(setIri),
                kind: Defaults.SetKind,
                items: mergeMetadata(setItems, metadata),
                itemCount: setItems.length,
                metadata: metadata.get(setIri) || {},
            });
        });
    });
}
function queryMetadata(setItemsMetadataQuery, context, items) {
    var iris = new Set();
    var isItemUnique = function (_a) {
        var iri = _a.iri;
        if (iris.has(iri.value)) {
            return false;
        }
        iris.add(iri.value);
        return true;
    };
    var requested = items
        .filter(isItemUnique)
        .map(function (_a) {
        var iri = _a.iri, kind = _a.kind;
        return (_b = {},
            _b[SetItemsMetadataBindings.Item] = iri,
            _b[SetItemsMetadataBindings.Kind] = kind,
            _b);
        var _b;
    });
    if (requested.length === 0) {
        return Kefir.constant(new Map());
    }
    return sparql_1.SparqlClient.prepareQuery(setItemsMetadataQuery, requested)
        .flatMap(function (query) { return sparql_1.SparqlClient.select(query, { context: context }); })
        .map(function (_a) {
        var results = _a.results;
        var metadata = new Map();
        for (var _i = 0, _b = results.bindings; _i < _b.length; _i++) {
            var datum = _b[_i];
            var item = datum.item;
            if (!(item && item.isIri())) {
                continue;
            }
            metadata.set(item.value, datum);
        }
        return metadata;
    }).toProperty();
}
function mergeMetadata(items, metadata) {
    return items.map(function (item) { return (tslib_1.__assign({}, item, { metadata: metadata.get(item.iri.value) || {} })); });
}
function createFilterPatterns(params) {
    var patterns = [];
    var parsedQuery = sparql_1.SparqlUtil.parseQuery(params.setItemsQuery);
    if (params.searchPattern && params.searchText) {
        var parsedPatterns = sparql_1.SparqlUtil.parsePatterns(params.searchPattern, parsedQuery.prefixes);
        var binder_1 = new sparql_1.TextBinder([{ test: FilterBindings.InputText, replace: params.searchText }]);
        parsedPatterns.forEach(function (p) { return binder_1.pattern(p); });
        patterns.push.apply(patterns, parsedPatterns);
    }
    if (params.filterValues) {
        var patternGroups = params.filterValues.map(function (fv) {
            var filterPattern = fv.filter.queryPattern;
            var parsedPatterns = sparql_1.SparqlUtil.parsePatterns(filterPattern, parsedQuery.prefixes);
            var binder = new sparql_1.VariableBinder((_a = {}, _a[FilterBindings.SelectedValue] = FilterValue.value(fv), _a));
            parsedPatterns.forEach(function (p) { return binder.pattern(p); });
            return { type: 'group', patterns: parsedPatterns };
            var _a;
        });
        patterns.push({
            type: 'union',
            patterns: patternGroups.toArray(),
        });
    }
    return patterns;
}
exports.createFilterPatterns = createFilterPatterns;
