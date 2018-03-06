var tslib_1 = require("tslib");
var _ = require("lodash");
var Maybe = require("data.maybe");
var Immutable = require("immutable");
var json_1 = require("platform/api/json");
var Rdf;
(function (Rdf) {
    var Node = (function () {
        function Node(value) {
            this._value = value;
        }
        Object.defineProperty(Node.prototype, "value", {
            get: function () {
                return this._value;
            },
            enumerable: true,
            configurable: true
        });
        Node.cata = function (onIri, onLiteral, onBnode) {
            return function (node) {
                if (node.isIri()) {
                    return onIri(node);
                }
                else if (node.isLiteral()) {
                    return onLiteral(node);
                }
                else {
                    return onBnode(node);
                }
            };
        };
        Node.prototype.hashCode = function () {
            return hashString(this.value);
        };
        Node.prototype.equals = function (other) {
            if (!other || typeof other !== 'object') {
                return false;
            }
            else {
                return this.value === other.value;
            }
        };
        Node.prototype.cata = function (onIri, onLiteral, onBnode) {
            return Node.cata(onIri, onLiteral, onBnode)(this);
        };
        Node.prototype.isIri = function () {
            return this instanceof Iri;
        };
        Node.prototype.isLiteral = function () {
            return this instanceof Literal;
        };
        Node.prototype.isBnode = function () {
            return this instanceof BNode;
        };
        Node.prototype.toString = function () { throw Error('Node.toString() is not implemented'); };
        return Node;
    }());
    Rdf.Node = Node;
    var Iri = (function (_super) {
        tslib_1.__extends(Iri, _super);
        function Iri() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Iri.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && other instanceof Rdf.Iri;
        };
        Iri.prototype.toString = function () {
            return "<" + this.value + ">";
        };
        Iri.prototype.toJSON = function () {
            return {
                'value': this.value,
            };
        };
        Iri.fromJSON = function (str) {
            return new Iri(str.value);
        };
        return Iri;
    }(Node));
    tslib_1.__decorate([
        json_1.serializer
    ], Iri.prototype, "toJSON", null);
    tslib_1.__decorate([
        json_1.deserializer
    ], Iri, "fromJSON", null);
    Rdf.Iri = Iri;
    function iri(value) {
        return new Iri(value);
    }
    Rdf.iri = iri;
    function fullIri(value) {
        if (_.startsWith(value, '<') && _.endsWith(value, '>')) {
            return iri(value.slice(1, -1));
        }
        else {
            throw new Error('Expected IRI to be enclosed in <>, for ' + value);
        }
    }
    Rdf.fullIri = fullIri;
    Rdf.BASE_IRI = iri('');
    var Literal = (function (_super) {
        tslib_1.__extends(Literal, _super);
        function Literal(value, dataType) {
            var _this = _super.call(this, value) || this;
            _this._dataType = dataType;
            return _this;
        }
        Object.defineProperty(Literal.prototype, "dataType", {
            get: function () {
                return this._dataType;
            },
            enumerable: true,
            configurable: true
        });
        Literal.prototype.toString = function () {
            return "\"" + this.value + "\"^^" + this.dataType.toString();
        };
        Literal.prototype.equals = function (other) {
            if (!other || typeof other !== 'object') {
                return false;
            }
            else {
                return other instanceof Literal && !(other instanceof LangLiteral)
                    && this.value === other.value
                    && this.dataType.equals(other.dataType);
            }
        };
        Literal.prototype.toJSON = function () {
            return {
                'value': this.value,
                'dataType': this._dataType,
            };
        };
        Literal.fromJSON = function (obj) {
            return new Literal(obj.value, obj.dataType);
        };
        return Literal;
    }(Node));
    tslib_1.__decorate([
        json_1.serializer
    ], Literal.prototype, "toJSON", null);
    tslib_1.__decorate([
        json_1.deserializer
    ], Literal, "fromJSON", null);
    Rdf.Literal = Literal;
    function literal(value, dataType) {
        if (typeof value === 'boolean') {
            return new Literal(value.toString(), iri('http://www.w3.org/2001/XMLSchema#boolean'));
        }
        else {
            if (dataType === undefined) {
                return new Literal(value, iri('http://www.w3.org/2001/XMLSchema#string'));
            }
            else {
                return new Literal(value, dataType);
            }
        }
    }
    Rdf.literal = literal;
    var LangLiteral = (function (_super) {
        tslib_1.__extends(LangLiteral, _super);
        function LangLiteral(value, lang) {
            var _this = _super.call(this, value, iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')) || this;
            _this._lang = lang;
            return _this;
        }
        Object.defineProperty(LangLiteral.prototype, "lang", {
            get: function () {
                return this._lang;
            },
            enumerable: true,
            configurable: true
        });
        LangLiteral.prototype.equals = function (other) {
            if (!other || typeof other !== 'object') {
                return false;
            }
            else {
                return other instanceof LangLiteral
                    && this.value === other.value
                    && this.dataType.equals(other.dataType)
                    && this.lang === other.lang;
            }
        };
        LangLiteral.prototype.toString = function () {
            return "\"" + this.value + "\"@" + this.lang;
        };
        LangLiteral.prototype.toJSON = function () {
            return {
                'value': this.value,
                'dataType': this.dataType,
                'lang': this.lang,
            };
        };
        LangLiteral.fromJSON = function (obj) {
            return new LangLiteral(obj.value, obj.lang);
        };
        return LangLiteral;
    }(Literal));
    tslib_1.__decorate([
        json_1.serializer
    ], LangLiteral.prototype, "toJSON", null);
    tslib_1.__decorate([
        json_1.deserializer
    ], LangLiteral, "fromJSON", null);
    Rdf.LangLiteral = LangLiteral;
    function langLiteral(value, lang) {
        return new LangLiteral(value, lang);
    }
    Rdf.langLiteral = langLiteral;
    var BNode = (function (_super) {
        tslib_1.__extends(BNode, _super);
        function BNode() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BNode.prototype.toString = function () {
            return "" + this.value;
        };
        return BNode;
    }(Node));
    Rdf.BNode = BNode;
    function bnode(value) {
        if (_.isUndefined(value)) {
            return new BNode('_:' + Math.random().toString(36).substring(7));
        }
        else {
            return new BNode(value.startsWith('_:') ? value : '_:' + value);
        }
    }
    Rdf.bnode = bnode;
    var Triple = (function () {
        function Triple(s, p, o, g) {
            if (g === void 0) { g = Rdf.DEFAULT_GRAPH; }
            this._s = s;
            this._p = p;
            this._o = o;
            this._g = g;
        }
        Object.defineProperty(Triple.prototype, "s", {
            get: function () {
                return this._s;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Triple.prototype, "p", {
            get: function () {
                return this._p;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Triple.prototype, "o", {
            get: function () {
                return this._o;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Triple.prototype, "g", {
            get: function () {
                return this._g;
            },
            enumerable: true,
            configurable: true
        });
        Triple.prototype.hashCode = function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((this.s == null) ? 0 : this.s.hashCode());
            result = prime * result + ((this.p == null) ? 0 : this.p.hashCode());
            result = prime * result + ((this.o == null) ? 0 : this.o.hashCode());
            result = prime * result + (_.isUndefined(this.g) ? 0 : this.g.hashCode());
            return result;
        };
        return Triple;
    }());
    Rdf.Triple = Triple;
    function triple(s, p, o, g) {
        return new Triple(s, p, o, g);
    }
    Rdf.triple = triple;
    var Graph = (function () {
        function Graph(triples) {
            this._triples = triples;
        }
        Object.defineProperty(Graph.prototype, "triples", {
            get: function () {
                return this._triples;
            },
            enumerable: true,
            configurable: true
        });
        return Graph;
    }());
    Rdf.Graph = Graph;
    function graph(triples) {
        if (triples instanceof Immutable.Set) {
            return new Graph(triples);
        }
        else if (_.isArray(triples)) {
            return new Graph(Immutable.Set(triples));
        }
        else {
            return new Graph(Immutable.Set(arguments));
        }
    }
    Rdf.graph = graph;
    function union() {
        var graphs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            graphs[_i] = arguments[_i];
        }
        return graph(Immutable.Set(graphs).map(function (g) { return g.triples; }).flatten());
    }
    Rdf.union = union;
    var PointedGraph = (function () {
        function PointedGraph(pointer, graph) {
            this._pointer = pointer;
            this._graph = graph;
        }
        Object.defineProperty(PointedGraph.prototype, "pointer", {
            get: function () {
                return this._pointer;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PointedGraph.prototype, "graph", {
            get: function () {
                return this._graph;
            },
            enumerable: true,
            configurable: true
        });
        return PointedGraph;
    }());
    Rdf.PointedGraph = PointedGraph;
    function pg(pointer, graph) {
        return new PointedGraph(pointer, graph);
    }
    Rdf.pg = pg;
    function hashString(string) {
        var hash = 0;
        for (var ii = 0; ii < string.length; ii++) {
            hash = 31 * hash + string.charCodeAt(ii) | 0;
        }
        return smi(hash);
    }
    function smi(i32) {
        return ((i32 >>> 1) & 0x40000000) | (i32 & 0xBFFFFFFF);
    }
    Rdf.smi = smi;
    Rdf.DEFAULT_GRAPH = new Iri('default');
    Rdf.EMPTY_GRAPH = graph([]);
    function getValueFromPropertyPath(propertyPath, pg) {
        var values = getValuesFromPropertyPath(propertyPath, pg);
        if (values.length > 1) {
            throw new Error('more than one value found in the graph for property path ' + propertyPath);
        }
        return Maybe.fromNullable(getValuesFromPropertyPath(propertyPath, pg)[0]);
    }
    Rdf.getValueFromPropertyPath = getValueFromPropertyPath;
    function getValuesFromPropertyPath(propertyPath, pg) {
        var nodes = _.reduce(propertyPath, function (ss, p) {
            return _.flatMap(ss, function (iri) { return pg.graph.triples.filter(function (t) { return t.s.equals(iri) && t.p.equals(p); }).toArray(); }).map(function (t) { return t.o; });
        }, [pg.pointer]);
        return _.uniqBy(nodes, function (node) { return node.value; });
    }
    Rdf.getValuesFromPropertyPath = getValuesFromPropertyPath;
})(Rdf || (Rdf = {}));
module.exports = Rdf;
