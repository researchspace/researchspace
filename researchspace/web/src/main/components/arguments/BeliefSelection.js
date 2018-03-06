Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Maybe = require("data.maybe");
var _ = require("lodash");
var Kefir = require("kefir");
var react_bootstrap_1 = require("react-bootstrap");
var sparql_1 = require("platform/api/sparql");
var overlay_1 = require("platform/components/ui/overlay");
var repository_1 = require("platform/api/services/repository");
var components_1 = require("platform/api/navigation/components");
var DropArea_1 = require("platform/components/dnd/DropArea");
var vocabularies_1 = require("researchspace/data/vocabularies/vocabularies");
var FieldSelection_1 = require("./FieldSelection");
var ArgumentsApi_1 = require("./ArgumentsApi");
var BeliefSelection = (function (_super) {
    tslib_1.__extends(BeliefSelection, _super);
    function BeliefSelection(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.recordDropArea = function () {
            return React.createElement(DropArea_1.DropArea, { alwaysVisible: true, query: _this.props.acceptRecordQuery, repository: 'assets', onDrop: _this.onRecordDrop, dropMessage: _this.props.messages.dropRecordPlaceholder });
        };
        _this.viewBelief = function (belief) {
            if (belief.argumentsBeliefType === ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind) {
                return null;
            }
            else {
                return React.createElement("p", null, "Selecting field...");
            }
        };
        _this.fieldSelection = function (belief) {
            var _a = _this.props, subject = _a.subject, messages = _a.messages, multiSelection = _a.multiSelection;
            return React.createElement(react_bootstrap_1.Form, { horizontal: true },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Fields:"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(FieldSelection_1.FieldSelection, { multiSelection: multiSelection, subject: subject, record: belief.record, types: belief.types, placeholder: messages.fieldSelectionPlaceholder, onCancel: _this.onCancelBelief, onSave: _this.onFieldSelection }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 },
                        React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pull-right' },
                            React.createElement(react_bootstrap_1.Button, { onClick: _this.onCancelBelief, bsStyle: 'danger' }, "Cancel"),
                            React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', style: { marginLeft: '12px' }, onClick: function () { return _this.onSelectBelief(_this.state.belief.get()); } }, "Save")))));
        };
        _this.onRecordDrop = function (resource) {
            return _this.getTypes(resource).onValue(function (types) {
                var isAssertion = _.some(types, function (t) { return vocabularies_1.rso.EX_Assertion.equals(t); });
                var belief = {
                    beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
                    argumentsBeliefType: (isAssertion ? ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind : ArgumentsApi_1.ArgumentsBeliefTypeFieldKind),
                    assertion: resource,
                    record: resource,
                    types: types,
                    selectedFields: [],
                };
                _this.setState({
                    belief: Maybe.Just(belief),
                });
                if (!isAssertion) {
                    overlay_1.getOverlaySystem().show('field-selection-overlay', React.createElement(overlay_1.OverlayDialog, { onHide: _this.onCancelBelief, title: 'Field Selection', type: 'modal', show: true },
                        React.createElement("p", null,
                            "Select Field for ",
                            React.createElement(components_1.ResourceLinkComponent, { uri: resource.value }),
                            ":"),
                        _this.fieldSelection(belief)));
                }
                else {
                    _this.onSelectBelief(belief);
                }
            });
        };
        _this.onFieldSelection = function (selected) {
            var normalizedSelected = _this.props.multiSelection ? selected : [selected];
            _this.setState(function (state) { return ({
                belief: state.belief.map(function (belief) { return (tslib_1.__assign({}, belief, { selectedFields: normalizedSelected })); }),
            }); });
        };
        _this.hideFieldSelectionDialog = function () {
            return overlay_1.getOverlaySystem().hide('field-selection-overlay');
        };
        _this.onSelectBelief = function (belief) {
            _this.hideFieldSelectionDialog();
            var finalBeliefs = [];
            switch (belief.argumentsBeliefType) {
                case ArgumentsApi_1.ArgumentsBeliefTypeFieldKind:
                    var beliefs = _.map(belief.selectedFields, function (field) { return ({
                        iri: Maybe.Nothing(),
                        beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
                        argumentBeliefType: ArgumentsApi_1.ArgumentsBeliefTypeFieldKind,
                        target: belief.record,
                        field: field,
                        originRepository: 'default',
                        belief: {
                            type: 'simple',
                            value: 'Agree',
                        }
                    }); });
                    finalBeliefs.push.apply(finalBeliefs, beliefs);
                    break;
                case ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind:
                    var b = {
                        iri: Maybe.Nothing(),
                        beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
                        argumentBeliefType: ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind,
                        assertion: belief.assertion,
                        belief: {
                            type: 'simple',
                            value: 'Agree',
                        }
                    };
                    finalBeliefs.push(b);
                    break;
            }
            _this.setState({ belief: Maybe.Nothing() });
            _this.props.onSelect(finalBeliefs);
        };
        _this.onCancelBelief = function () {
            _this.hideFieldSelectionDialog();
            _this.setState({ belief: Maybe.Nothing() });
        };
        _this.repositories = repository_1.getRepositoryStatus().map(function (repos) { return repos.keySeq().toArray(); });
        _this.TYPES_QUERY = (_a = ["SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }"], _a.raw = ["SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }"], sparql_1.SparqlUtil.Sparql(_a));
        _this.getTypes = function (resource) { return _this.repositories.flatMap(function (repos) { return Kefir.combine(repos.map(function (r) { return _this.getTypesFromRepository(r, resource); })); }).map(_.flatten)
            .map(function (types) { return _.uniqWith(types, function (a, b) { return a.equals(b); }); }); };
        _this.getTypesFromRepository = function (repository, resource) {
            return sparql_1.SparqlClient.select(sparql_1.SparqlClient.setBindings(_this.TYPES_QUERY, { '__resource__': resource }), { context: { repository: repository } }).map(function (result) { return result.results.bindings.map(function (binding) { return binding['type']; }); });
        };
        _this.state = {
            belief: Maybe.Nothing(),
        };
        return _this;
        var _a;
    }
    BeliefSelection.prototype.render = function () {
        return this.state.belief.map(this.viewBelief).getOrElse(this.recordDropArea());
    };
    return BeliefSelection;
}(React.Component));
exports.BeliefSelection = BeliefSelection;
