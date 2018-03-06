Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var react_1 = require("react");
var maybe = require("data.maybe");
var CytoscapeCore = require("cytoscape/src/core/index");
var Context_1 = require("./Context");
function registerCytoscapeExtension(_a) {
    var name = _a.name, registrationFn = _a.registrationFn, initializationFn = _a.initializationFn;
    return _b = (function (_super) {
            tslib_1.__extends(CytoscapeExtensionComponent, _super);
            function CytoscapeExtensionComponent(props, context) {
                var _this = _super.call(this, props, context) || this;
                _this.onCytoscapeReady = function (api, options) { return function (event) {
                    var extensionContext = { options: options, cytoscapeApi: api };
                    _this.setState({
                        instance: initializationFn(extensionContext),
                    });
                }; };
                _this.state = {
                    instance: maybe.Nothing(),
                };
                return _this;
            }
            CytoscapeExtensionComponent.prototype.componentDidMount = function () {
                this.registerExtension(this.props, this.context.cytoscapeApi);
            };
            CytoscapeExtensionComponent.prototype.componentWillUnmount = function () {
                var _this = this;
                this.state.instance.map(function (instance) {
                    var isCyInstance = _this.context.cytoscapeApi.instance.map(function (cy) { return cy === instance; }).getOrElse(false);
                    if (!isCyInstance && instance.destroy) {
                        instance.destroy();
                    }
                });
            };
            CytoscapeExtensionComponent.prototype.registerExtension = function (props, cytoscapeApi) {
                var _this = this;
                var instance = cytoscapeApi.instance;
                if (!CytoscapeCore.prototype[name]) {
                    registrationFn(cytoscapeApi);
                }
                instance.map(function (cy) {
                    var api = lodash_1.assign({}, cytoscapeApi, { instance: cy });
                    cy.ready(_this.onCytoscapeReady(api, props));
                });
            };
            CytoscapeExtensionComponent.prototype.render = function () {
                return null;
            };
            return CytoscapeExtensionComponent;
        }(react_1.Component)),
        _b.contextTypes = Context_1.CytoscapeContextTypes,
        _b;
    var _b;
}
exports.registerCytoscapeExtension = registerCytoscapeExtension;
exports.default = registerCytoscapeExtension;
