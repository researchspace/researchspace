Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
exports.AssertedBeliefTypeKind = 'AssertedBelief';
exports.ObservationType = 'Observation';
exports.BeliefAdoptionType = 'BeliefAdoption';
exports.InferenceType = 'Inference';
exports.BeliefTypeArgumentsKind = 'ArgumentsBelief';
exports.ArgumentsBeliefTypeAssertionKind = 'AssertionBelief';
exports.ArgumentsBeliefTypeFieldKind = 'FieldBelief';
exports.ArgumentsContextTypes = {
    changeBelief: react_1.PropTypes.any.isRequired,
    getBeliefValue: react_1.PropTypes.any.isRequired,
    removeBelief: react_1.PropTypes.any.isRequired,
};
function matchBelief(matcher) {
    return function (belief) {
        switch (belief.beliefType) {
            case exports.AssertedBeliefTypeKind: return matcher[belief.beliefType](belief);
            case exports.BeliefTypeArgumentsKind: return matcher[belief.beliefType](belief);
        }
    };
}
exports.matchBelief = matchBelief;
function matchArgument(matcher) {
    return function (argument) {
        switch (argument.argumentType) {
            case exports.InferenceType: return matcher[argument.argumentType](argument);
            case exports.ObservationType: return matcher[argument.argumentType](argument);
            case exports.BeliefAdoptionType: return matcher[argument.argumentType](argument);
        }
    };
}
exports.matchArgument = matchArgument;
function matchArgumentsBelief(matcher) {
    return function (belief) {
        switch (belief.argumentBeliefType) {
            case exports.ArgumentsBeliefTypeAssertionKind: return matcher[belief.argumentBeliefType](belief);
            case exports.ArgumentsBeliefTypeFieldKind: return matcher[belief.argumentBeliefType](belief);
        }
    };
}
exports.matchArgumentsBelief = matchArgumentsBelief;
