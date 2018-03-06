Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var utils_1 = require("platform/components/utils");
var assign = require("object-assign");
var ToggleVisibility = (function (_super) {
    tslib_1.__extends(ToggleVisibility, _super);
    function ToggleVisibility(props) {
        var _this = _super.call(this, props) || this;
        _this.toggleHidden = function () {
            _this.setState({ childIsHidden: !_this.state.childIsHidden });
        };
        _this.mapChildren = function (children, callback, isHidden) {
            return React.Children.map(children, function (element) {
                if (!utils_1.isValidChild(element)) {
                    return element;
                }
                var type = element.type, props = element.props;
                if (type === 'div' && 'toggleable' in props) {
                    var child = React.Children.only(element.props.children);
                    return React.cloneElement(child, isHidden ?
                        { className: 'hidden ' + child.props.className } : {}, child.props.children);
                }
                else if (type === 'div' && 'toggler' in props) {
                    var child = React.Children.only(element.props.children);
                    return React.cloneElement.apply(React, [child,
                        assign({}, child.props, {
                            onClick: callback,
                        })].concat(child.props.children));
                }
                if ('children' in props) {
                    return React.cloneElement(element, { children: _this.mapChildren(props.children, callback, isHidden) });
                }
                return element;
            });
        };
        _this.state = {
            childIsHidden: true,
        };
        return _this;
    }
    ToggleVisibility.prototype.render = function () {
        return React.createElement("div", null, this.mapChildren(this.props.children, this.toggleHidden, this.state.childIsHidden));
    };
    return ToggleVisibility;
}(React.Component));
exports.c = ToggleVisibility;
exports.f = React.createFactory(exports.c);
exports.default = exports.c;
