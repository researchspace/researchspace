function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var SparqlClient = require("./SparqlClient");
exports.SparqlClient = SparqlClient;
var SparqlTypeGuards = require("./TypeGuards");
exports.SparqlTypeGuards = SparqlTypeGuards;
var SparqlUtil = require("./SparqlUtil");
exports.SparqlUtil = SparqlUtil;
__export(require("./QueryVisitor"));
__export(require("./QueryBinder"));
