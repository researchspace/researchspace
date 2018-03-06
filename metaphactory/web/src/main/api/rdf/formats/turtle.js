Object.defineProperty(exports, "__esModule", { value: true });
var N3 = require("n3");
var Kefir = require("kefir");
var _ = require("lodash");
var Rdf = require("../core/Rdf");
var vocabularies_1 = require("../vocabularies/vocabularies");
var N3Util = N3.Util;
var serialize;
(function (serialize) {
    serialize.Format = {
        Turtle: 'turtle',
        NTriples: 'N-Triples',
        Trig: 'application/trig',
        NQuads: 'N-Quads',
    };
    function serializeGraph(graph, format) {
        if (format === void 0) { format = serialize.Format.Turtle; }
        var writer = N3.Writer({ format: format });
        graph.triples.forEach(function (triple) { return writer.addTriple(tripleToN3(triple)); });
        return Kefir.fromNodeCallback(writer.end.bind(writer)).toProperty();
    }
    serialize.serializeGraph = serializeGraph;
    function tripleToN3(triple) {
        var nTriple = {
            subject: nodeToN3(triple.s),
            predicate: nodeToN3(triple.p),
            object: nodeToN3(triple.o),
        };
        if (!_.isUndefined(triple.g) && !triple.g.equals(Rdf.DEFAULT_GRAPH)) {
            nTriple.graph = nodeToN3(triple.g);
        }
        return nTriple;
    }
    serialize.tripleToN3 = tripleToN3;
    function nodeToN3(value) {
        return value.cata(function (iri) { return iri.value; }, function (literal) { return literalToN3(literal); }, function (bnode) { return bnode.value; });
    }
    serialize.nodeToN3 = nodeToN3;
    function literalToN3(literal) {
        if (literal instanceof Rdf.LangLiteral) {
            return "\"" + literal.value + "\"@" + literal.lang;
        }
        else {
            return "\"" + literal.value + "\"^^" + literal.dataType.value;
        }
    }
    serialize.literalToN3 = literalToN3;
})(serialize = exports.serialize || (exports.serialize = {}));
var deserialize;
(function (deserialize) {
    function turtleToGraph(turtle) {
        return turtleToTriples(turtle).map(Rdf.graph);
    }
    deserialize.turtleToGraph = turtleToGraph;
    function turtleToTriples(turtle) {
        return Kefir.stream(function (emitter) {
            initN3Parser(emitter, turtle);
        }).scan(function (acc, x) {
            acc.push(x);
            return acc;
        }, []).last();
    }
    deserialize.turtleToTriples = turtleToTriples;
    function n3TripleToRdf(triple) {
        return Rdf.triple(n3ValueToRdf(triple.subject), n3ValueToRdf(triple.predicate), n3ValueToRdf(triple.object));
    }
    deserialize.n3TripleToRdf = n3TripleToRdf;
    function n3ValueToRdf(value) {
        if (N3Util.isIRI(value) || value === '') {
            return Rdf.iri(value);
        }
        else if (N3Util.isLiteral(value)) {
            return n3LiteralToRdf(value);
        }
        else if (N3Util.isBlank(value)) {
            return Rdf.bnode(value);
        }
        else {
            throw new Error("Invalid rdf value: " + value);
        }
    }
    deserialize.n3ValueToRdf = n3ValueToRdf;
    function n3LiteralToRdf(literal) {
        switch (N3Util.getLiteralType(literal)) {
            case vocabularies_1.rdf.langString.value:
                return Rdf.langLiteral(N3Util.getLiteralValue(literal), N3Util.getLiteralLanguage(literal));
            default:
                return Rdf.literal(N3Util.getLiteralValue(literal), Rdf.iri(N3Util.getLiteralType(literal)));
        }
    }
    deserialize.n3LiteralToRdf = n3LiteralToRdf;
    function initN3Parser(emitter, turtle) {
        var parser = N3.Parser();
        parser.parse(turtle, function (error, triple, prefixes) {
            if (error) {
                emitter.error(error);
            }
            if (triple != null) {
                emitter.emit(n3TripleToRdf(triple));
            }
            else {
                emitter.end();
            }
        });
        return parser;
    }
    deserialize.initN3Parser = initN3Parser;
})(deserialize = exports.deserialize || (exports.deserialize = {}));
