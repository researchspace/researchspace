Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
exports.QUERY_PARAM_PREFIX = 'urlqueryparam';
function extractParams(props, paramPrefix) {
    if (paramPrefix === void 0) { paramPrefix = exports.QUERY_PARAM_PREFIX; }
    return _.transform(props, function (res, value, key) {
        if (_.startsWith(key, paramPrefix)) {
            var propName = _.camelCase(key.substr(paramPrefix.length));
            res[propName] = value;
        }
        return res;
    });
}
exports.extractParams = extractParams;
