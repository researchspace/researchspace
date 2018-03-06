Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput_1 = require("./SingleValueInput");
var Decorations_1 = require("./Decorations");
var HiddenInput = (function (_super) {
    tslib_1.__extends(HiddenInput, _super);
    function HiddenInput() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HiddenInput.prototype.render = function () {
        return react_1.createElement(Decorations_1.ValidationMessages, { errors: FieldValues_1.FieldValue.getErrors(this.props.value) });
    };
    return HiddenInput;
}(SingleValueInput_1.AtomicValueInput));
HiddenInput.defaultProps = {
    renderHeader: false,
};
exports.HiddenInput = HiddenInput;
exports.default = HiddenInput;
