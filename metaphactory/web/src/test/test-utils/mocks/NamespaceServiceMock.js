Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
function mockNamespaceService(server, response, expectedRequest) {
    server.respondWith('GET', '/rest/data/rdf/namespace/getRegisteredPrefixes', function (xhr) {
        console.error('In namespace service.');
        if (expectedRequest) {
            chai_1.expect(xhr.requestBody).to.be.equalIgnoreSpaces(expectedRequest);
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(response));
    });
}
exports.mockNamespaceService = mockNamespaceService;
