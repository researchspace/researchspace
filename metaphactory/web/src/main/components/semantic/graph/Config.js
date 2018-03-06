Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
function configWithHidePredicates(config) {
    return lodash_1.has(config, 'hidePredicates');
}
exports.configWithHidePredicates = configWithHidePredicates;
function configWithShowPredicates(config) {
    return lodash_1.has(config, 'showPredicates');
}
exports.configWithShowPredicates = configWithShowPredicates;
