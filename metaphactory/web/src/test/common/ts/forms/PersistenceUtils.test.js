Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var forms_1 = require("platform/components/forms");
describe('parse insert query string and cast into SparqlJs.Update object', function () {
    it('insertPattern is valid insert query string', function () {
        var value = forms_1.parseQueryStringAsUpdateOperation("INSERT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n    } WHERE {}");
        var expectedUpdate = {
            type: 'update',
            prefixes: {},
            updates: [
                {
                    updateType: 'insertdelete',
                    insert: [
                        {
                            type: 'bgp',
                            triples: [
                                {
                                    subject: 'http://testsubject',
                                    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                                    object: 'http://testtype',
                                },
                            ],
                        },
                    ],
                    delete: [],
                    where: [],
                },
            ],
        };
        chai_1.expect(value).to.be.deep.equal(expectedUpdate);
    });
    it('insert is not an insert (i.e. not an update operation)', function () {
        chai_1.expect(function () {
            forms_1.parseQueryStringAsUpdateOperation("SELECT * WHERE { $subject a $value. }");
        }).to.throw('Specified deletePattern or insertPattern is not an update query.');
    });
});
