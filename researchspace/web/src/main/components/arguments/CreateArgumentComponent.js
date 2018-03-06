Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Maybe = require("data.maybe");
var immutable_1 = require("immutable");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var AssertionsComponent_1 = require("./AssertionsComponent");
var FieldUtils_1 = require("./FieldUtils");
var BaseArgumentComponent_1 = require("./BaseArgumentComponent");
var CreateArgumentsComponent = (function (_super) {
    tslib_1.__extends(CreateArgumentsComponent, _super);
    function CreateArgumentsComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            initialState: Maybe.Nothing(),
        };
        return _this;
    }
    CreateArgumentsComponent.prototype.componentDidMount = function () {
        var _this = this;
        FieldUtils_1.getArgumentsFieldDefinition(rdf_1.Rdf.iri(this.props.fieldIri)).onValue(function (field) { return _this.setState({
            initialState: Maybe.Just({
                assertionIri: Maybe.Nothing(),
                title: '',
                description: '',
                semanticNarrative: Maybe.Nothing(),
                newArgumentType: Maybe.Nothing(),
                arguments: [],
                initialArguments: [],
                target: rdf_1.Rdf.iri(_this.props.target),
                field: Maybe.Just(field),
                beliefs: _this.createInitialBeliefs(field, _this.props),
                addingSemanticNarrative: false,
                addingPremise: false,
                editingArgumentIndex: Maybe.Nothing(),
            })
        }); });
    };
    CreateArgumentsComponent.prototype.createInitialBeliefs = function (field, props) {
        var subject = rdf_1.Rdf.iri(props.target);
        if (props.agreeWithValue) {
            var value = AssertionsComponent_1.AssertionsComponent.deserializeBeliefValue(field, props.agreeWithValue);
            var belief = AssertionsComponent_1.AssertionsComponent.getDefaultBelief(subject, field, value, true, 'default');
            belief.belief.value = 'Agree';
            return immutable_1.Map([[value, belief]]);
        }
        else if (props.disagreeWithValue) {
            var value = AssertionsComponent_1.AssertionsComponent.deserializeBeliefValue(field, props.disagreeWithValue);
            var belief = AssertionsComponent_1.AssertionsComponent.getDefaultBelief(subject, field, value, true, 'default');
            belief.belief.value = 'Disagree';
            return immutable_1.Map([[value, belief]]);
        }
        else {
            return immutable_1.Map();
        }
    };
    CreateArgumentsComponent.prototype.render = function () {
        var _this = this;
        return this.state.initialState.map(function (initialState) {
            return React.createElement(BaseArgumentComponent_1.BaseArgumentsComponent, tslib_1.__assign({}, _this.props, { initialState: initialState }));
        }).getOrElse(null);
    };
    return CreateArgumentsComponent;
}(components_1.Component));
exports.CreateArgumentsComponent = CreateArgumentsComponent;
exports.default = CreateArgumentsComponent;
