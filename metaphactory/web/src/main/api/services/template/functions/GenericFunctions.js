Object.defineProperty(exports, "__esModule", { value: true });
function checkCondition(v1, operator, v2) {
    switch (operator) {
        case '==':
            return (v1 == v2);
        case '===':
            return (v1 === v2);
        case '!==':
            return (v1 !== v2);
        case '<':
            return (v1 < v2);
        case '<=':
            return (v1 <= v2);
        case '>':
            return (v1 > v2);
        case '>=':
            return (v1 >= v2);
        case '&&':
            return (v1 && v2);
        case '||':
            return (v1 || v2);
        default:
            return false;
    }
}
function register(scope) {
    scope.registerHelper('ifCond', function (v1, operator, v2, options) {
        return checkCondition(v1, operator, v2)
            ? options.fn(this)
            : options.inverse(this);
    });
    scope.registerHelper('raw', function (options) {
        return options.fn(this);
    });
}
exports.register = register;
