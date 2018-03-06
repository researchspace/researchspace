Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var _ = require("lodash");
var TypeGuards_1 = require("./TypeGuards");
var QueryVisitor = (function () {
    function QueryVisitor() {
    }
    Object.defineProperty(QueryVisitor.prototype, "currentMember", {
        get: function () { return this.nodeMember; },
        enumerable: true,
        configurable: true
    });
    QueryVisitor.prototype.visitMember = function (node, member, visit) {
        this.nodeMember = member;
        var memberName = member;
        var result = visit.call(this, node[memberName]);
        if (result !== undefined) {
            node[memberName] = result;
        }
        return result;
    };
    QueryVisitor.prototype.sparqlQuery = function (sparqlQuery) {
        if (sparqlQuery.type === 'query') {
            return this.query(sparqlQuery);
        }
        else if (sparqlQuery.type === 'update') {
            return this.update(sparqlQuery);
        }
    };
    QueryVisitor.prototype.query = function (query) {
        if (query.queryType === 'SELECT') {
            var result = this.select(query);
            if (result === undefined) {
                return undefined;
            }
            else if (TypeGuards_1.isQuery(result)) {
                return result;
            }
            else {
                this.throwUnexpected(result, { expected: 'Query', transformed: 'SelectQuery' });
            }
        }
        else if (query.queryType === 'CONSTRUCT') {
            return this.construct(query);
        }
        else if (query.queryType === 'ASK') {
            return this.ask(query);
        }
        else if (query.queryType === 'DESCRIBE') {
            return this.describe(query);
        }
    };
    QueryVisitor.prototype.update = function (update) {
        this.walkArray('updates', update.updates, this.updateOperation);
        return undefined;
    };
    QueryVisitor.prototype.updateOperation = function (update) {
        if (TypeGuards_1.isInsertDeleteOperation(update)) {
            return this.insertDelete(update);
        }
        else if (TypeGuards_1.isManagementOperation(update)) {
            return this.managementOperation(update);
        }
        else {
            console.warn("Unknown UpdateOperation object " + JSON.stringify(update));
            return undefined;
        }
    };
    QueryVisitor.prototype.insertDelete = function (operation) {
        this.walkArray('insert', operation.insert, this.quads);
        this.walkArray('delete', operation.delete, this.quads);
        this.walkArray('where', operation.where, this.pattern);
        return undefined;
    };
    QueryVisitor.prototype.managementOperation = function (operation) {
        return undefined;
    };
    QueryVisitor.prototype.valuesRows = function (rows) {
        var _this = this;
        var transforms = this.walkValuesVariables(rows);
        rows.forEach(function (row) {
            for (var variable in row) {
                if (row.hasOwnProperty(variable)) {
                    var resultVariable = variable;
                    var transformedVariable = transforms.get(variable);
                    if (transformedVariable !== undefined) {
                        row[transformedVariable] = row[variable];
                        delete row[variable];
                        resultVariable = transformedVariable;
                    }
                    var value = row[resultVariable];
                    var valueResult = _this.term(value);
                    if (valueResult !== undefined) {
                        row[resultVariable] = _this.coerce(valueResult, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'VALUES row value' });
                    }
                }
            }
        });
        return undefined;
    };
    QueryVisitor.prototype.walkValuesVariables = function (rows) {
        var _this = this;
        var variables = Immutable.List(rows).reduce(function (vars, row) {
            for (var variable in row) {
                if (!row.hasOwnProperty(variable)) {
                    continue;
                }
                vars = vars.add(variable);
            }
            return vars;
        }, Immutable.Set());
        return variables.reduce(function (transforms, variable) {
            var result = _this.variableTerm(variable);
            if (result === undefined) {
                return transforms;
            }
            else if (TypeGuards_1.isVariable(result)) {
                return transforms.set(variable, result);
            }
            else {
                _this.throwUnexpected(result, { expected: '?variable', transformed: 'variable Term' });
            }
        }, Immutable.Map());
    };
    QueryVisitor.prototype.select = function (select) {
        var _this = this;
        this.walkBaseQuery(select);
        this.walkProjectionVariables(select.variables);
        if (select.from) {
            var walkOnlyIri = function (iri) { return _this.coerce(_this.iri(iri), function (term) { return TypeGuards_1.isIri(term) && term; }, { expected: '<iri>', transformed: 'IRI Term' }); };
            this.walkArray('from.default', select.from.default, walkOnlyIri);
            this.walkArray('from.named', select.from.named, walkOnlyIri);
        }
        this.walkArray('group', select.group, this.grouping);
        this.walkArray('having', select.having, this.expression);
        this.walkArray('order', select.order, this.ordering);
        return undefined;
    };
    QueryVisitor.prototype.grouping = function (grouping) {
        this.visitMember(grouping, 'expression', this.expression);
        return undefined;
    };
    QueryVisitor.prototype.ordering = function (ordering) {
        this.visitMember(ordering, 'expression', this.expression);
        return undefined;
    };
    QueryVisitor.prototype.construct = function (construct) {
        this.walkBaseQuery(construct);
        this.walkArray('template', construct.template, this.triple);
        return undefined;
    };
    QueryVisitor.prototype.ask = function (ask) {
        this.walkBaseQuery(ask);
        return undefined;
    };
    QueryVisitor.prototype.describe = function (describe) {
        this.walkBaseQuery(describe);
        this.walkProjectionVariables(describe.variables);
        return undefined;
    };
    QueryVisitor.prototype.pattern = function (pattern) {
        if (pattern.type === 'bgp') {
            return this.coerce(this.bgp(pattern), function (bgp) { return TypeGuards_1.isPattern(bgp) && bgp; }, { expected: 'Pattern', transformed: 'BgpPattern' });
        }
        else if (TypeGuards_1.isBlockPattern(pattern)) {
            return this.block(pattern);
        }
        else if (pattern.type === 'filter') {
            return this.filter(pattern);
        }
        else if (pattern.type === 'bind') {
            return this.bind(pattern);
        }
        else if (pattern.type === 'values') {
            return this.valuesPattern(pattern);
        }
        else if (TypeGuards_1.isQuery(pattern)) {
            var queryType = pattern.queryType;
            if (queryType !== 'SELECT') {
                throw new Error("Invalid query Pattern: unexpected " + queryType + " query");
            }
            return this.coerce(this.select(pattern), function (p) { return TypeGuards_1.isPattern(p) && p; }, { expected: 'Pattern', transformed: 'SelectQuery' });
        }
        else {
            console.warn("Unknown pattern '" + JSON.stringify(pattern) + "'");
            return undefined;
        }
    };
    QueryVisitor.prototype.quads = function (quads) {
        if (quads.type === 'bgp') {
            return this.coerce(this.bgp(quads), function (bgp) { return TypeGuards_1.isQuads(bgp) && bgp; }, { expected: 'Quads', transformed: 'SelectQuery' });
        }
        else if (quads.type === 'graph') {
            return this.graphQuads(quads);
        }
        else {
            console.warn("Unknown quads '" + JSON.stringify(quads) + "'");
            return undefined;
        }
    };
    QueryVisitor.prototype.bgp = function (bgp) {
        this.walkArray('triples', bgp.triples, this.triple);
        return undefined;
    };
    QueryVisitor.prototype.graphQuads = function (graphQuads) {
        var _this = this;
        this.visitMember(graphQuads, 'name', function (name) {
            var term = _this.term(name);
            return _this.coerce(term, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'GraphQuads' });
        });
        this.walkArray('triples', graphQuads.triples, this.triple);
        return undefined;
    };
    QueryVisitor.prototype.block = function (pattern) {
        if (pattern.type === 'graph') {
            return this.graph(pattern);
        }
        else if (pattern.type === 'service') {
            return this.service(pattern);
        }
        else {
            this.walkArray('patterns', pattern.patterns, this.pattern);
            return undefined;
        }
    };
    QueryVisitor.prototype.graph = function (graph) {
        var _this = this;
        this.visitMember(graph, 'name', function (name) {
            var term = _this.term(name);
            return _this.coerce(term, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'GraphPattern' });
        });
        this.walkArray('patterns', graph.patterns, this.pattern);
        return undefined;
    };
    QueryVisitor.prototype.service = function (service) {
        var _this = this;
        this.visitMember(service, 'name', function (name) {
            var term = _this.term(name);
            return _this.coerce(term, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'ServicePattern' });
        });
        this.walkArray('patterns', service.patterns, this.pattern);
        return undefined;
    };
    QueryVisitor.prototype.filter = function (pattern) {
        this.visitMember(pattern, 'expression', this.expression);
        return undefined;
    };
    QueryVisitor.prototype.bind = function (pattern) {
        var _this = this;
        this.visitMember(pattern, 'expression', this.expression);
        this.visitMember(pattern, 'variable', function (variable) {
            var variableTerm = _this.variableTerm(variable);
            return _this.coerce(variableTerm, function (v) { return TypeGuards_1.isVariable(v) && v; }, { expected: '?variable', transformed: 'variable Term' });
        });
        return undefined;
    };
    QueryVisitor.prototype.valuesPattern = function (pattern) {
        this.visitMember(pattern, 'values', this.valuesRows);
        return undefined;
    };
    QueryVisitor.prototype.expression = function (expression) {
        if (Array.isArray(expression)) {
            return this.tuple(expression);
        }
        else if (TypeGuards_1.isTerm(expression)) {
            return this.coerce(this.term(expression), function (expr) { return TypeGuards_1.isExpression(expr) && expr; }, { expected: 'Expression', transformed: 'term-like Expression' });
        }
        else if (expression.type === 'operation') {
            return this.operation(expression);
        }
        else if (expression.type === 'functionCall') {
            return this.functionCall(expression);
        }
        else if (expression.type === 'aggregate') {
            return this.aggregate(expression);
        }
        else if (TypeGuards_1.isPattern(expression)) {
            return this.walkPatternLikeExpression(expression);
        }
        else {
            console.warn("Unknown expression '" + JSON.stringify(expression) + "'");
            return undefined;
        }
    };
    QueryVisitor.prototype.walkPatternLikeExpression = function (expression) {
        var result = undefined;
        if (expression.type === 'bgp') {
            result = this.bgp(expression);
        }
        else if (expression.type === 'group') {
            result = this.block(expression);
        }
        else {
            console.warn("Unknown pattern-like Expression type '" + expression.type + "'");
        }
        return this.coerce(result, function (expr) { return TypeGuards_1.isExpression(expr) && expr; }, { expected: 'Expression', transformed: 'pattern-like Expression' });
    };
    QueryVisitor.prototype.operation = function (operation) {
        this.walkArray('args', operation.args, this.expression);
        return undefined;
    };
    QueryVisitor.prototype.functionCall = function (functionCall) {
        this.walkArray('args', functionCall.args, this.expression);
        return undefined;
    };
    QueryVisitor.prototype.aggregate = function (aggregate) {
        this.visitMember(aggregate, 'expression', this.expression);
        return undefined;
    };
    QueryVisitor.prototype.variable = function (variable) {
        var _this = this;
        if (TypeGuards_1.isTerm(variable)) {
            var variableTerm = this.variableTerm(variable);
            return this.coerce(variableTerm, function (v) { return TypeGuards_1.isVariable(v) && v; }, { expected: '?variable', transformed: 'variable Term' });
        }
        else {
            this.visitMember(variable, 'expression', this.expression);
            this.visitMember(variable, 'variable', function (variableName) {
                var variableTerm = _this.variableTerm(variableName);
                return _this.coerce(variableTerm, function (v) { return TypeGuards_1.isVariable(v) && v; }, { expected: '?variable', transformed: 'variable Term' });
            });
            return undefined;
        }
    };
    QueryVisitor.prototype.tuple = function (tuple) {
        this.walkArray(undefined, tuple, this.expression);
        return undefined;
    };
    QueryVisitor.prototype.triple = function (triple) {
        var _this = this;
        this.visitMember(triple, 'subject', function (subject) {
            var term = _this.term(subject);
            return _this.coerce(term, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'subject Term' });
        });
        this.visitMember(triple, 'predicate', function (predicate) { return TypeGuards_1.isTerm(predicate)
            ? _this.term(predicate)
            : _this.propertyPath(predicate); });
        this.visitMember(triple, 'object', function (object) {
            var term = _this.term(object);
            return _this.coerce(term, function (t) { return TypeGuards_1.isTerm(t) && t; }, { expected: 'Term', transformed: 'object Term' });
        });
        return undefined;
    };
    QueryVisitor.prototype.term = function (term) {
        if (term === undefined) {
            return undefined;
        }
        else if (TypeGuards_1.isVariable(term)) {
            return this.variableTerm(term);
        }
        else if (TypeGuards_1.isLiteral(term)) {
            return this.literal(term);
        }
        else if (TypeGuards_1.isBlank(term)) {
            return this.blank(term);
        }
        else if (TypeGuards_1.isIri(term)) {
            return this.iri(term);
        }
        return undefined;
    };
    QueryVisitor.prototype.variableTerm = function (variable) {
        return undefined;
    };
    QueryVisitor.prototype.literal = function (literal) {
        return undefined;
    };
    QueryVisitor.prototype.blank = function (blank) {
        return undefined;
    };
    QueryVisitor.prototype.iri = function (iri) {
        return undefined;
    };
    QueryVisitor.prototype.propertyPath = function (path) {
        var _this = this;
        this.walkArray('items', path.items, function (item) {
            return TypeGuards_1.isTerm(item) ? _this.term(item) : _this.propertyPath(item);
        });
        return undefined;
    };
    QueryVisitor.prototype.walkBaseQuery = function (query) {
        if (query.where) {
            this.walkArray('where', query.where, this.pattern);
        }
        if (query.values) {
            this.visitMember(query, 'values', this.valuesRows);
        }
    };
    QueryVisitor.prototype.walkProjectionVariables = function (variables) {
        if (!TypeGuards_1.isStarProjection(variables)) {
            this.walkArray('variables', variables, this.variable);
        }
    };
    QueryVisitor.prototype.walkArray = function (collectionName, nodes, walk) {
        if (nodes === null || nodes === undefined) {
            return;
        }
        this.nodeMember = collectionName;
        var index = 0;
        while (index < nodes.length) {
            if (nodes[index]) {
                index = this.walkItem(nodes, index, walk);
            }
            else {
                index++;
            }
        }
    };
    QueryVisitor.prototype.walkItem = function (nodes, index, walk) {
        var result = walk.call(this, nodes[index]);
        if (result !== undefined) {
            nodes[index] = result;
        }
        return index + 1;
    };
    QueryVisitor.prototype.coerce = function (value, coerce, names) {
        if (value === undefined) {
            return undefined;
        }
        var coerced = coerce(value);
        if (typeof coerced === 'boolean') {
            this.throwUnexpected(value, names);
        }
        else {
            return coerced;
        }
    };
    QueryVisitor.prototype.throwUnexpected = function (value, names) {
        throw new Error(names.expected + " is expected as result of " + names.transformed + " " +
            ("transformation but " + JSON.stringify(value) + " was given"));
    };
    return QueryVisitor;
}());
exports.QueryVisitor = QueryVisitor;
function cloneQuery(query) {
    var clone = _.cloneDeep(query);
    if (query.prefixes &&
        Object.getPrototypeOf(query.prefixes) !==
            Object.getPrototypeOf(clone.prefixes)) {
        clone.prefixes = Object.create(Object.getPrototypeOf(query.prefixes));
        for (var key in query.prefixes) {
            if (query.prefixes.hasOwnProperty(key)) {
                clone.prefixes[key] = query.prefixes[key];
            }
        }
    }
    return clone;
}
exports.cloneQuery = cloneQuery;
exports.default = QueryVisitor;
