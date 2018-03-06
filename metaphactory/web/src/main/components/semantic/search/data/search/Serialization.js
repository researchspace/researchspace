Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var lz_string_1 = require("lz-string");
var sparql_1 = require("platform/api/sparql");
var json_1 = require("platform/api/json");
var Model_1 = require("./Model");
var Serializer = (function () {
    function Serializer() {
        var _this = this;
        this.serializeConjunct = function (conjunct) {
            if (conjunct.kind === Model_1.ConjunctKinds.Relation) {
                var relation = {
                    range: _this.compactIRI(conjunct.range.iri),
                    relation: _this.compactIRI(conjunct.relation.iri),
                    disjuncts: conjunct.disjuncts.map(_this.serializeRelationDisjunct),
                };
                return { relation: relation, uniqueId: conjunct.uniqueId };
            }
            else if (conjunct.kind === Model_1.ConjunctKinds.Text) {
                var text = {
                    range: _this.compactIRI(conjunct.range.iri),
                    disjuncts: conjunct.disjuncts.map(function (d) { return d.value; }),
                };
                return { text: text, uniqueId: conjunct.uniqueId };
            }
            else {
                throw new Error("Unknown conjunct kind");
            }
        };
        this.serializeRelationDisjunct = function (disjunct) {
            var value = disjunct.kind === 'Resource'
                ? _this.serializeResource(disjunct.value)
                : json_1.serialize(disjunct.value);
            return [disjunct.kind, value];
        };
    }
    Serializer.prototype.serializeState = function (state) {
        return {
            search: state.search ? this.serializeSearch(state.search) : undefined,
            facet: state.facet ? this.serializeFacet(state.facet) : undefined,
            result: state.result ? json_1.serialize(state.result) : undefined,
        };
    };
    Serializer.prototype.serializeSearch = function (search) {
        return {
            domain: this.compactIRI(search.domain.iri),
            conjuncts: search.conjuncts.map(this.serializeConjunct),
        };
    };
    Serializer.prototype.serializeFacet = function (ast) {
        return ast.conjuncts.map(this.serializeConjunct);
    };
    Serializer.prototype.serializeResource = function (resource) {
        return json_1.serialize(resource);
    };
    Serializer.prototype.compactIRI = function (iri) {
        return sparql_1.SparqlUtil.compactIriUsingPrefix(iri);
    };
    return Serializer;
}());
exports.Serializer = Serializer;
var Deserializer = (function () {
    function Deserializer(store) {
        var _this = this;
        this.store = store;
        this.deserializeConjunct = function (conjunct, conjunctIndex) {
            if (conjunct.relation) {
                var disjuncts = conjunct.relation.disjuncts;
                if (!(disjuncts && Array.isArray(disjuncts))) {
                    throw new Error('Invalid disjuncts for serialized relation conjunct');
                }
                var relational = {
                    uniqueId: conjunct.uniqueId,
                    kind: Model_1.ConjunctKinds.Relation,
                    relation: _this.deserializeRelation(conjunct.relation.relation),
                    range: _this.deserializeCategory(conjunct.relation.range),
                    conjunctIndex: [conjunctIndex],
                    disjuncts: disjuncts.map(function (disjunct, index) {
                        return _this.deserializeRelationDisjunct(disjunct, [conjunctIndex, index]);
                    }),
                };
                return relational;
            }
            else if (conjunct.text) {
                var disjuncts = conjunct.text.disjuncts;
                if (!(disjuncts && Array.isArray(disjuncts))) {
                    throw new Error('Invalid disjuncts for serialized text conjunct');
                }
                var text = {
                    uniqueId: conjunct.uniqueId,
                    kind: Model_1.ConjunctKinds.Text,
                    range: _this.deserializeCategory(conjunct.text.range),
                    conjunctIndex: [conjunctIndex],
                    disjuncts: disjuncts.map(function (disjunct, index) {
                        return _this.deserializeTextDisjunct(disjunct, [conjunctIndex, index]);
                    }),
                };
                return text;
            }
            else {
                throw new Error('Invalid serialized conjunct');
            }
        };
    }
    Deserializer.prototype.deserializeState = function (state) {
        if (!state || typeof state !== 'object' || !state.search) {
            return { search: undefined, facet: undefined, result: {} };
        }
        var result = state.result ? json_1.deserialize(state.result) : undefined;
        return {
            search: this.deserializeSearch(state.search),
            facet: this.deserializeFacet(state.facet),
            result: result || {},
        };
    };
    Deserializer.prototype.deserializeSearch = function (search) {
        return {
            domain: this.deserializeCategory(search.domain),
            conjuncts: search.conjuncts.map(this.deserializeConjunct),
        };
    };
    Deserializer.prototype.deserializeFacet = function (facet) {
        var _this = this;
        if (!facet) {
            return undefined;
        }
        var conjuncts = facet.map(function (conjunct, index) {
            var deserialized = _this.deserializeConjunct(conjunct, index);
            if (deserialized.kind !== Model_1.ConjunctKinds.Relation) {
                throw new Error("Unexpected conjunct kind for facet: " + deserialized.kind);
            }
            return deserialized;
        });
        return { conjuncts: conjuncts };
    };
    Deserializer.prototype.deserializeRelationDisjunct = function (disjunct, disjunctIndex) {
        if (!(disjunct && Array.isArray(disjunct) && disjunct.length === 2)) {
            throw new Error('Invalid serialized relation disjunct');
        }
        var kind = disjunct[0], serialized = disjunct[1];
        var value = kind === 'Resource'
            ? this.deserializeResource(serialized)
            : json_1.deserialize(serialized);
        return { kind: kind, value: value, disjunctIndex: disjunctIndex };
    };
    Deserializer.prototype.deserializeTextDisjunct = function (disjunct, disjunctIndex) {
        if (typeof disjunct !== 'string') {
            throw new Error('Invalid serialized text disjunct');
        }
        return { kind: Model_1.TextDisjunctKind, value: disjunct, disjunctIndex: disjunctIndex };
    };
    Deserializer.prototype.deserializeCategory = function (iri) {
        if (!iri) {
            throw new Error('Category IRI cannot be empty');
        }
        var categoryIri = this.expandIri(iri);
        var category = this.store.categories.get(categoryIri);
        if (!category) {
            throw new Error("Category not found: " + categoryIri);
        }
        return category;
    };
    Deserializer.prototype.deserializeRelation = function (iri) {
        if (!iri) {
            throw new Error('Relation IRI cannot be empty');
        }
        var relationIri = this.expandIri(iri);
        var relation = this.store.relations.get(relationIri);
        if (!relation) {
            throw new Error("Relation not found: " + relationIri);
        }
        return relation;
    };
    Deserializer.prototype.deserializeResource = function (resource) {
        return json_1.deserialize(resource);
    };
    Deserializer.prototype.expandIri = function (iri) {
        return sparql_1.SparqlUtil.resolveIris([iri])[0];
    };
    return Deserializer;
}());
exports.Deserializer = Deserializer;
var FullToCompact = {
    search: 's',
    facet: 'f',
    type: 't',
    domain: 'do',
    range: 'ra',
    relation: 're',
    text: 'te',
    conjuncts: 'c',
    disjuncts: 'd',
    '#type': 'T',
    '#value': 'V',
};
var CompactToFull = lodash_1.invert(FullToCompact);
function deepMapObject(target, propertyMapper) {
    if (target === undefined && target === null) {
        return target;
    }
    else if (Array.isArray(target)) {
        return target.map(function (item) { return deepMapObject(item, propertyMapper); });
    }
    else if (typeof target === 'object') {
        var result = {};
        for (var _i = 0, _a = Object.keys(target); _i < _a.length; _i++) {
            var key = _a[_i];
            var value = target[key];
            var mapped = propertyMapper(key, value, function (child) { return deepMapObject(child, propertyMapper); });
            if (mapped) {
                result[mapped.key] = mapped.value;
            }
        }
        return result;
    }
    else {
        return target;
    }
}
function packState(state) {
    return deepMapObject(state, function (rawKey, value, mapper) {
        var packedKey;
        if (rawKey.startsWith('@') || rawKey in CompactToFull) {
            packedKey = '@' + rawKey;
        }
        else {
            packedKey = FullToCompact[rawKey] || rawKey;
        }
        return { key: packedKey, value: mapper(value) };
    });
}
exports.packState = packState;
function unpackState(state) {
    return deepMapObject(state, function (packedKey, value, mapper) {
        var rawKey;
        if (packedKey.startsWith('@')) {
            rawKey = packedKey.substring(1);
        }
        else {
            rawKey = CompactToFull[packedKey] || packedKey;
        }
        return { key: rawKey, value: mapper(value) };
    });
}
exports.unpackState = unpackState;
function serializeSearch(baseQuery, facet, result) {
    var serialized = new Serializer().serializeState({
        search: baseQuery,
        facet: facet,
        result: result,
    });
    var packed = packState(serialized);
    var packedJson = JSON.stringify(packed);
    return lz_string_1.compressToEncodedURIComponent(packedJson);
}
exports.serializeSearch = serializeSearch;
