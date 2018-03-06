Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_DEFINITION = {
    id: 'test',
    label: 'label value',
    description: 'description value',
    xsdDatatype: 'test',
    minOccurs: 1,
    maxOccurs: 2,
    selectPattern: '',
    constraints: [
        {
            validatePattern: 'ASK { ?s ?p ?o }',
            message: 'test',
        },
        {
            message: 'Value does not pass the SPARQL ASK test.',
            validatePattern: 'ASK { BIND(false as ?b). FILTER(?b=true)}',
        },
    ],
    categories: [],
    valueSetPattern: '',
    autosuggestionPattern: 'SELECT * WHERE { ?s ?p ?o }',
};
exports.FIELD_DEFINITION_CARDINATILIY = {
    id: 'test',
    maxOccurs: 'unbound',
};
