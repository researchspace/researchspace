Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var classNames = require("classnames");
var dnd_1 = require("platform/components/dnd");
var styles = require("./DropArea.scss");
var DropArea = (function (_super) {
    tslib_1.__extends(DropArea, _super);
    function DropArea() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DropArea.prototype.render = function () {
        var _a = this.props, children = _a.children, dropMessage = _a.dropMessage, className = _a.className, style = _a.style, alwaysVisible = _a.alwaysVisible, otherProps = tslib_1.__rest(_a, ["children", "dropMessage", "className", "style", "alwaysVisible"]);
        var classes = classNames(styles.dropArea, className, (_b = {}, _b[styles.alwaysVisible] = alwaysVisible, _b));
        return (React.createElement(dnd_1.Droppable, tslib_1.__assign({}, otherProps),
            React.createElement("div", { className: "" + classes, style: style },
                React.createElement("div", { className: styles.messageWrapper },
                    React.createElement("div", { className: styles.dropMessage }, dropMessage)),
                React.createElement("div", { className: styles.children }, children))));
        var _b;
    };
    return DropArea;
}(react_1.Component));
exports.DropArea = DropArea;
