Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var N3 = require("n3");
var sparql_1 = require("platform/api/sparql");
function collectStateErrors(state) {
    var errors = [];
    var collectError = function (value) {
        if (value.error) {
            errors.push(value.error);
        }
    };
    var values = [
        state.id, state.label, state.description, state.domain, state.xsdDatatype, state.range,
        state.min, state.max, state.testSubject, state.selectPattern, state.insertPattern,
        state.deletePattern, state.askPattern, state.valueSetPattern, state.autosuggestionPattern,
    ];
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var value = values_1[_i];
        value.map(collectError);
    }
    state.defaults.forEach(collectError);
    state.treePatterns.map(collectTreeConfigErrors);
    return errors;
}
exports.collectStateErrors = collectStateErrors;
function collectTreeConfigErrors(config) {
    var errors = [];
    var collectError = function (value) {
        if (value && value.error) {
            errors.push(value.error);
        }
    };
    if (config.type === 'simple') {
        collectError(config.schemePattern);
        collectError(config.relationPattern);
    }
    else {
        collectError(config.rootsQuery);
        collectError(config.childrenQuery);
        collectError(config.parentsQuery);
        collectError(config.searchQuery);
    }
    return errors;
}
exports.collectTreeConfigErrors = collectTreeConfigErrors;
function validateIri(v) {
    if (!N3.Util.isIRI(v)) {
        return {
            value: v,
            error: new Error('Identifier must be a valid full IRI string.'),
        };
    }
    return { value: v };
}
exports.validateIri = validateIri;
function validateLabel(v) {
    if (v.length < 5) {
        return {
            value: v,
            error: new Error('Label should be meaningful and have at least five characters.'),
        };
    }
    return { value: v };
}
exports.validateLabel = validateLabel;
function validateMin(v) {
    var num = Number(v);
    if (Number.isInteger(num) && num >= 0) {
        return { value: v };
    }
    else {
        return {
            value: v,
            error: new Error('Min. Cardinality must be >= 0'),
        };
    }
}
exports.validateMin = validateMin;
function validateMax(v) {
    var num = Number(v);
    if (v === 'unbound' || (Number.isInteger(num) && num >= 1)) {
        return { value: v };
    }
    else {
        return {
            value: v,
            error: new Error('Max. Cardinality must be >= 1 or unbound'),
        };
    }
}
exports.validateMax = validateMax;
function validateInsert(query) {
    var error = "Insert pattern must be a valid SPARQL UPDATE INSERT query "
        + "and must have a $subject and $value variable.";
    return validateQuery({ query: query, type: 'insertdelete', variables: ['subject', 'value'], error: error });
}
exports.validateInsert = validateInsert;
function validateDelete(query) {
    var error = "Delete pattern must be a valid SPARQL UPDATE DELETE query "
        + "and must have a $subject and $value variable.";
    return validateQuery({ query: query, type: 'insertdelete', variables: ['subject', 'value'], error: error });
}
exports.validateDelete = validateDelete;
function validateSelect(query) {
    return validateQuery({
        query: query,
        type: 'SELECT',
        variables: ['subject', 'value'],
        projection: ['value'],
        error: "Select pattern must be a valid SPARQL SELECT query, " +
            "must have a $subject and $value variable " +
            "and must expose a ?value projection variable.",
    });
}
exports.validateSelect = validateSelect;
function validateAsk(query) {
    var error = "Ask validation pattern must be a valid SPARQL ASK query.";
    return validateQuery({ query: query, type: 'ASK', error: error });
}
exports.validateAsk = validateAsk;
function validateValueSet(query) {
    var error = "Select valueset pattern must be a valid SPARQL SELECT query "
        + "and must expose a ?value projection variable.";
    return validateQuery({ query: query, type: 'SELECT', projection: ['value'], error: error });
}
exports.validateValueSet = validateValueSet;
function validateAutosuggestion(query) {
    var error = "Select autosuggestion pattern must be a valid SPARQL SELECT query "
        + "and must expose a ?value and ?label projection variable.";
    return validateQuery({ query: query, type: 'SELECT', projection: ['value', 'label'], error: error });
}
exports.validateAutosuggestion = validateAutosuggestion;
function validateTreeConfig(config) {
    if (config.type === 'simple') {
        var result = {
            type: 'simple',
            schemePattern: config.schemePattern ? validateQuery({
                patterns: config.schemePattern.value,
                variables: ['item'],
                error: 'Tree scheme pattern must be a valid SPARQL pattern '
                    + 'and must expose an ?item variable.',
            }) : undefined,
            relationPattern: config.relationPattern ? validateQuery({
                patterns: config.relationPattern.value,
                variables: ['item', 'parent'],
                error: 'Tree relation pattern must be a valid SPARQL pattern '
                    + 'and must expose an ?item and ?parent variables.'
            }) : undefined,
        };
        return result;
    }
    else {
        var result = {
            type: 'full',
            rootsQuery: validateQuery({
                query: config.rootsQuery ? config.rootsQuery.value : undefined,
                type: 'SELECT',
                projection: ['item', 'label', 'hasChildren'],
                error: 'Tree roots pattern must be a valid SPARQL SELECT query '
                    + 'and must expose a ?item, ?label and ?hasChildren projection variables.',
            }),
            childrenQuery: validateQuery({
                query: config.childrenQuery ? config.childrenQuery.value : undefined,
                type: 'SELECT',
                variables: ['parent'],
                projection: ['item', 'label', 'hasChildren'],
                error: 'Tree children pattern must be a valid SPARQL SELECT query, '
                    + 'must have a ?parent variable '
                    + 'and must expose a ?item, ?label and ?hasChildren projection variables.',
            }),
            parentsQuery: validateQuery({
                query: config.parentsQuery ? config.parentsQuery.value : undefined,
                type: 'SELECT',
                projection: ['item', 'parent', 'parentLabel'],
                error: 'Tree parents pattern must be a valid SPARQL SELECT query '
                    + 'and must expose a ?item, ?parent and ?parentLabel projection variables.',
            }),
            searchQuery: validateQuery({
                query: config.searchQuery ? config.searchQuery.value : undefined,
                type: 'SELECT',
                projection: ['item', 'score', 'label', 'hasChildren'],
                error: 'Tree search pattern must be a valid SPARQL SELECT query '
                    + 'and must expose a ?item, ?score, ?label and ?hasChildren projection variables.',
            }),
        };
        return result;
    }
}
exports.validateTreeConfig = validateTreeConfig;
function validateQuery(params) {
    var query = params.query, patterns = params.patterns, type = params.type, _a = params.variables, variables = _a === void 0 ? [] : _a, _b = params.projection, projection = _b === void 0 ? [] : _b, error = params.error;
    if (typeof query !== 'string' && typeof patterns !== 'string') {
        return { value: '', error: new Error(error) };
    }
    var value;
    var queryInfo;
    try {
        if (query) {
            value = query;
            var parsedQuery = sparql_1.SparqlUtil.parseQuery(query);
            queryInfo = collectQueryInfo({ query: parsedQuery });
        }
        else if (patterns) {
            value = patterns;
            var parsedPatterns = sparql_1.SparqlUtil.parsePatterns(patterns);
            queryInfo = collectQueryInfo({ patterns: parsedPatterns });
        }
    }
    catch (e) {
        return { value: value, error: e };
    }
    var queryType = queryInfo.queryType, allVariables = queryInfo.allVariables, projectionVariables = queryInfo.projectionVariables;
    var hasCorrectType = !type || queryType === type;
    var projectionSet = new Set(projectionVariables);
    var hasEveryVariable = variables.every(function (v) { return allVariables.has(v); });
    var hasEveryProjection = projection.every(function (v) { return projectionSet.has(v); });
    if (hasCorrectType && hasEveryVariable && hasEveryProjection) {
        return { value: value };
    }
    else {
        return { value: value, error: new Error(error) };
    }
}
function collectQueryInfo(params) {
    var visitor = new ((function (_super) {
        tslib_1.__extends(class_1, _super);
        function class_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.allVariables = new Set();
            return _this;
        }
        class_1.prototype.variableTerm = function (variable) {
            var name = variable.substr(1);
            this.allVariables.add(name);
            return _super.prototype.variableTerm.call(this, variable);
        };
        class_1.prototype.query = function (query) {
            this.queryType = query.queryType;
            return _super.prototype.query.call(this, query);
        };
        class_1.prototype.insertDelete = function (operation) {
            this.queryType = operation.updateType;
            return _super.prototype.insertDelete.call(this, operation);
        };
        return class_1;
    }(sparql_1.QueryVisitor)));
    var query = params.query, patterns = params.patterns;
    var projectionVariables = [];
    if (query) {
        visitor.sparqlQuery(query);
        if (query.type === 'query'
            && query.queryType === 'SELECT'
            && !sparql_1.SparqlTypeGuards.isStarProjection(query.variables)) {
            projectionVariables = query.variables.map(function (v) { return sparql_1.SparqlTypeGuards.isTerm(v) ? v.substr(1) : v.variable.substr(1); });
        }
    }
    else if (patterns) {
        patterns.forEach(function (p) { return visitor.pattern(p); });
    }
    return {
        queryType: visitor.queryType,
        allVariables: visitor.allVariables,
        projectionVariables: projectionVariables,
    };
}
exports.collectQueryInfo = collectQueryInfo;
