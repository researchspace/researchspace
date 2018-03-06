Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var Kefir = require("kefir");
var POST_INVALIDATE_ALL = '/rest/cache/all/invalidate';
function invalidateAllCaches() {
    return sendRequest(POST_INVALIDATE_ALL);
}
exports.invalidateAllCaches = invalidateAllCaches;
function invalidateCacheForResource(resource) {
    var url = POST_INVALIDATE_ALL + '/' + encodeURIComponent(resource.value);
    return sendRequest(url);
}
exports.invalidateCacheForResource = invalidateCacheForResource;
function sendRequest(url) {
    var req = request.post(url);
    return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.text); }); }).toProperty();
}
