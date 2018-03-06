Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var classNames = require("classnames");
var assign = require("object-assign");
var D = React.DOM;
var FloatingElementComponent = (function (_super) {
    tslib_1.__extends(FloatingElementComponent, _super);
    function FloatingElementComponent(props) {
        return _super.call(this, props) || this;
    }
    FloatingElementComponent.prototype.render = function () {
        return D.div(assign({}, this.props, {
            style: assign({}, this.props.style, {
                top: this.props.position.start.y,
                left: this.props.position.start.x,
                width: this.props.position.end.x - this.props.position.start.x,
            }),
            className: classNames(this.props.className, 'floating-element'),
        }), this.props.children);
    };
    return FloatingElementComponent;
}(React.Component));
exports.FloatingElementComponent = FloatingElementComponent;
exports.FloatingElement = React.createFactory(FloatingElementComponent);
exports.default = exports.FloatingElement;
