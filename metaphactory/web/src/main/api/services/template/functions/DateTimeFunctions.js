Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
function register(scope) {
    scope.registerHelper('dateTimeFormat', function (dateTime, format) {
        if (typeof format !== 'string') {
            format = 'LL';
        }
        return moment(dateTime).format(format);
    });
}
exports.register = register;
