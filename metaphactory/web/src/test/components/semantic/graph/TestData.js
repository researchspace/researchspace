Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var foaf;
(function (foaf) {
    foaf._NAMESPACE = 'http://xmlns.com/foaf/0.1/';
    foaf.i = function (s) { return rdf_1.Rdf.iri(foaf._NAMESPACE + s); };
    foaf.knows = foaf.i('knows');
    foaf.member = foaf.i('member');
})(foaf = exports.foaf || (exports.foaf = {}));
var person;
(function (person) {
    person._NAMESPACE = 'http://example.com/person/';
    person.i = function (s) { return rdf_1.Rdf.iri(person._NAMESPACE + s); };
    person.alice = person.i('alice');
    person.bob = person.i('bob');
    person.carol = person.i('carol');
    person.mike = person.i('mike');
    person.sam = person.i('sam');
    person.W3C = person.i('W3C');
    person.W3C2 = person.i('W3C2');
})(person = exports.person || (exports.person = {}));
