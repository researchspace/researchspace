Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
function partialValueEquals(x, y) {
    if (_.has(x, 'literal') && _.has(y, 'literal')) {
        return x.literal.equals(y.literal);
    }
    else if (_.has(x, 'iri') && _.has(y, 'iri')) {
        return x.iri.equals(y.iri);
    }
    else {
        return false;
    }
}
exports.partialValueEquals = partialValueEquals;
