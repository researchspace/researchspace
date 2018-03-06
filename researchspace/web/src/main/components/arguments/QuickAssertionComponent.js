Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var immutable_1 = require("immutable");
var Maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var cache_1 = require("platform/api/services/cache");
var AssertionsComponent_1 = require("./AssertionsComponent");
var AssertionsStore_1 = require("./AssertionsStore");
var FieldUtils_1 = require("./FieldUtils");
var QuickAssertionComponent = (function (_super) {
    tslib_1.__extends(QuickAssertionComponent, _super);
    function QuickAssertionComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onBeliefsChange = function (beliefs) { return _this.setState({ beliefs: beliefs }); };
        _this.saveAssertion = function (field) { return function () {
            var beliefs = _this.state.beliefs.valueSeq().toArray();
            var target = rdf_1.Rdf.iri(_this.props.target);
            AssertionsStore_1.saveAssertion({ iri: Maybe.Nothing(), field: field, target: target, title: 'New Image', note: '', beliefs: beliefs }).flatMap(function () { return cache_1.invalidateAllCaches(); }).onValue(function () { return window.location.reload(); });
        }; };
        _this.state = {
            beliefs: immutable_1.Map(),
            field: Maybe.Nothing(),
        };
        return _this;
    }
    QuickAssertionComponent.prototype.componentDidMount = function () {
        var _this = this;
        FieldUtils_1.getArgumentsFieldDefinition(rdf_1.Rdf.iri(this.props.fieldIri)).onValue(function (field) { return _this.setState({
            field: Maybe.Just(field)
        }); });
    };
    QuickAssertionComponent.prototype.render = function () {
        var _this = this;
        return this.state.field.map(function (field) {
            return React.createElement("div", null,
                React.createElement(AssertionsComponent_1.AssertionsComponent, tslib_1.__assign({}, _this.props, { field: field, target: rdf_1.Rdf.iri(_this.props.target), title: 'Assert new value', beliefs: _this.state.beliefs, onBeliefsChange: _this.onBeliefsChange, quickAssertion: true })),
                React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', className: 'pull-right', onClick: _this.saveAssertion(field) }, "Save"));
        }).getOrElse(null);
    };
    return QuickAssertionComponent;
}(React.Component));
exports.QuickAssertionComponent = QuickAssertionComponent;
exports.default = QuickAssertionComponent;
