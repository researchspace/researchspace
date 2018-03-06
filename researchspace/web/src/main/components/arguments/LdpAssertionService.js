Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var maybe = require("data.maybe");
var ldp_1 = require("platform/api/services/ldp");
var LdpAssertionServiceClass = (function (_super) {
    tslib_1.__extends(LdpAssertionServiceClass, _super);
    function LdpAssertionServiceClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LdpAssertionServiceClass.prototype.createAssertion = function (assertion, slug) {
        if (slug === void 0) { slug = maybe.Nothing(); }
        return this.addResource(assertion, slug);
    };
    return LdpAssertionServiceClass;
}(ldp_1.LdpService));
exports.LdpAssertionServiceClass = LdpAssertionServiceClass;
