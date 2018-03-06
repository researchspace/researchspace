Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("../vocabularies/vocabularies");
var LDPUserDefinedPageServiceClass = (function (_super) {
    tslib_1.__extends(LDPUserDefinedPageServiceClass, _super);
    function LDPUserDefinedPageServiceClass(container) {
        return _super.call(this, container) || this;
    }
    return LDPUserDefinedPageServiceClass;
}(ldp_1.LdpService));
exports.LDPUserDefinedPageServiceClass = LDPUserDefinedPageServiceClass;
exports.LdpUserDefinedPageService = new LDPUserDefinedPageServiceClass(vocabularies_1.rso.UserDefinedPagesContainer.value);
exports.default = exports.LdpUserDefinedPageService;
