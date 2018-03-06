Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var Ordering_1 = require("./Ordering");
require("./ReorderableList.scss");
var CLASS_NAME = 'ReorderableList';
var ReorderableList = (function (_super) {
    tslib_1.__extends(ReorderableList, _super);
    function ReorderableList(props) {
        var _this = _super.call(this, props) || this;
        _this.isDragging = false;
        _this.state = {
            ordering: (_this.props.ordering || Ordering_1.Ordering.empty).setSize(React.Children.count(_this.props.children)),
        };
        return _this;
    }
    ReorderableList.prototype.render = function () {
        var _this = this;
        var _a = this.props, style = _a.style, children = _a.children;
        var positionToIndex = this.state.ordering.getPositionToIndex();
        var items = React.Children.toArray(children);
        var draggingClass = typeof this.state.draggingIndex === 'number'
            ? CLASS_NAME + "--dragging" : '';
        var className = CLASS_NAME + " " + draggingClass + " " + (this.props.className || '');
        return (React.createElement("div", { className: className, style: style }, positionToIndex.map(function (index, position) { return _this.renderItem(items[index], index); })));
    };
    ReorderableList.prototype.renderItem = function (item, index) {
        var _this = this;
        var draggingIndex = this.state.draggingIndex;
        var style = index === draggingIndex
            ? { opacity: 0, pointerEvents: 'none' }
            : undefined;
        var className = CLASS_NAME + "__item";
        var draggedClass = index === draggingIndex ? className + "--dragged" : '';
        return (React.createElement("div", { key: getChildKey(item), className: className + " " + draggedClass, draggable: true, onDrag: function (e) { return _this.startDragging(index, e); }, onDragEnd: function (e) { return _this.onDragEnd(); }, onDragOver: function (e) { return e.preventDefault(); }, onDragEnter: function (e) { return _this.onDragEnterTarget(index, e); }, onDragLeave: function (e) { return _this.onDragLeaveTarget(index); }, onDrop: function (e) { return _this.onDropAtTarget(index, e); }, style: style },
            React.createElement("div", { className: CLASS_NAME + "__item-handle" }),
            React.createElement("div", { className: CLASS_NAME + "__item-body" }, item)));
    };
    ReorderableList.prototype.componentWillReceiveProps = function (nextProps) {
        var ordering = (nextProps.ordering || this.state.ordering).setSize(React.Children.count(nextProps.children));
        this.setState({ ordering: ordering });
    };
    ReorderableList.prototype.startDragging = function (itemIndex, e) {
        if (this.isDragging) {
            return;
        }
        e.stopPropagation();
        this.isDragging = true;
        this.setState({ draggingIndex: itemIndex });
    };
    ReorderableList.prototype.onDragEnd = function () {
        if (!this.isDragging) {
            return;
        }
        this.isDragging = false;
        if (this.props.onOrderChanged && this.state.ordering !== this.props.ordering) {
            this.props.onOrderChanged(this.state.ordering);
        }
        this.setState({ draggingIndex: undefined });
    };
    ReorderableList.prototype.onDropAtTarget = function (targetIndex, e) {
        if (!this.isDragging) {
            return;
        }
        e.preventDefault();
        this.lastHoverIndex = undefined;
        this.setState({ draggingIndex: undefined });
    };
    ReorderableList.prototype.onDragEnterTarget = function (itemIndex, e) {
        if (!this.isDragging) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        var draggingIndex = this.state.draggingIndex;
        if (itemIndex !== this.lastHoverIndex && itemIndex !== draggingIndex) {
            this.lastHoverIndex = itemIndex;
            var ordering = this.state.ordering;
            var newOrdering = ordering.moveItemFromTo(ordering.getPosition(draggingIndex), ordering.getPosition(itemIndex));
            this.setState({ ordering: newOrdering });
        }
    };
    ReorderableList.prototype.onDragLeaveTarget = function (itemIndex) {
        if (!this.isDragging) {
            return;
        }
        this.lastHoverIndex = undefined;
    };
    return ReorderableList;
}(react_1.Component));
exports.ReorderableList = ReorderableList;
function getChildKey(child) {
    return typeof child === 'object' ? child.key : child;
}
exports.default = ReorderableList;
