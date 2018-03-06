Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var navigation_1 = require("platform/api/navigation");
var NamespaceService = require("platform/api/services/namespace");
var DeletePrefixActionLink = (function (_super) {
    tslib_1.__extends(DeletePrefixActionLink, _super);
    function DeletePrefixActionLink() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            NamespaceService.deletePrefix(_this.props.prefix)
                .onValue(function (_) { return navigation_1.refresh(); })
                .onError(function (error) {
                alert(error);
            });
        };
        return _this;
    }
    DeletePrefixActionLink.prototype.render = function () {
        var prefix = this.props.prefix;
        if (!prefix || prefix[0] === prefix[0].toUpperCase()) {
            return null;
        }
        return react_1.DOM.a({
            onClick: this.onClick,
        }, this.props['children']);
    };
    return DeletePrefixActionLink;
}(react_1.Component));
exports.component = DeletePrefixActionLink;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
