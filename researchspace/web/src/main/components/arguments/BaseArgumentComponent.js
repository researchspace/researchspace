Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var Maybe = require("data.maybe");
var _ = require("lodash");
var Kefir = require("kefir");
var moment = require("moment");
var components_1 = require("platform/api/components");
var navigation_1 = require("platform/api/navigation");
var DropArea_1 = require("platform/components/dnd/DropArea");
var components_2 = require("platform/api/navigation/components");
var notification_1 = require("platform/components/ui/notification");
var ArgumentsApi_1 = require("./ArgumentsApi");
var AssertionsComponent_1 = require("./AssertionsComponent");
var AssertionsStore_1 = require("./AssertionsStore");
var ArgumentsStore_1 = require("./ArgumentsStore");
var InferenceMakingComponent_1 = require("./InferenceMakingComponent");
var BeliefAdoptionComponent_1 = require("./BeliefAdoptionComponent");
var ObservationComponent_1 = require("./ObservationComponent");
var ExistingBeliefView_1 = require("./ExistingBeliefView");
var styles = require("./ArgumentsComponent.scss");
var BaseArgumentsComponent = (function (_super) {
    tslib_1.__extends(BaseArgumentsComponent, _super);
    function BaseArgumentsComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.assertionHeader = function (field) {
            return React.createElement(react_bootstrap_1.Row, { className: styles.title },
                React.createElement(react_bootstrap_1.Col, { sm: 12 },
                    React.createElement("div", { className: styles.header },
                        React.createElement("img", { style: { height: 26, marginRight: 6 }, src: '../images/assertion.svg' }),
                        "Assertion about field ",
                        React.createElement(components_1.SemanticContextProvider, { repository: 'default' },
                            React.createElement(components_2.ResourceLinkComponent, { uri: 'http://www.researchspace.org/resource/Field', urlqueryparamSubject: _this.state.target.value, urlqueryparamField: field.iri },
                                React.createElement("span", { className: 'field-type-title' }, field.label))),
                        " of ",
                        React.createElement(components_2.ResourceLinkComponent, { uri: _this.state.target.value, guessRepository: true })),
                    React.createElement(react_bootstrap_1.Col, { sm: 5 },
                        React.createElement(react_bootstrap_1.Form, { horizontal: true },
                            React.createElement(react_bootstrap_1.Col, { sm: 12, style: { marginBottom: 10 } }),
                            React.createElement(react_bootstrap_1.FormGroup, null,
                                React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Title*"),
                                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                                    React.createElement(react_bootstrap_1.FormControl, { type: 'text', placeholder: 'Enter Assertion Title...', value: _this.state.title, onChange: _this.onTitleChange }))),
                            React.createElement(react_bootstrap_1.FormGroup, null,
                                React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Description"),
                                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                                    React.createElement(react_bootstrap_1.FormControl, { componentClass: 'textarea', placeholder: 'Enter Assertion Description...', value: _this.state.description, onChange: _this.onDescriptionChange }))),
                            _this.renderSemanticNarrative()))));
        };
        _this.renderSemanticNarrative = function () {
            return React.createElement(react_bootstrap_1.FormGroup, null,
                React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Narrative"),
                React.createElement(react_bootstrap_1.Col, { sm: 10 }, _this.state.semanticNarrative.map(function (semanticNarrative) {
                    return React.createElement(react_bootstrap_1.FormControl.Static, null,
                        React.createElement(components_1.SemanticContextProvider, { repository: 'assets' },
                            React.createElement(components_2.ResourceLinkComponent, { uri: semanticNarrative.value })));
                }).getOrElse(_this.semanticNarrativeSelection())));
        };
        _this.semanticNarrativeSelection = function () {
            var addingSemanticNarrative = _this.state.addingSemanticNarrative;
            return React.createElement("div", null,
                React.createElement(react_bootstrap_1.Button, { bsStyle: 'link', onClick: function () { return _this.setState({ addingSemanticNarrative: !addingSemanticNarrative }); } }, "Add semantic narrative ..."),
                addingSemanticNarrative ?
                    React.createElement(react_bootstrap_1.Panel, { collapsible: true, expanded: addingSemanticNarrative },
                        React.createElement(DropArea_1.DropArea, { alwaysVisible: true, query: 'ASK { ?value a <http://www.researchspace.org/ontology/UserDefinedPage> .}', repository: 'assets', onDrop: _this.onSemanticNarrativeDrop, dropMessage: React.createElement("p", null, "You can drag and drop Semantic Narrative from Clipboard here, to use it as a description") }))
                    : null);
        };
        _this.newPremiseSelection = function () {
            var addingPremise = _this.state.addingPremise;
            return addingPremise ? _this.newArgumentSelection()
                : React.createElement("div", { className: styles['new-premise'] },
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'link', onClick: function () { return _this.setState({ addingPremise: !addingPremise }); } },
                        React.createElement("strong", null, "Add another premise...")));
        };
        _this.arguments = function (field) {
            return React.createElement("div", null,
                React.createElement("div", { className: styles.holder },
                    React.createElement("div", { className: styles.arguments },
                        _this.existingArguments(),
                        _this.state.newArgumentType.map(_this.newArgument).getOrElse(_this.state.arguments.length ? _this.newPremiseSelection() : _this.newArgumentSelection())),
                    React.createElement("div", { className: styles.assertions },
                        React.createElement(AssertionsComponent_1.AssertionsComponent, tslib_1.__assign({}, _this.props, { field: field, title: 'Conclusion', onBeliefsChange: _this.onBeliefsChange, beliefs: _this.state.beliefs, target: _this.state.target })))),
                React.createElement("div", null,
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', className: styles.save, disabled: !_this.saveEnabled(), onClick: _this.save(field) }, "Save Assertion")));
        };
        _this.existingArguments = function () {
            return _this.state.arguments.map(function (argument, i) {
                if (_this.state.editingArgumentIndex.map(function (index) { return index === i; }).getOrElse(false)) {
                    return _this.newArgument(argument.argumentType, argument);
                }
                else {
                    return React.createElement("div", { className: styles['existing-argument'] },
                        _this.renderArgument(argument),
                        _this.arrowConnector());
                }
            });
        };
        _this.arrowConnector = function () {
            return React.createElement("i", { className: 'fa fa-long-arrow-right' });
        };
        _this.renderArgument = function (argument) {
            switch (argument.argumentType) {
                case ArgumentsApi_1.ObservationType:
                    return _this.renderObservationArgument(argument);
                case ArgumentsApi_1.BeliefAdoptionType:
                    return _this.renderBeliefAdoptionArgument(argument);
                case ArgumentsApi_1.InferenceType:
                    return _this.renderInferenceArgument(argument);
            }
        };
        _this.closePanelButton = function (action, arg) {
            return React.createElement(react_bootstrap_1.Button, { bsSize: 'xs', bsClass: 'btn btn-xs btn-default pull-right', style: { marginLeft: 10 }, onClick: function () { return action(arg); } },
                React.createElement("i", { className: 'fa fa-times' }));
        };
        _this.editPanelButton = function (action, arg) {
            return React.createElement(react_bootstrap_1.Button, { bsSize: 'xs', bsClass: 'btn btn-xs btn-default pull-right', onClick: function () { return action(arg); } },
                React.createElement("i", { className: 'fa fa-pencil' }));
        };
        _this.argumentFrame = function (props) { return React.createElement("div", { className: styles['panel-holder'] },
            React.createElement(react_bootstrap_1.Panel, { header: React.createElement("div", null,
                    React.createElement("span", null, props.title),
                    _this.closePanelButton(_this.removeArgument, props.argument),
                    _this.editPanelButton(_this.editArgument, props.argument)) },
                React.createElement(react_bootstrap_1.Form, { horizontal: true },
                    React.createElement(react_bootstrap_1.FormGroup, null,
                        React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Title"),
                        React.createElement(react_bootstrap_1.Col, { sm: 10 },
                            React.createElement(react_bootstrap_1.FormControl.Static, null, props.argument.title))),
                    React.createElement(react_bootstrap_1.FormGroup, null,
                        React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Description"),
                        React.createElement(react_bootstrap_1.Col, { sm: 10 },
                            React.createElement(react_bootstrap_1.FormControl.Static, null, props.argument.note))),
                    props.children))); };
        _this.renderInferenceArgument = function (argument) {
            return React.createElement(_this.argumentFrame, { argument: argument, title: 'Premise based on logic and evidences' },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Logic Type"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null,
                            React.createElement(components_1.SemanticContextProvider, { repository: 'assets' },
                                React.createElement(components_2.ResourceLinkComponent, { uri: argument.logicType.value }))))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Evidence"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 }, argument.premises.map(function (premise) { return React.createElement(ExistingBeliefView_1.ExistingBeliefView, { belief: premise, onCancel: function () { return _this.removePremiseForArgument(argument, premise); } }); }))));
        };
        _this.renderBeliefAdoptionArgument = function (argument) {
            return React.createElement(_this.argumentFrame, { argument: argument, title: 'Premise based on belief adoption' }, ExistingBeliefView_1.ExistingBeliefContentView(argument.belief));
        };
        _this.renderObservationArgument = function (argument) {
            return React.createElement(_this.argumentFrame, { argument: argument, title: 'Premise based on direct observation' },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Place"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null,
                            React.createElement(components_1.SemanticContextProvider, { repository: 'default' },
                                React.createElement(components_2.ResourceLinkComponent, { uri: argument.place.value }))))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Date"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null, moment(argument.date.value).format('LL')))));
        };
        _this.newArgument = function (argumentType, initialState) {
            return React.createElement("div", { className: styles['new-argument'] },
                React.createElement("div", { className: styles['panel-holder'] }, _this.newArgumentComponent(argumentType, initialState)),
                _this.arrowConnector());
        };
        _this.newArgumentComponent = function (argumentType, initialState) {
            switch (argumentType) {
                case ArgumentsApi_1.ObservationType:
                    return React.createElement(ObservationComponent_1.ObservationComponent, { onSave: _this.addArgument, onCancel: _this.cancelNewArgument, initialState: initialState });
                case ArgumentsApi_1.InferenceType:
                    return React.createElement(InferenceMakingComponent_1.InferenceMakingComponent, { subject: _this.state.target, logicTypeQuery: _this.props.logicTypeQuery, acceptEvidenceQuery: _this.props.acceptEvidenceQuery, onCancel: _this.cancelNewArgument, onSave: _this.addArgument, initialState: initialState });
                case ArgumentsApi_1.BeliefAdoptionType:
                    return React.createElement(BeliefAdoptionComponent_1.BeliefAdoptionComponent, { subject: _this.state.target, acceptRecordQuery: _this.props.acceptEvidenceQuery, onCancel: _this.cancelNewArgument, onSave: _this.addArgument, initialState: initialState });
            }
        };
        _this.newArgumentSelection = function () {
            return React.createElement("div", { className: _this.state.arguments.length ?
                    styles['new-argument'] : [styles['first-new-argument']] },
                React.createElement("div", { className: styles['panel-holder'] },
                    React.createElement(react_bootstrap_1.Panel, { header: React.createElement("div", null,
                            React.createElement("span", null, "Premise"),
                            _this.state.arguments.length ? _this.closePanelButton(_this.cancelNewArgument) : null) },
                        React.createElement("p", null, "Select a type of premise for your conclusion"),
                        React.createElement("hr", null),
                        React.createElement(react_bootstrap_1.FormGroup, null,
                            React.createElement(react_bootstrap_1.Radio, { name: 'premiseType', checked: _this.isArgumentTypeSelected(ArgumentsApi_1.ObservationType), onClick: _this.onArgumentTypeChange(ArgumentsApi_1.ObservationType) }, "I have a premise based on what I've personally observed"),
                            React.createElement(react_bootstrap_1.Radio, { name: 'premiseType', checked: _this.isArgumentTypeSelected(ArgumentsApi_1.BeliefAdoptionType), onClick: _this.onArgumentTypeChange(ArgumentsApi_1.BeliefAdoptionType) }, "I want to adopt someone else's belief and use it as my premise"),
                            React.createElement(react_bootstrap_1.Radio, { name: 'premiseType', checked: _this.isArgumentTypeSelected(ArgumentsApi_1.InferenceType), onClick: _this.onArgumentTypeChange(ArgumentsApi_1.InferenceType) }, "I want to use logic and connected evidence as the basis of my premise")))),
                _this.arrowConnector());
        };
        _this.onTitleChange = function (event) {
            return _this.setState({ title: event.target.value });
        };
        _this.onDescriptionChange = function (event) {
            return _this.setState({ description: event.target.value });
        };
        _this.onSemanticNarrativeDrop = function (narrative) {
            return _this.setState({ semanticNarrative: Maybe.Just(narrative) });
        };
        _this.onArgumentTypeChange = function (argumentType) { return function () {
            return _this.setState({ newArgumentType: Maybe.Just(argumentType) });
        }; };
        _this.cancelNewArgument = function () {
            return _this.setState({
                addingPremise: false,
                newArgumentType: Maybe.Nothing(),
                editingArgumentIndex: Maybe.Nothing(),
            });
        };
        _this.isArgumentTypeSelected = function (argumentType) {
            return _this.state.newArgumentType.map(function (t) { return t === argumentType; }).getOrElse(false);
        };
        _this.onBeliefsChange = function (beliefs) { return _this.setState({ beliefs: beliefs }); };
        _this.saveEnabled = function () {
            var noBelief = _this.state.beliefs.isEmpty() || _this.state.beliefs.some(function (b) { return b.belief.value === 'No Opinion'; });
            return !_.isEmpty(_this.state.title) && !noBelief;
        };
        _this.addArgument = function (argument) {
            if (_this.state.editingArgumentIndex.isJust) {
                _this.state.arguments[_this.state.editingArgumentIndex.get()] = argument;
                _this.setState(({ arguments: _this.state.arguments }));
            }
            else {
                _this.setState(({ arguments: _this.state.arguments.concat([argument]) }));
            }
            _this.cancelNewArgument();
        };
        _this.removeArgument = function (argument) {
            return _this.setState(function (state) {
                var filteredArgs = _.filter(state.arguments, function (a) { return a !== argument; });
                return { arguments: filteredArgs };
            });
        };
        _this.editArgument = function (argument) {
            return _this.setState({
                editingArgumentIndex: Maybe.Just(_.findIndex(_this.state.arguments, function (arg) { return arg === argument; }))
            });
        };
        _this.removePremiseForArgument = function (argument, premise) {
            return _this.setState(function (state) {
                _.remove(argument.premises, function (p) { return p === premise; });
                return { arguments: state.arguments };
            });
        };
        _this.save = function (field) { return function () {
            var assertedBeliefs = _this.state.beliefs.valueSeq().toArray();
            var savingAssertion = AssertionsStore_1.saveAssertion({ iri: _this.state.assertionIri, title: _this.state.title, note: _this.state.description,
                narrative: _this.state.semanticNarrative.getOrElse(undefined),
                field: field, target: _this.state.target, beliefs: assertedBeliefs });
            var saving;
            if (_.isEmpty(_this.state.arguments)) {
                saving = savingAssertion.map(function (_a) {
                    var assertion = _a.assertion;
                    return assertion;
                }).flatMap(function (assertion) {
                    if (!_.isEmpty(_this.state.initialArguments)) {
                        return Kefir.combine(_this.state.initialArguments.map(ArgumentsStore_1.removeArgument)).map(function (_) { return assertion; });
                    }
                    else {
                        return Kefir.constant(assertion);
                    }
                });
            }
            else {
                saving =
                    savingAssertion.flatMap(function (_a) {
                        var assertion = _a.assertion, beliefs = _a.beliefs;
                        var removeProp;
                        if (!_.isEmpty(_this.state.initialArguments)) {
                            removeProp = Kefir.combine(_this.state.initialArguments.map(ArgumentsStore_1.removeArgument));
                        }
                        else {
                            removeProp = Kefir.constant({});
                        }
                        return removeProp.flatMap(function (_) {
                            return Kefir.combine(_this.state.arguments.map(function (argument) {
                                argument.conclusions = beliefs;
                                return ArgumentsStore_1.saveArgument(argument);
                            })).map(function (_) { return assertion; });
                        });
                    });
            }
            saving.flatMap(function (assertion) {
                if (_this.state.assertionIri.isJust) {
                    navigation_1.refresh();
                    return Kefir.constant(null);
                }
                else {
                    return navigation_1.navigateToResource(assertion, {}, 'assets');
                }
            }).onValue(function () {
                notification_1.addNotification({
                    level: 'success',
                    message: "Assertion has been saved successfully!",
                });
            });
        }; };
        _this.state = props.initialState;
        return _this;
    }
    BaseArgumentsComponent.prototype.render = function () {
        var _this = this;
        return this.state.field.map(function (field) {
            return React.createElement(react_bootstrap_1.Grid, { fluid: true },
                _this.assertionHeader(field),
                _this.arguments(field));
        }).getOrElse(null);
    };
    return BaseArgumentsComponent;
}(components_1.Component));
BaseArgumentsComponent.defaultProps = {
    acceptEvidenceQuery: "ASK {}",
    logicTypeQuery: "\n      PREFIX crminf: <http://www.ics.forth.gr/isl/CRMinf/>\n\n      SELECT ?logic ?label {\n        ?logic a crminf:I3_Inference_Logic .\n        ?logic rdfs:label ?label .\n      }\n    ",
};
exports.BaseArgumentsComponent = BaseArgumentsComponent;
exports.default = BaseArgumentsComponent;
