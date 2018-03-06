Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var DATATYPE = rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');
exports.PROPS = {
    definition: forms_1.normalizeFieldDefinition({
        id: 'nameProp',
        label: 'labelProp',
        description: 'test description',
        xsdDatatype: DATATYPE,
        minOccurs: 1,
        maxOccurs: 1,
        selectPattern: '',
    }),
    for: 'test',
    value: forms_1.FieldValue.empty,
    dataState: forms_1.DataState.Ready,
};
