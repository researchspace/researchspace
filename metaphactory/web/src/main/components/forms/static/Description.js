Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var StaticComponent_1 = require("./StaticComponent");
var classnames = require("classnames");
var CLASSNAME = 'field-description';
var Description = (function (_super) {
    tslib_1.__extends(Description, _super);
    function Description(props, context) {
        return _super.call(this, props, context) || this;
    }
    Description.prototype.render = function () {
        if (!this.props.definition) {
            return undefined;
        }
        var description = this.props.definition.description;
        if (!description) {
            return undefined;
        }
        return react_1.DOM.span({ className: classnames(CLASSNAME, this.props.className), style: this.props.style }, description);
    };
    return Description;
}(StaticComponent_1.StaticComponent));
exports.Description = Description;
exports.default = Description;
