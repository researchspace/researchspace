Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var StaticComponent_1 = require("./StaticComponent");
var classnames = require("classnames");
var CLASSNAME = 'field-label';
var Label = (function (_super) {
    tslib_1.__extends(Label, _super);
    function Label() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Label.prototype.render = function () {
        if (!this.props.definition) {
            return undefined;
        }
        var label = this.props.definition.label;
        if (!label) {
            return null;
        }
        return react_1.DOM.span({ className: classnames(CLASSNAME, this.props.className), style: this.props.style }, label);
    };
    return Label;
}(StaticComponent_1.StaticComponent));
exports.Label = Label;
exports.default = Label;
