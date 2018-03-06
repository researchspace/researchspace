var Kefir = require("kefir");
var superagent_1 = require("superagent");
var navigation_1 = require("platform/api/navigation");
var URLMinifierService;
(function (URLMinifierService) {
    var URL_MINIFIER_SERVICE_URL = '/rest/url-minify/getShort';
    function getShortKey(url) {
        var request = superagent_1.get(URL_MINIFIER_SERVICE_URL)
            .query({ url: url })
            .accept('text/plain');
        return Kefir.fromNodeCallback(function (cb) { return request.end(function (err, res) { return cb(err, res.text); }); }).toProperty();
    }
    URLMinifierService.getShortKey = getShortKey;
    function getShortURLForResource(iri) {
        return navigation_1.constructUrlForResource(iri)
            .map(function (url) { return url.absoluteTo(location.origin).valueOf(); })
            .flatMap(makeShortURL)
            .toProperty();
    }
    URLMinifierService.getShortURLForResource = getShortURLForResource;
    function makeShortURL(fullUrl) {
        return URLMinifierService.getShortKey(fullUrl)
            .map(function (key) { return location.origin + '/l/' + key; });
    }
    URLMinifierService.makeShortURL = makeShortURL;
})(URLMinifierService || (URLMinifierService = {}));
module.exports = URLMinifierService;
