Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Maybe = require("data.maybe");
var immutable_1 = require("immutable");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var AssertionsStore_1 = require("./AssertionsStore");
var ArgumentsStore_1 = require("./ArgumentsStore");
var BaseArgumentComponent_1 = require("./BaseArgumentComponent");
var LoadArgumentComponent = (function (_super) {
    tslib_1.__extends(LoadArgumentComponent, _super);
    function LoadArgumentComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            initialState: Maybe.Nothing(),
        };
        return _this;
    }
    LoadArgumentComponent.prototype.componentDidMount = function () {
        var _this = this;
        var iri = rdf_1.Rdf.iri(this.props.assertionIri);
        AssertionsStore_1.loadAssertion(iri).onValue(function (_a) {
            var title = _a.title, note = _a.note, beliefs = _a.beliefs, narrative = _a.narrative, field = _a.field, target = _a.target;
            ArgumentsStore_1.loadArgumentsForAssertion(iri).onValue(function (args) {
                var assertedBeliefs = immutable_1.Map(beliefs.map(function (belief) { return [belief.targetValue, belief]; }));
                _this.setState({
                    initialState: Maybe.Just({
                        assertionIri: Maybe.Just(iri),
                        title: title,
                        description: note,
                        semanticNarrative: Maybe.fromNullable(narrative),
                        newArgumentType: Maybe.Nothing(),
                        field: Maybe.Just(field),
                        initialArguments: _.cloneDeep(args),
                        arguments: args,
                        beliefs: assertedBeliefs,
                        target: target,
                        addingSemanticNarrative: false,
                        addingPremise: false,
                        editingArgumentIndex: Maybe.Nothing(),
                    })
                });
            });
        });
    };
    LoadArgumentComponent.prototype.render = function () {
        var _this = this;
        return this.state.initialState.map(function (initialState) {
            return React.createElement(BaseArgumentComponent_1.BaseArgumentsComponent, tslib_1.__assign({}, _this.props, { initialState: initialState }));
        }).getOrElse(null);
    };
    return LoadArgumentComponent;
}(components_1.Component));
exports.LoadArgumentComponent = LoadArgumentComponent;
exports.default = LoadArgumentComponent;
