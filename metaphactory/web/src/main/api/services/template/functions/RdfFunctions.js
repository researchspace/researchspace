Object.defineProperty(exports, "__esModule", { value: true });
function register(scope) {
    scope.registerHelper('isIri', function (value) {
        return value.isIri();
    });
    scope.registerHelper('isBnode', function (value) {
        return value.isBnode();
    });
    scope.registerHelper('isLiteral', function (value) {
        return value.isLiteral();
    });
}
exports.register = register;
