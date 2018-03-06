Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var docson_1 = require("docson");
var _ = require("lodash");
var core_lambda_1 = require("core.lambda");
require("docson/css/docson.css");
require("./ConfigDocComponent.scss");
var box = require('raw-loader!./templates/box.html');
var signature = require('raw-loader!./templates/signature.html');
var ConfigDocComponent = (function (_super) {
    tslib_1.__extends(ConfigDocComponent, _super);
    function ConfigDocComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.renderDocson = function (jsonSchema) {
            docson_1.doc(_this.container, _this.handleProperties(jsonSchema), { box: box, signature: signature });
        };
        _this.transformPropertyName = function (fn) { return function (json) {
            json.properties = _.mapKeys(json.properties, function (val, key) { return fn(key); });
            json.required = _.map(json.required, fn);
            json.propertyOrder = _.map(json.propertyOrder, fn);
            if (json.anyOf) {
                _.forEach(json.anyOf, function (_a) {
                    var $ref = _a.$ref;
                    var refName = _.last(_.split($ref, '/'));
                    json.definitions[refName] = _this.transformPropertyName(fn)(json.definitions[refName]);
                });
            }
            return json;
        }; };
        _this.transformPropertyValue = function (fn) { return function (json) {
            json.properties = _.mapValues(json.properties, function (val, key) { return fn(key, val); });
            if (json.anyOf) {
                _.forEach(json.anyOf, function (_a) {
                    var $ref = _a.$ref;
                    var refName = _.last(_.split($ref, '/'));
                    json.definitions[refName] = _this.transformPropertyValue(fn)(json.definitions[refName]);
                });
            }
            return json;
        }; };
        _this.handleClassNameProperty = function (key) {
            return key === 'className' ? 'class' : key;
        };
        _this.handleStyleValue = function (key, value) {
            if (key === 'style' && value.$ref === '#/definitions/React.CSSProperties') {
                delete value.$ref;
                value.type = 'string';
            }
            return value;
        };
        _this.transformJsonToHtmlAttributes = _this.transformPropertyName(_.kebabCase);
        _this.transformClassNameAttribute = _this.transformPropertyName(_this.handleClassNameProperty);
        _this.transformStyleAttribute = _this.transformPropertyValue(_this.handleStyleValue);
        _this.handleProperties = _.reduce([
            _this.transformJsonToHtmlAttributes, _this.transformClassNameAttribute,
            _this.transformStyleAttribute,
        ], function (a, b) { return core_lambda_1.compose(a)(b); });
        return _this;
    }
    ConfigDocComponent.prototype.componentDidMount = function () {
        this.renderDocson(require('../../../../schemas/' + this.props.type + '.json'));
    };
    ConfigDocComponent.prototype.render = function () {
        var _this = this;
        return react_1.DOM.div({}, react_1.DOM.div({ ref: function (container) { return _this.container = container; } }), react_1.DOM.span({ className: 'typingsRequiredLabel' }, '* - required'));
    };
    return ConfigDocComponent;
}(react_1.Component));
exports.default = ConfigDocComponent;
