Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
function mockThumbnailService(server, response, expectedRequest) {
    server.respondWith('POST', '/rest/data/rdf/utils/thumbnails/default?repository=default', function (xhr) {
        if (expectedRequest) {
            chai_1.expect(xhr.requestBody).to.be.equalIgnoreSpaces(expectedRequest);
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, response);
    });
}
exports.mockThumbnailService = mockThumbnailService;
