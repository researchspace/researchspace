Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Draggable_1 = require("ory-editor-ui/lib/Toolbar/Draggable");
var Avatar_1 = require("material-ui/Avatar");
var ListItem_1 = require("material-ui/List/ListItem");
var rc_tooltip_1 = require("rc-tooltip");
exports.VisualisePluginBlacklist = ['metaphactory/content/resource'];
var Item = (function (_super) {
    tslib_1.__extends(Item, _super);
    function Item(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onMouseEnter = function () {
            _this.setState({ tooltipVisible: true });
        };
        _this.onMouseLeave = function () {
            _this.setState({ tooltipVisible: false });
        };
        _this.state = { tooltipVisible: false };
        return _this;
    }
    Item.prototype.render = function () {
        var _a = this.props, plugin = _a.plugin, insert = _a.insert;
        if (!plugin.IconComponent && !plugin.text
            || exports.VisualisePluginBlacklist.indexOf(plugin.name) !== -1) {
            return null;
        }
        var MyDraggable = Draggable_1.default(plugin.name);
        return React.createElement(ListItem_1.default, { leftIcon: React.createElement("span", { className: 'ory-toolbar-item-drag-handle-button', onMouseEnter: this.onMouseEnter, onMouseLeave: this.onMouseLeave, onMouseDown: this.onMouseLeave },
                React.createElement(MyDraggable, { insert: insert },
                    React.createElement(rc_tooltip_1.default, { visible: this.state.tooltipVisible, placement: 'bottomLeft', overlay: React.createElement("span", null, "Drag me!") },
                        React.createElement("div", { style: { display: 'flex', alignItems: 'center' } },
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
                                React.createElement("span", { className: 'draggable-gripper' }),
                                React.createElement("span", { className: 'draggable-gripper' })),
                            React.createElement(Avatar_1.default, { icon: plugin.IconComponent, className: 'ory-toolbar-item-drag-handle' }))))), primaryText: plugin.text, secondaryText: plugin.description, secondaryTextLines: 2, disabled: true, className: 'ory-toolbar-item' });
    };
    return Item;
}(React.Component));
exports.Item = Item;
