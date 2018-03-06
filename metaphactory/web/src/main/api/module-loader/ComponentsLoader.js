Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var ComponentsStore_1 = require("./ComponentsStore");
var ComponentLoader = (function (_super) {
    tslib_1.__extends(ComponentLoader, _super);
    function ComponentLoader(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            component: maybe.Nothing(),
        };
        return _this;
    }
    ComponentLoader.prototype.componentDidMount = function () {
        var _this = this;
        ComponentsStore_1.loadComponent(this.props.componentTagName).then(function (component) {
            return _this.setState({
                component: maybe.Just(component),
            });
        });
    };
    ComponentLoader.prototype.render = function () {
        var _this = this;
        return this.state.component.map(function (component) { return react_1.createElement(component, _this.props.componentProps, _this.props.children); }).getOrElse(null);
    };
    return ComponentLoader;
}(react_1.Component));
exports.component = ComponentLoader;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
