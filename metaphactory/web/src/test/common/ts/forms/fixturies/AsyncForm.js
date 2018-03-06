Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var enzyme_1 = require("enzyme");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var AsyncForm = (function () {
    function AsyncForm(fields, children) {
        var _this = this;
        this.fields = fields;
        this.children = children;
        this.scheduledUpdate = null;
        this.runOnceOnUpdate = [];
        this.onChanged = function (model) {
            _this.model = model;
            if (_this.scheduledUpdate !== null) {
                clearImmediate(_this.scheduledUpdate);
            }
            _this.scheduledUpdate = setImmediate(_this.updateProps);
        };
        this.updateProps = function () {
            _this.wrapper.setProps(tslib_1.__assign({}, _this.props, { model: _this.model }));
        };
    }
    AsyncForm.prototype.mount = function (params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        return new Promise(function (resolve) {
            _this.props = {
                debug: true,
                fields: _this.fields,
                children: _this.children,
                model: params.model || forms_1.FieldValue.fromLabeled({ value: rdf_1.Rdf.literal('') }),
                onChanged: _this.onChanged,
                onLoaded: function (model) {
                    _this.model = model;
                    _this.wrapper.setProps(tslib_1.__assign({}, _this.props, { model: model }));
                    resolve(_this);
                },
                onUpdated: function (dataState) {
                    _this.dataState = dataState;
                    _this.invokeUpdateSubscribers();
                },
            };
            var element = react_1.createElement(forms_1.SemanticForm, _this.props);
            _this.wrapper = enzyme_1.mount(element);
            return _this;
        });
    };
    AsyncForm.prototype.invokeUpdateSubscribers = function () {
        for (var _i = 0, _a = this.runOnceOnUpdate; _i < _a.length; _i++) {
            var callback = _a[_i];
            try {
                callback();
            }
            catch (err) {
                console.error('Error while running form update subscription', err);
            }
        }
        this.runOnceOnUpdate = [];
    };
    AsyncForm.prototype.performChangeAndWaitUpdate = function (change) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.runOnceOnUpdate.push(function () { return resolve(_this); });
            change();
        });
    };
    return AsyncForm;
}());
exports.AsyncForm = AsyncForm;
