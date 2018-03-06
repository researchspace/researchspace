Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var chaiString = require("chai-string");
chai_1.use(chaiString);
function mockConstructQuery(server, response, expectedRequest) {
    return mockSparqlRequest('text/turtle')(server, response, expectedRequest);
}
exports.mockConstructQuery = mockConstructQuery;
function mockSelectQuery(server, response, expectedRequest) {
    return mockSparqlRequest('application/sparql-results+json')(server, response, expectedRequest);
}
exports.mockSelectQuery = mockSelectQuery;
function mockSparqlRequest(contentType) {
    return function (server, response, expectedRequest) {
        server.respondWith('POST', '/sparql', function (xhr) {
            if (expectedRequest) {
                chai_1.expect(xhr.requestBody).to.be.equalIgnoreSpaces(expectedRequest);
            }
            xhr.respond(200, { 'Content-Type': contentType }, contentType === 'text/turtle' ? response : JSON.stringify(response));
        });
    };
}
