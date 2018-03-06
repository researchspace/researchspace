Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var h = require('history');
var React = require("react");
var _ = require("lodash");
var Kefir = require("kefir");
var uri = require("urijs");
var Maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var namespace_1 = require("platform/api/services/namespace");
var config_holder_1 = require("platform/api/services/config-holder");
var overlay_1 = require("platform/components/ui/overlay");
var NavigationConfirmationDialog_1 = require("./components/NavigationConfirmationDialog");
var BrowserPersistence_1 = require("platform/components/utils/BrowserPersistence");
var listeners = [];
var currentLocation;
var currentResource;
var history = h.createBrowserHistory();
history.listen(function (location, action) {
    return init(location).onValue(function (mUrl) { return mUrl.map(function (url) { return notifyAll({ url: url, action: action }); }); });
});
var BH_RECENT_PAGES = 'recentPages';
var MAX_BH_RECENT_QUERIES = 12;
var recentPages = BrowserPersistence_1.BrowserPersistence.getItem(BH_RECENT_PAGES);
if (!recentPages || recentPages.toArray().length === 0) {
    recentPages = [];
}
else {
    recentPages = recentPages.toArray();
}
exports.MemoryHistory = h.createMemoryHistory({
    initialEntries: recentPages,
    initialIndex: 0,
});
exports.MemoryHistory.listen(function (location, action) {
    return init(location).onValue(function (mUrl) { return mUrl.map(function (url) { return notifyAll({ url: url, action: action }); }); });
});
function listen(cb) {
    var index = listeners.push(cb) - 1;
    return function () { _.pullAt(listeners, index); };
}
exports.listen = listen;
function navigationConfirmation(message) {
    return listen({
        eventType: 'BEFORE_NAVIGATE',
        callback: function (event, navigate) {
            showNavigationConfirmationDialog(message, navigate);
        }
    });
}
exports.navigationConfirmation = navigationConfirmation;
function getCurrentResource() {
    return currentResource;
}
exports.getCurrentResource = getCurrentResource;
function getCurrentRepository() {
    return currentLocation.search(true)['repository'] || 'default';
}
exports.getCurrentRepository = getCurrentRepository;
function __unsafe__setCurrentResource(resource) {
    currentResource = resource;
}
exports.__unsafe__setCurrentResource = __unsafe__setCurrentResource;
function getCurrentUrl() {
    return currentLocation;
}
exports.getCurrentUrl = getCurrentUrl;
function navigateToResource(iri, props, repository) {
    return constructUrlForResource(iri, props, repository).flatMap(navigateToUrl).toProperty();
}
exports.navigateToResource = navigateToResource;
var START_PAGE = uri('/');
function navigateToUrl(url) {
    return confirmAll(url).filter(function (c) { return c; }).map(function () {
        if (url.equals(START_PAGE)) {
            var homePage = sparql_1.SparqlUtil.resolveIris([config_holder_1.ConfigHolder.getGlobalConfig().homePage.value])[0];
            navigateToResource(homePage).onValue(function () { });
        }
        else {
            var newUrl_1 = url.toString();
            history.push(newUrl_1);
            var memoryEntries = exports.MemoryHistory.entries.map(function (entry) { return entry.pathname + entry.search; });
            if (memoryEntries.find(function (entry) { return entry === newUrl_1; }) === undefined) {
                exports.MemoryHistory.push(newUrl_1);
            }
            else {
                exports.MemoryHistory.entries.push(exports.MemoryHistory.entries.splice(exports.MemoryHistory.entries.findIndex(function (entry) { return entry.pathname + entry.search === newUrl_1; }), 1)[0]);
            }
            persistRecentPages(exports.MemoryHistory.entries);
        }
    });
}
exports.navigateToUrl = navigateToUrl;
function refresh() {
    notifyAll({ url: currentLocation, action: 'REFRESH' });
}
exports.refresh = refresh;
function constructUrlForResource(iri, props, repository) {
    if (props === void 0) { props = {}; }
    if (repository === void 0) { repository = 'default'; }
    return namespace_1.getPrefixedUri(iri)
        .map(function (mUri) {
        var baseQuery = repository === 'default' ? {} : { repository: repository };
        var resourceUrl = config_holder_1.ConfigHolder.getEnvironmentConfig().resourceUrlMapping.value;
        if (mUri.isJust) {
            var url = uri("" + resourceUrl + mUri.get());
            url.setQuery(tslib_1.__assign({}, baseQuery, props));
            return url;
        }
        else {
            var url = uri("" + resourceUrl);
            url.setQuery(tslib_1.__assign({}, baseQuery, props, { uri: iri.value }));
            return url;
        }
    });
}
exports.constructUrlForResource = constructUrlForResource;
function init(location) {
    if (location === void 0) { location = history.location; }
    currentLocation = uri({
        path: location.pathname,
        query: location.search,
        fragment: location.hash,
    });
    return resolveResourceIri(currentLocation).map(function (maybeIri) {
        return maybeIri.map(function (iri) { return currentResource = iri; }).map(function (_) { return currentLocation; });
    });
}
exports.init = init;
function showNavigationConfirmationDialog(message, navigate) {
    var dialogRef = 'navigation-confirmation';
    var onHide = function () { return overlay_1.getOverlaySystem().hide(dialogRef); };
    overlay_1.getOverlaySystem().show(dialogRef, React.createElement(NavigationConfirmationDialog_1.NavigationConfirmationDialog, {
        onHide: onHide,
        message: message,
        onConfirm: function (b) { onHide(); navigate(b); },
    }));
}
function notifyAll(event) {
    listeners.forEach(function (listener) {
        if (isNavigationListener(listener)) {
            listener.callback(event);
        }
    });
}
function confirmAll(url) {
    var responsess = listeners.map(function (listener) {
        if (isBeforeNavigationListener(listener)) {
            return Kefir.fromCallback(function (cb) { return listener.callback({ action: 'BEFORE_NAVIGATE', url: url }, cb); }).toProperty();
        }
        else {
            return Kefir.constant(true);
        }
    });
    return Kefir.combine(responsess).map(_.every).toProperty();
}
function isNavigationListener(listener) {
    return listener.eventType === 'NAVIGATED';
}
function isBeforeNavigationListener(listener) {
    return listener.eventType === 'BEFORE_NAVIGATE';
}
function resolveResourceIri(url) {
    if (url.hasSearch('uri')) {
        var iriStr = url.search(true)['uri'];
        return Kefir.constant(Maybe.Just(rdf_1.Rdf.iri(iriStr)));
    }
    else {
        var prefixedIriStr = url.filename();
        var test_1 = namespace_1.getFullIri(prefixedIriStr);
        return test_1;
    }
}
exports.resolveResourceIri = resolveResourceIri;
function persistRecentPages(locations) {
    var recentPages = locations.map(function (location) { return location.pathname + location.search; });
    if (recentPages.length > MAX_BH_RECENT_QUERIES) {
        recentPages.pop();
    }
    BrowserPersistence_1.BrowserPersistence.setItem(BH_RECENT_PAGES, recentPages);
}
function resetMemoryHistory() {
    exports.MemoryHistory.entries = [];
}
exports.resetMemoryHistory = resetMemoryHistory;
