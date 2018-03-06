Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var module_loader_1 = require("platform/api/module-loader");
var TemplateItemComponent = (function (_super) {
    tslib_1.__extends(TemplateItemComponent, _super);
    function TemplateItemComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TemplateItemComponent.prototype.createdCallback = function () {
        var _this = this;
        module_loader_1.ModuleRegistry.parseHtmlToReact(this.innerHTML).then(function (res) {
            react_dom_1.render(react_1.createElement('div', {}, res), _this);
        });
    };
    TemplateItemComponent.prototype.detachedCallback = function () {
        react_dom_1.unmountComponentAtNode(this);
    };
    return TemplateItemComponent;
}(HTMLElement));
exports.TemplateItemComponent = TemplateItemComponent;
