Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var Maybe = require("data.maybe");
var react_bootstrap_1 = require("react-bootstrap");
var ReactSelect = require("react-select");
var sparql_1 = require("platform/api/sparql");
var ArgumentsApi_1 = require("./ArgumentsApi");
var BeliefSelection_1 = require("./BeliefSelection");
var ExistingBeliefView_1 = require("./ExistingBeliefView");
var InferenceMakingComponent = (function (_super) {
    tslib_1.__extends(InferenceMakingComponent, _super);
    function InferenceMakingComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.logicTypeSelector = function () {
            var logics = _this.state.logics;
            var selected = _this.state.logicType ?
                _.find(logics, function (option) { return option.value.equals(_this.state.logicType); }) : null;
            return React.createElement(ReactSelect, { placeholder: 'Select logic type...', options: logics, value: selected, onChange: _this.onLogicChange, clearable: false });
        };
        _this.newPremise = function () {
            var messages = {
                beliefHeader: 'Assertion based evidence',
                dropRecordPlaceholder: 'You can drag and drop items from Clipboard here, to add a resource for use as evidence',
                fieldSelectionHeader: 'Field based evidence',
                fieldSelectionPlaceholder: 'Select fields for evidence...',
            };
            return React.createElement(BeliefSelection_1.BeliefSelection, { multiSelection: true, subject: _this.props.subject, messages: messages, acceptRecordQuery: _this.props.acceptEvidenceQuery, onSelect: _this.savePremise });
        };
        _this.onTitleChange = function (event) {
            return _this.setState({ title: event.target.value });
        };
        _this.onNoteChange = function (event) {
            return _this.setState({ note: event.target.value });
        };
        _this.onLogicChange = function (selected) {
            return _this.setState({ logicType: selected.value });
        };
        _this.savePremise = function (beliefs) {
            return _this.setState(function (state) { return ({
                premises: state.premises.concat(beliefs),
                addingNewPremise: false,
            }); });
        };
        _this.removePremise = function (premise) {
            return _this.setState(function (state) {
                _.remove(state.premises, function (p) { return p === premise; });
                return { premises: state.premises };
            });
        };
        _this.saveArgument = function () {
            _this.props.onSave({
                iri: _this.state.iri,
                argumentType: ArgumentsApi_1.InferenceType,
                logicType: _this.state.logicType,
                title: _this.state.title,
                note: _this.state.note,
                premises: _this.state.premises,
            });
        };
        _this.canSave = function () {
            var _a = _this.state, logicType = _a.logicType, title = _a.title, premises = _a.premises;
            return logicType
                && !_.isEmpty(title)
                && !_.isEmpty(premises);
        };
        if (props.initialState) {
            _this.state = props.initialState;
        }
        else {
            _this.state = {
                iri: Maybe.Nothing(),
                title: '',
                note: '',
                logicType: undefined,
                premises: [],
                logics: [],
            };
        }
        return _this;
    }
    InferenceMakingComponent.prototype.componentDidMount = function () {
        var _this = this;
        sparql_1.SparqlClient.select(this.props.logicTypeQuery).onValue(function (res) {
            var logics = res.results.bindings.map(function (binding) { return ({ value: binding['logic'], label: binding['label'].value }); });
            _this.setState({ logics: logics });
        });
    };
    InferenceMakingComponent.prototype.render = function () {
        var _this = this;
        var premises = this.state.premises;
        return React.createElement(react_bootstrap_1.Panel, { header: 'Premise based on logical inference' },
            React.createElement(react_bootstrap_1.Form, { horizontal: true },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Title*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { type: 'text', placeholder: 'Premise title...', value: this.state.title, onChange: this.onTitleChange }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Description"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { componentClass: 'textarea', placeholder: 'Premise description...', value: this.state.note, onChange: this.onNoteChange }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Logic Type*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 }, this.logicTypeSelector())),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Evidences"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        premises.map(function (premise) { return React.createElement(ExistingBeliefView_1.ExistingBeliefView, { belief: premise, onCancel: function () { return _this.removePremise(premise); } }); }),
                        this.newPremise())),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 },
                        React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pull-right' },
                            React.createElement(react_bootstrap_1.Button, { bsStyle: 'danger', onClick: this.props.onCancel }, "Cancel"),
                            React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', style: { marginLeft: '12px' }, onClick: this.saveArgument, disabled: !this.canSave() }, "Save"))))));
    };
    return InferenceMakingComponent;
}(React.Component));
exports.InferenceMakingComponent = InferenceMakingComponent;
