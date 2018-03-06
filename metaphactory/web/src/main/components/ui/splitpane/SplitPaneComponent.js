Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var SplitPane = require("react-split-pane");
var assign = require("object-assign");
var _ = require("lodash");
var utils_1 = require("platform/components/utils");
var SplitPaneSidebarClosedComponent_1 = require("./SplitPaneSidebarClosedComponent");
var SplitPaneSidebarOpenComponent_1 = require("./SplitPaneSidebarOpenComponent");
var SplitPaneToggleOnComponent_1 = require("./SplitPaneToggleOnComponent");
var SplitPaneToggleOffComponent_1 = require("./SplitPaneToggleOffComponent");
var SplitPaneConfig_1 = require("./SplitPaneConfig");
require("./split-pane.scss");
var LocalStorageState = utils_1.BrowserPersistence.adapter();
var SplitPaneComponent = (function (_super) {
    tslib_1.__extends(SplitPaneComponent, _super);
    function SplitPaneComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.getLSIdentifier = function () {
            var id = _this.props.id;
            return "mp-splitpane" + (id ? "-" + id : "");
        };
        _this.isPersistResize = function () {
            return _this.props.persistResize || _this.props.persistResize === undefined;
        };
        _this.handleOpen = function () {
            var size = _this.state.size;
            var hasEnoughSize = size && _this.consideredToBeOpened(size);
            if (!_this.state.isOpen && !hasEnoughSize) {
                size = _this.props.defaultSize;
            }
            _this.setState({ isOpen: !_this.state.isOpen, size: size }, function () {
                if (_this.isPersistResize()) {
                    LocalStorageState.update(_this.getLSIdentifier(), {
                        isOpen: _this.state.isOpen,
                        size: _this.state.size,
                    });
                }
                _this.triggerWindowResize();
            });
        };
        _this.handleDrag = function (size) {
            var minSize = _this.props.minSize;
            var isOpen = _this.consideredToBeOpened(size);
            _this.setState({ isOpen: isOpen, size: isOpen ? size : minSize }, function () {
                if (_this.isPersistResize()) {
                    LocalStorageState.update(_this.getLSIdentifier(), isOpen ? { size: size, isOpen: isOpen } : { isOpen: isOpen });
                }
                _this.triggerWindowResize();
            });
        };
        _this.mapChildren = function (children) {
            var isOpen = _this.state.isOpen;
            return utils_1.universalChildren(react_1.Children.map(children, function (child) {
                if (!child) {
                    return null;
                }
                if (typeof child === 'string') {
                    return child;
                }
                var element = child;
                var isSidebarClosed = element.type === SplitPaneSidebarClosedComponent_1.SplitPaneSidebarClosedComponent;
                var isSidebarOpen = element.type === SplitPaneSidebarOpenComponent_1.SplitPaneSidebarOpenComponent;
                var isToggleOn = element.type === SplitPaneToggleOnComponent_1.SplitPaneToggleOnComponent;
                var isToggleOff = element.type === SplitPaneToggleOffComponent_1.SplitPaneToggleOffComponent;
                if (isSidebarClosed || isToggleOn) {
                    return !isOpen ? react_1.cloneElement(element, { onClick: _this.handleOpen }) : null;
                }
                else if (isSidebarOpen || isToggleOff) {
                    return isOpen ? react_1.cloneElement(element, { onClick: _this.handleOpen }) : null;
                }
                return react_1.cloneElement.apply(void 0, [element, {}].concat(_this.mapChildren(element.props.children)));
            }));
        };
        _this.triggerWindowResize = _.debounce(function () { return window.dispatchEvent(new Event('resize')); }, 200);
        var isOpen;
        var size;
        if (_this.isPersistResize()) {
            var localState = LocalStorageState.get(_this.getLSIdentifier());
            isOpen = localState.isOpen;
            size = localState.size;
        }
        _this.state = {
            isOpen: isOpen === undefined ? Boolean(_this.props.defaultOpen) : isOpen,
            size: size === undefined ? _this.props.defaultSize : size,
        };
        return _this;
    }
    SplitPaneComponent.prototype.consideredToBeOpened = function (size) {
        var _a = this.props, minSize = _a.minSize, snapThreshold = _a.snapThreshold;
        return size > minSize + (snapThreshold || 0);
    };
    SplitPaneComponent.prototype.render = function () {
        var _a = this.props, minSize = _a.minSize, className = _a.className, resizerClassName = _a.resizerClassName, style = _a.style, sidebarStyle = _a.sidebarStyle, contentStyle = _a.contentStyle, children = _a.children;
        var isOpen = this.state.isOpen;
        var resizerStyle = assign({}, {
            width: 11,
            margin: '0 -5px',
            cursor: 'col-resize',
            zIndex: 1,
        }, this.props.resizerStyle);
        var props = {
            minSize: minSize,
            size: isOpen ? this.state.size : minSize,
            onChange: this.handleDrag,
            onDragFinished: this.handleDrag,
            className: className,
            resizerClassName: resizerClassName,
            style: style,
            resizerStyle: resizerStyle,
            pane1Style: sidebarStyle,
            pane2Style: contentStyle,
        };
        var firstChild = children[0];
        var firstChildStyle = assign({}, firstChild.props.style, SplitPaneConfig_1.configHasDock(this.props) ? {
            position: 'sticky',
            top: this.props.navHeight + 'px',
            height: "calc(100vh - " + this.props.navHeight + "px)",
        } : null);
        return react_1.createElement(SplitPane, props, react_1.cloneElement.apply(void 0, [firstChild,
            { style: firstChildStyle }].concat(this.mapChildren(firstChild.props.children))), this.mapChildren(children[1]));
    };
    return SplitPaneComponent;
}(react_1.Component));
SplitPaneComponent.defaultProps = {
    defaultSize: 300,
    defaultOpen: true,
    navHeight: 105,
};
exports.SplitPaneComponent = SplitPaneComponent;
exports.component = SplitPaneComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
