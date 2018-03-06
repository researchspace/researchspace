Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactTruncateComponent = require("react-truncate");
var module_loader_1 = require("platform/api/module-loader");
var TextTruncateExpandCollapseComponent = require("./TextTruncateExpandCollapseComponent");
var ReactTruncate = react_1.createFactory(ReactTruncateComponent);
var TextTruncateComponent = (function (_super) {
    tslib_1.__extends(TextTruncateComponent, _super);
    function TextTruncateComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.handleExpand = function () {
            _this.setState({ expanded: !_this.state.expanded });
        };
        _this.state = {
            expanded: false,
        };
        return _this;
    }
    TextTruncateComponent.prototype.componentDidMount = function () {
        var _this = this;
        var _a = this.props, truncate = _a.truncate, expand = _a.expand, collapse = _a.collapse;
        if (truncate) {
            module_loader_1.ModuleRegistry.parseHtmlToReact(truncate).then(function (element) {
                _this.setState({ truncateElement: element });
            });
        }
        else {
            this.setState({ truncateElement: react_1.DOM.span({}, '') });
        }
        if (expand) {
            module_loader_1.ModuleRegistry.parseHtmlToReact(expand).then(function (element) {
                _this.setState({
                    expandElement: TextTruncateExpandCollapseComponent.factory({ onClick: _this.handleExpand }, element),
                });
            });
        }
        if (collapse) {
            module_loader_1.ModuleRegistry.parseHtmlToReact(collapse).then(function (element) {
                _this.setState({
                    collapseElement: TextTruncateExpandCollapseComponent.factory({ onClick: _this.handleExpand }, element),
                });
            });
        }
    };
    TextTruncateComponent.prototype.render = function () {
        var _a = this.props, lines = _a.lines, className = _a.className, style = _a.style;
        var _b = this.state, expanded = _b.expanded, truncateElement = _b.truncateElement, expandElement = _b.expandElement, collapseElement = _b.collapseElement;
        var ellipsis = react_1.DOM.span({}, truncateElement, expandElement);
        return truncateElement ? react_1.DOM.div({ className: className, style: style }, ReactTruncate({
            lines: expanded ? 0 : lines || 1,
            ellipsis: ellipsis,
        }, this.props.children), expanded ? collapseElement : null) : null;
    };
    return TextTruncateComponent;
}(react_1.Component));
exports.TextTruncateComponent = TextTruncateComponent;
exports.component = TextTruncateComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
