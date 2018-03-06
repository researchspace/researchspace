Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var events_1 = require("platform/api/events");
var TemplateService = require("platform/api/services/template");
var SemanticContext_1 = require("./SemanticContext");
var TemplateContext_1 = require("./TemplateContext");
exports.ContextTypes = tslib_1.__assign({}, SemanticContext_1.SemanticContextTypes, TemplateContext_1.TemplateContextTypes, events_1.GlobalEventsContextTypes);
var PlatformComponent = (function (_super) {
    tslib_1.__extends(PlatformComponent, _super);
    function PlatformComponent(props, context) {
        return _super.call(this, props, context) || this;
    }
    Object.defineProperty(PlatformComponent.prototype, "appliedTemplateScope", {
        get: function () {
            var markupTemplateScope = this.props.markupTemplateScope;
            if (markupTemplateScope) {
                return markupTemplateScope.getOrElse(TemplateService.TemplateScope.default);
            }
            var inheritedScope = this.context.templateScope;
            return inheritedScope || TemplateService.TemplateScope.default;
        },
        enumerable: true,
        configurable: true
    });
    PlatformComponent.prototype.getChildContext = function () {
        return {
            templateScope: this.props.markupTemplateScope
                ? this.props.markupTemplateScope.getOrElse(undefined)
                : this.context.templateScope,
        };
    };
    return PlatformComponent;
}(react_1.Component));
PlatformComponent.propTypes = {
    markupTemplateScope: react_1.PropTypes.object,
};
PlatformComponent.childContextTypes = TemplateContext_1.TemplateContextTypes;
PlatformComponent.contextTypes = exports.ContextTypes;
exports.PlatformComponent = PlatformComponent;
