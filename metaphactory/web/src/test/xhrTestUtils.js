Object.defineProperty(exports, "__esModule", { value: true });
var sinon = require("sinon");
function mockRequest() {
    beforeEach(function () {
        this.xhr = sinon.useFakeXMLHttpRequest();
        this.xhr.onCreate = function (xhr) {
            this.request = xhr;
        }.bind(this);
    });
    afterEach(function () {
        this.xhr.restore();
    });
}
exports.default = mockRequest;
