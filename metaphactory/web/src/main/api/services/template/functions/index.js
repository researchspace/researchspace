Object.defineProperty(exports, "__esModule", { value: true });
var DataContextFunctions_1 = require("./DataContextFunctions");
var GenericFunctions_1 = require("./GenericFunctions");
var DateTimeFunctions_1 = require("./DateTimeFunctions");
var RdfFunctions_1 = require("./RdfFunctions");
function registerHelperFunctions(scope) {
    DataContextFunctions_1.register(scope);
    GenericFunctions_1.register(scope);
    DateTimeFunctions_1.register(scope);
    RdfFunctions_1.register(scope);
}
exports.registerHelperFunctions = registerHelperFunctions;
var DataContextFunctions_2 = require("./DataContextFunctions");
exports.ContextCapturer = DataContextFunctions_2.ContextCapturer;
exports.CapturedContext = DataContextFunctions_2.CapturedContext;
