Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
function configHasDock(config) {
    return lodash_1.has(config, 'dock') && config.dock === true;
}
exports.configHasDock = configHasDock;
