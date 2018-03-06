Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var Immutable = require("immutable");
var Cancellation = (function () {
    function Cancellation() {
        this.isCancelled = false;
        this.cancelHandlers = [];
    }
    Cancellation.prototype.map = function (observable) {
        if (this.isCancelled) {
            return Kefir.never().toProperty();
        }
        var _a = subscribe(observable), mapped = _a.observable, dispose = _a.dispose;
        this.onCancel(dispose);
        return mapped.toProperty();
    };
    Cancellation.prototype.derive = function () {
        var derived = new Cancellation();
        if (!this.isCancelled) {
            this.onCancel(function () { return derived.cancelAll(); });
        }
        return derived;
    };
    Cancellation.prototype.deriveAndCancel = function (previous) {
        previous.cancelAll();
        return this.derive();
    };
    Cancellation.prototype.onCancel = function (handler) {
        if (this.isCancelled) {
            handler();
        }
        else {
            this.cancelHandlers.push(handler);
        }
    };
    Cancellation.prototype.cancelAll = function () {
        if (this.isCancelled) {
            return;
        }
        this.isCancelled = true;
        for (var _i = 0, _a = this.cancelHandlers; _i < _a.length; _i++) {
            var onCancel = _a[_i];
            onCancel();
        }
        this.cancelHandlers = undefined;
    };
    Cancellation.prototype.cache = function (update, shouldUpdate) {
        return new Cache(update, this, shouldUpdate);
    };
    return Cancellation;
}());
Cancellation.cancelled = new Cancellation();
exports.Cancellation = Cancellation;
function subscribe(source) {
    if (!source) {
        throw new Error('source observable must be present');
    }
    var disposed = false;
    var subscription;
    var dispose = function () {
        if (disposed) {
            return;
        }
        disposed = true;
        if (subscription) {
            subscription.unsubscribe();
        }
    };
    var observable = Kefir.stream(function (emitter) {
        if (disposed) {
            emitter.end();
        }
        else {
            subscription = source.observe({
                value: function (value) { return emitter.emit(value); },
                error: function (error) { return emitter.error(error); },
                end: function () { return emitter.end(); },
            });
        }
        return dispose;
    });
    return { observable: observable, dispose: dispose };
}
Cancellation.cancelled.cancelAll();
var Cache = (function () {
    function Cache(update, parentCancellation, shouldUpdate) {
        this.update = update;
        this.parentCancellation = parentCancellation;
        this.shouldUpdate = shouldUpdate;
        this.hasLastInput = false;
        this._cancellation = this.createCancellation();
        if (!this.shouldUpdate) {
            this.shouldUpdate = function (input, last) { return !Immutable.is(input, last); };
        }
    }
    Object.defineProperty(Cache.prototype, "cancellation", {
        get: function () { return this._cancellation; },
        enumerable: true,
        configurable: true
    });
    Cache.prototype.createCancellation = function () {
        return this.parentCancellation
            ? this.parentCancellation.derive() : new Cancellation();
    };
    Cache.prototype.compute = function (input, force) {
        var _this = this;
        if (force === void 0) { force = false; }
        if (!this.hasLastInput || this.shouldUpdate(input, this.lastInput) || force) {
            this._cancellation.cancelAll();
            this._cancellation = this.createCancellation();
            this._cancellation.onCancel(function () {
                _this.lastInput = undefined;
                _this.hasLastInput = false;
            });
            this.hasLastInput = true;
            this.lastInput = input;
            var observable = this.update(input, this.cancellation);
            return this.cancellation.map(observable);
        }
        else {
            this.lastInput = input;
            return Kefir.never().toProperty();
        }
    };
    Cache.prototype.cancel = function () {
        this.cancellation.cancelAll();
    };
    return Cache;
}());
exports.Cache = Cache;
