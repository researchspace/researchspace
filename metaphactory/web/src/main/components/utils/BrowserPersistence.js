Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Basil = require("basil.js");
var Immutable = require("immutable");
var json_1 = require("platform/api/json");
var UNSUPPORTED_MSG = 'Local storage is not available. Data will be persisted to memory.';
var BrowserPersistenceClass = (function () {
    function BrowserPersistenceClass() {
        this.storage = new Basil({
            storages: ['local', 'memory'],
        });
        if (!this.storage.check('local')) {
            console.warn(UNSUPPORTED_MSG);
        }
        this.anyAdapter = this.createAdapter();
    }
    BrowserPersistenceClass.prototype.createAdapter = function () {
        var _this = this;
        var get = function (identifier) {
            var item = _this.getRawItem(identifier);
            return (typeof item === 'object' && item !== null) ? item : {};
        };
        var set = function (identifier, newState) {
            _this.setItem(identifier, newState);
        };
        var update = function (identifier, partialState) {
            set(identifier, tslib_1.__assign({}, get(identifier), partialState));
        };
        var remove = function (identifier) {
            _this.removeItem(identifier);
        };
        return { get: get, set: set, update: update, remove: remove };
    };
    BrowserPersistenceClass.prototype.getItem = function (identifier, namespace) {
        return Immutable.fromJS(this.getRawItem(identifier, namespace));
    };
    BrowserPersistenceClass.prototype.getRawItem = function (identifier, namespace) {
        var value = this.storage.get(identifier, { namespace: namespace });
        return json_1.deserialize(JSON.parse(value));
    };
    BrowserPersistenceClass.prototype.setItem = function (identifier, value, namespace) {
        this.storage.set(identifier, JSON.stringify(json_1.serialize(value)), { namespace: namespace });
    };
    BrowserPersistenceClass.prototype.removeItem = function (identifier, namespace) {
        this.storage.remove(identifier, { namespace: namespace });
    };
    BrowserPersistenceClass.prototype.adapter = function () {
        return this.anyAdapter;
    };
    return BrowserPersistenceClass;
}());
exports.BrowserPersistence = new BrowserPersistenceClass();
