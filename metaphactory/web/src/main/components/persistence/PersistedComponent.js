Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var module_loader_1 = require("platform/api/module-loader");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var ComponentPersistence_1 = require("platform/api/persistence/ComponentPersistence");
var Spinner_1 = require("platform/components/ui/spinner/Spinner");
var PersistedComponent = (function (_super) {
    tslib_1.__extends(PersistedComponent, _super);
    function PersistedComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = { component: undefined };
        return _this;
    }
    PersistedComponent.prototype.prepareComponent = function (iri) {
        var _this = this;
        ldp_1.ldpc(vocabularies_1.VocabPlatform.PersistedComponentContainer.value).get(rdf_1.Rdf.iri(iri)).flatMap(function (graph) {
            var _a = ComponentPersistence_1.graphToComponent(graph), componentType = _a.componentType, componentProps = _a.componentProps;
            return Kefir.fromPromise(module_loader_1.ModuleRegistry.renderWebComponent(componentType, componentProps));
        }).onValue(function (component) {
            _this.setState({ component: component });
        });
    };
    PersistedComponent.prototype.componentDidMount = function () {
        this.prepareComponent(this.props.iri);
    };
    PersistedComponent.prototype.componentWillReceiveProps = function (props) {
        this.prepareComponent(props.iri);
    };
    PersistedComponent.prototype.render = function () {
        return this.state.component ? this.state.component : Spinner_1.Spinner();
    };
    return PersistedComponent;
}(components_1.Component));
exports.PersistedComponent = PersistedComponent;
exports.default = PersistedComponent;
