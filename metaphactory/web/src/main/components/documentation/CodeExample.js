Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var block = require("bem-cn");
var classNames = require("classnames");
var _ = require("lodash");
block.setup({
    mod: '--',
});
var CopyToClipboard = require("react-copy-to-clipboard");
var Maybe = require("data.maybe");
var react_1 = require("react");
var module_loader_1 = require("platform/api/module-loader");
var spinner_1 = require("platform/components/ui/spinner");
var CodeHighlight_1 = require("./CodeHighlight");
require("./code-example.scss");
var b = block('code-example');
var CodeExample = (function (_super) {
    tslib_1.__extends(CodeExample, _super);
    function CodeExample(props) {
        var _this = _super.call(this, props) || this;
        _this.onCodeToggle = function () {
            _this.setState({
                showCode: !_this.state.showCode,
            });
        };
        _this.state = {
            showCode: _.isUndefined(props.showCode) ? false : props.showCode,
            renderedCode: Maybe.Nothing(),
        };
        return _this;
    }
    CodeExample.prototype.componentDidMount = function () {
        this.loadCode(this.props.codeText);
    };
    CodeExample.prototype.componentWillReceiveProps = function (props) {
        if (props.codeText !== this.props.codeText) {
            this.loadCode(props.codeText);
        }
    };
    CodeExample.prototype.loadCode = function (codeText) {
        var _this = this;
        module_loader_1.ModuleRegistry.parseHtmlToReact(codeText).then(function (components) { return _this.setState({ renderedCode: Maybe.Just(components) }); });
    };
    CodeExample.prototype.render = function () {
        return react_1.DOM.div({ className: b.toString() }, this.renderToolbar(), this.renderedCode(), this.code());
    };
    CodeExample.prototype.renderedCode = function () {
        return react_1.DOM.div({
            style: { display: this.state.showCode ? 'none' : 'block' },
        }, this.state.renderedCode.getOrElse(react_1.createElement(spinner_1.Spinner)));
    };
    CodeExample.prototype.code = function () {
        if (this.state.showCode) {
            return react_1.DOM.pre({ className: b('code') }, CodeHighlight_1.default({
                codeText: this.props.codeText,
                mode: 'text/html',
            }));
        }
        else {
            return null;
        }
    };
    CodeExample.prototype.renderToolbar = function () {
        return react_1.DOM.div({}, react_1.DOM.button({
            className: classNames('btn', 'btn-default', b('toggle', { 'open': this.state.showCode, 'close': !this.state.showCode }).toString()),
            onClick: this.onCodeToggle,
        }, react_1.DOM.i({})), react_1.createElement(CopyToClipboard, {
            text: this.props.codeText,
        }, react_1.DOM.button({
            className: classNames('btn', 'btn-default', b('copy').toString()),
        }, react_1.DOM.i({}))));
    };
    return CodeExample;
}(react_1.Component));
exports.CodeExample = CodeExample;
exports.default = CodeExample;
