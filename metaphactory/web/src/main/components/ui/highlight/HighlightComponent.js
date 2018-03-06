Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var styles = require("./HighlightComponent.scss");
var HighlightComponent = (function (_super) {
    tslib_1.__extends(HighlightComponent, _super);
    function HighlightComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HighlightComponent.prototype.render = function () {
        if (typeof this.props.children !== 'string') {
            throw 'Children of HighlightComponent must be string';
        }
        var label = this.props.children;
        var _a = this.props, className = _a.className, style = _a.style;
        return react_1.DOM.span.apply(react_1.DOM, [{ className: className, style: style }].concat(highlight(label, this.props.highlight, this.props.highlightProps)));
    };
    return HighlightComponent;
}(react_1.Component));
exports.HighlightComponent = HighlightComponent;
function highlight(sourceText, highlightedTerm, highlightProps) {
    if (highlightProps === void 0) { highlightProps = { className: styles.highlight }; }
    if (highlightedTerm) {
        var highlightedTermLower = highlightedTerm.toLowerCase();
        var startIndex = sourceText.toLowerCase().indexOf(highlightedTermLower);
        if (startIndex >= 0) {
            var endIndex = startIndex + highlightedTermLower.length;
            return [
                sourceText.substring(0, startIndex),
                react_1.DOM.span(highlightProps, sourceText.substring(startIndex, endIndex)),
                sourceText.substring(endIndex),
            ];
        }
    }
    return [sourceText];
}
exports.default = HighlightComponent;
