Object.defineProperty(exports, "__esModule", { value: true });
var Rdf = require("../core/Rdf");
var xsd;
(function (xsd) {
    xsd._NAMESPACE = 'http://www.w3.org/2001/XMLSchema#';
    xsd._DATATYPES_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-datatypes#';
    xsd.iri = function (s) { return Rdf.iri(xsd._NAMESPACE + s); };
    xsd._string = xsd.iri('string');
    xsd.langString = xsd.iri('langString');
    xsd.integer = xsd.iri('integer');
    xsd.double = xsd.iri('double');
    xsd.boolean = xsd.iri('boolean');
    xsd.date = xsd.iri('date');
    xsd.time = xsd.iri('time');
    xsd.dateTime = xsd.iri('dateTime');
    xsd.decimal = xsd.iri('decimal');
    xsd.anyURI = xsd.iri('anyURI');
    xsd.LIST_TYPES = [
        { value: xsd.anyURI.value, label: 'xsd:anyURI' },
        { value: xsd.integer.value, label: 'xsd:integer' },
        { value: xsd.date.value, label: 'xsd:date' },
        { value: xsd.dateTime.value, label: 'xsd:dateTime' },
        { value: xsd._string.value, label: 'xsd:string' },
        { value: xsd.langString.value, label: 'xsd:langString' },
        { value: xsd.double.value, label: 'xsd:double' },
        { value: xsd.decimal.value, label: 'xsd:decimal' },
    ];
})(xsd || (xsd = {}));
exports.default = xsd;
