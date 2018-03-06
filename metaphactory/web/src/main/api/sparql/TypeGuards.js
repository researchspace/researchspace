Object.defineProperty(exports, "__esModule", { value: true });
function isQuery(node) {
    return typeof node === 'object' && node.type === 'query';
}
exports.isQuery = isQuery;
function isSelectQuery(query) {
    return query.queryType === 'SELECT';
}
exports.isSelectQuery = isSelectQuery;
function isConstructQuery(query) {
    return query.queryType === 'CONSTRUCT';
}
exports.isConstructQuery = isConstructQuery;
function isAskQuery(query) {
    return query.queryType === 'ASK';
}
exports.isAskQuery = isAskQuery;
function isDescribeQuery(query) {
    return query.queryType === 'DESCRIBE';
}
exports.isDescribeQuery = isDescribeQuery;
function isStarProjection(variables) {
    return Array.isArray(variables) && variables.length === 1 && variables[0] === '*';
}
exports.isStarProjection = isStarProjection;
function isPattern(node) {
    if (typeof node === 'object') {
        switch (node.type) {
            case 'bgp':
            case 'optional':
            case 'union':
            case 'group':
            case 'minus':
            case 'graph':
            case 'service':
            case 'filter':
            case 'values':
                return true;
        }
    }
    return false;
}
exports.isPattern = isPattern;
function isGroupPattern(pattern) {
    return pattern.type === 'group';
}
exports.isGroupPattern = isGroupPattern;
function isBlockPattern(pattern) {
    switch (pattern.type) {
        case 'optional':
        case 'union':
        case 'group':
        case 'minus':
        case 'graph':
        case 'service':
            return true;
        default:
            return false;
    }
}
exports.isBlockPattern = isBlockPattern;
function isExpression(node) {
    if (typeof node === 'string') {
        return true;
    }
    else if (Array.isArray(node)) {
        return true;
    }
    else if (typeof node === 'object') {
        switch (node.type) {
            case 'operation':
            case 'functionCall':
            case 'aggregate':
            case 'bgp':
            case 'group':
                return true;
        }
    }
    return false;
}
exports.isExpression = isExpression;
function isQuads(node) {
    return (node.type === 'bgp' || node.type === 'graph') && 'triples' in node;
}
exports.isQuads = isQuads;
function isTerm(node) {
    return typeof node === 'string';
}
exports.isTerm = isTerm;
function isVariable(term) {
    return typeof term === 'string' && term.length > 0 && (term[0] === '?' || term[0] === '$');
}
exports.isVariable = isVariable;
function isLiteral(term) {
    return typeof term === 'string' && term.length > 0 && term[0] === '"';
}
exports.isLiteral = isLiteral;
function isBlank(term) {
    return typeof term === 'string' && term.length > 1 && term[0] === '_';
}
exports.isBlank = isBlank;
function isIri(term) {
    if (typeof term !== 'string' || term.length === 0) {
        return false;
    }
    var first = term[0];
    return first !== '?' && first !== '$' && first !== '"' && first !== '_';
}
exports.isIri = isIri;
function isUpdateOperation(update) {
    return isInsertDeleteOperation(update) || isManagementOperation(update);
}
exports.isUpdateOperation = isUpdateOperation;
function isInsertDeleteOperation(update) {
    if (typeof update !== 'object') {
        return false;
    }
    var updateType = update.updateType;
    return updateType && (updateType === 'insert' ||
        updateType === 'delete' ||
        updateType === 'deletewhere' ||
        updateType === 'insertdelete');
}
exports.isInsertDeleteOperation = isInsertDeleteOperation;
function isManagementOperation(update) {
    if (typeof update !== 'object') {
        return false;
    }
    var type = update.type;
    return type && (type === 'load' ||
        type === 'copy' ||
        type === 'move' ||
        type === 'add');
}
exports.isManagementOperation = isManagementOperation;
