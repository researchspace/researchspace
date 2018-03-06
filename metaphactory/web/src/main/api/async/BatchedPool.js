Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var Immutable = require("immutable");
var DEFAULT_INTERVAL_MS = 20;
var DEFAULT_BATCH_SIZE = 100;
var BatchedPool = (function () {
    function BatchedPool(params) {
        var _this = this;
        var _a = params.batchSize, batchSize = _a === void 0 ? DEFAULT_BATCH_SIZE : _a, _b = params.delayIntervalMs, delayIntervalMs = _b === void 0 ? DEFAULT_INTERVAL_MS : _b;
        var stream = Kefir.stream(function (emitter) { _this.emitter = emitter; });
        this.bufferedStream = stream
            .bufferWithTimeOrCount(delayIntervalMs, batchSize)
            .filter(function (inputs) { return inputs.length > 0; })
            .flatMap(function (inputArray) {
            var inputs = Immutable.Set(inputArray);
            return params.fetch(inputs)
                .map(function (batch) { return ({ inputs: inputs, batch: batch }); })
                .flatMapErrors(function (error) { return Kefir.constant({ inputs: inputs, error: error }); });
        })
            .onEnd(function () { });
    }
    BatchedPool.prototype.query = function (input) {
        this.emitter.emit(input);
        return this.bufferedStream
            .filter(function (result) { return result.inputs.has(input); })
            .flatMap(function (result) {
            if (result.batch) {
                return Kefir.constant(result.batch.get(input));
            }
            else {
                return Kefir.constantError(result.error);
            }
        }).take(1).takeErrors(1).toProperty();
    };
    return BatchedPool;
}());
exports.BatchedPool = BatchedPool;
