Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var classNames = require("classnames");
var _ = require("lodash");
var DragAndDropApi_1 = require("./DragAndDropApi");
var Draggable = (function (_super) {
    tslib_1.__extends(Draggable, _super);
    function Draggable(props) {
        var _this = _super.call(this, props) || this;
        _this.setHandlers = function (source) {
            if (source) {
                _this.source = react_dom_1.findDOMNode(source);
                _this.source.addEventListener('dragstart', _this.onDragStart);
                _this.source.addEventListener('dragend', _this.onDragEnd);
            }
            else if (_this.source) {
                _this.source.removeEventListener('dragstart', _this.onDragStart);
                _this.source.removeEventListener('dragend', _this.onDragEnd);
            }
        };
        _this.onDragStart = function (e) {
            try {
                e.dataTransfer.setData(DragAndDropApi_1.DRAG_AND_DROP_FORMAT, _this.props.iri);
            }
            catch (ex) {
            }
            e.dataTransfer.setData(DragAndDropApi_1.DRAG_AND_DROP_FORMAT_IE, _this.props.iri);
            _this.setState({ isDragged: true });
            if (_this.props.onDragStart) {
                _this.props.onDragStart(_this.props.iri);
            }
            var mpDragStart = new CustomEvent('mp-dragstart', { detail: { iri: _this.props.iri } });
            window.dispatchEvent(mpDragStart);
        };
        _this.onDragEnd = function (e) {
            _this.setState({ isDragged: false });
            if (_this.props.onDragEnd) {
                _this.props.onDragEnd();
            }
            var mpDragEnd = new CustomEvent('mp-dragend');
            window.dispatchEvent(mpDragEnd);
        };
        _this.state = {
            isDragged: false,
        };
        return _this;
    }
    Draggable.prototype.componentWillMount = function () {
        var children = this.props.children;
        if (typeof children === 'string') {
            throw Error("The child element couldn't be a text node");
        }
        if (!children) {
            throw Error("The child element doesn't exists");
        }
    };
    Draggable.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var dragStyles = this.props.dragStyles;
        var isDragged = this.state.isDragged;
        var style = {};
        _.extend(style, child.props.style || {});
        _.extend(style, isDragged && dragStyles ? dragStyles : {});
        var className = classNames(child.props.className, {
            'mp-draggable-dragged': isDragged,
        });
        return react_1.cloneElement(child, { ref: this.setHandlers, className: className, style: style, draggable: true });
    };
    return Draggable;
}(react_1.Component));
exports.Draggable = Draggable;
exports.default = Draggable;
