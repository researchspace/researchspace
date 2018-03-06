Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
function Action(initalValue) {
    var pool = Kefir.pool();
    var fn = function (args) {
        pool.plug(Kefir.constant(args));
    };
    if (initalValue) {
        fn(initalValue);
    }
    fn.$property = pool.toProperty();
    return fn;
}
exports.Action = Action;
