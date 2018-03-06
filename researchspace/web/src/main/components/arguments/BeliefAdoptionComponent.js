Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var Maybe = require("data.maybe");
var react_bootstrap_1 = require("react-bootstrap");
var ArgumentsApi_1 = require("./ArgumentsApi");
var BeliefSelection_1 = require("./BeliefSelection");
var ExistingBeliefView_1 = require("./ExistingBeliefView");
var BeliefAdoptionComponent = (function (_super) {
    tslib_1.__extends(BeliefAdoptionComponent, _super);
    function BeliefAdoptionComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderBelief = function () {
            var belief = _this.state.belief;
            if (belief) {
                return ExistingBeliefView_1.ExistingBeliefContentView(_this.state.belief).concat([
                    React.createElement(react_bootstrap_1.FormGroup, null,
                        React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 },
                            React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pull-right' },
                                React.createElement(react_bootstrap_1.Button, { onClick: _this.props.onCancel, bsStyle: 'danger' }, "Cancel"),
                                React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', onClick: function () { return _this.onSelectBelief(_this.state.belief); } }, "Select"))))
                ]);
            }
            else {
                return [
                    React.createElement(react_bootstrap_1.FormGroup, null,
                        React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 }, _this.newBelief())),
                    React.createElement(react_bootstrap_1.FormGroup, null,
                        React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 },
                            React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pull-right' },
                                React.createElement(react_bootstrap_1.Button, { onClick: _this.props.onCancel, bsStyle: 'danger' }, "Cancel"))))
                ];
            }
        };
        _this.newBelief = function () {
            var messages = {
                beliefHeader: 'Belief adoption',
                dropRecordPlaceholder: 'You can drag and drop items from Clipboard here, to adopt the belief for the record...',
                fieldSelectionHeader: 'Field based belief adoption',
                fieldSelectionPlaceholder: 'Select fields to adopt...',
            };
            return React.createElement(BeliefSelection_1.BeliefSelection, { multiSelection: false, subject: _this.props.subject, messages: messages, acceptRecordQuery: _this.props.acceptRecordQuery, onSelect: _this.onFieldsSelection });
        };
        _this.onFieldsSelection = function (beliefs) {
            _this.setState({ belief: _.head(beliefs) });
        };
        _this.onSelectBelief = function (belief) {
            _this.props.onSave({
                iri: _this.state.iri,
                argumentType: ArgumentsApi_1.BeliefAdoptionType,
                title: _this.state.title,
                note: _this.state.note,
                belief: belief,
            });
        };
        _this.onTitleChange = function (event) {
            return _this.setState({ title: event.target.value });
        };
        _this.onNoteChange = function (event) {
            return _this.setState({ note: event.target.value });
        };
        if (props.initialState) {
            _this.state = props.initialState;
        }
        else {
            _this.state = {
                iri: Maybe.Nothing(),
                title: '',
                note: '',
                belief: undefined,
            };
        }
        return _this;
    }
    BeliefAdoptionComponent.prototype.render = function () {
        return React.createElement(react_bootstrap_1.Panel, { header: 'Premise based on belief adoption' },
            React.createElement(react_bootstrap_1.Form, { horizontal: true },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Title*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { type: 'text', placeholder: 'Premise title...', value: this.state.title, onChange: this.onTitleChange }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Description"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { componentClass: 'textarea', placeholder: 'Premise description...', value: this.state.note, onChange: this.onNoteChange }))),
                this.renderBelief()));
    };
    return BeliefAdoptionComponent;
}(React.Component));
exports.BeliefAdoptionComponent = BeliefAdoptionComponent;
