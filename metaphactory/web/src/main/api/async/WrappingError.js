Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var WrappingError = (function (_super) {
    tslib_1.__extends(WrappingError, _super);
    function WrappingError(message, innerError) {
        var _this = _super.call(this, WrappingError.formatMessage(message, innerError)) || this;
        _this.innerError = innerError;
        Object.setPrototypeOf(_this, WrappingError.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, WrappingError);
        }
        else {
            _this.stack = new Error().stack;
        }
        return _this;
    }
    WrappingError.formatMessage = function (message, innerError) {
        var innerMessage = innerError ? innerError.message : undefined;
        return message + (innerMessage ? (': \n' + innerMessage) : '');
    };
    return WrappingError;
}(Error));
exports.WrappingError = WrappingError;
