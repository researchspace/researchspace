function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var PlatformComponent_1 = require("./PlatformComponent");
exports.Component = PlatformComponent_1.PlatformComponent;
exports.ContextTypes = PlatformComponent_1.ContextTypes;
__export(require("./SemanticContext"));
var TemplateContext_1 = require("./TemplateContext");
exports.TemplateContextTypes = TemplateContext_1.TemplateContextTypes;
