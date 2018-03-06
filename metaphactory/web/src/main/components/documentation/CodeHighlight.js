Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var CodeMirror = require("codemirror");
require("codemirror/lib/codemirror.css");
require("codemirror/mode/htmlmixed/htmlmixed");
require("codemirror/addon/mode/simple");
require("codemirror/addon/runmode/runmode");
require("codemirror/addon/mode/multiplex");
require("codemirror/mode/handlebars/handlebars");
require("codemirror/mode/xml/xml");
require("codemirror/mode/javascript/javascript");
require("codemirror/mode/clike/clike");
require("codemirror/mode/sparql/sparql");
require("codemirror/mode/turtle/turtle");
var CodeHighlightComponent = (function (_super) {
    tslib_1.__extends(CodeHighlightComponent, _super);
    function CodeHighlightComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CodeHighlightComponent.prototype.componentDidMount = function () {
        var codeNode = react_dom_1.findDOMNode(this);
        var options = { tabSize: 2 };
        CodeMirror.runMode(this.props.codeText, this.props.mode, codeNode, options);
    };
    CodeHighlightComponent.prototype.render = function () {
        return react_1.DOM.code({ className: 'cm-s-default' });
    };
    return CodeHighlightComponent;
}(react_1.Component));
CodeHighlightComponent.defaultProps = {
    codeText: '',
    mode: 'text/html',
};
exports.CodeHighlightComponent = CodeHighlightComponent;
exports.CodeHighlight = react_1.createFactory(CodeHighlightComponent);
exports.default = exports.CodeHighlight;
