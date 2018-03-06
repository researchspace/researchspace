Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var components_1 = require("platform/api/components");
var components_2 = require("platform/api/navigation/components");
var ArgumentsApi_1 = require("./ArgumentsApi");
var ExistingBeliefView = (function (_super) {
    tslib_1.__extends(ExistingBeliefView, _super);
    function ExistingBeliefView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ExistingBeliefView.prototype.render = function () {
        var _a = this.props, belief = _a.belief, onCancel = _a.onCancel;
        var close = React.createElement("i", { className: 'fa fa-times pull-right', onClick: onCancel });
        switch (belief.argumentBeliefType) {
            case ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind:
                return React.createElement(react_bootstrap_1.Panel, { header: React.createElement("div", null,
                        React.createElement("span", null, "Assertion based belief"),
                        close) }, ExistingBeliefContentView(belief));
            case ArgumentsApi_1.ArgumentsBeliefTypeFieldKind:
                return React.createElement(react_bootstrap_1.Panel, { header: React.createElement("div", null,
                        React.createElement("span", null, "Field based belief"),
                        close) }, ExistingBeliefContentView(belief));
        }
    };
    return ExistingBeliefView;
}(React.Component));
exports.ExistingBeliefView = ExistingBeliefView;
function ExistingBeliefContentView(belief) {
    switch (belief.argumentBeliefType) {
        case ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind:
            return [
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Assertion"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null,
                            React.createElement(components_1.SemanticContextProvider, { repository: 'assets' },
                                React.createElement(components_2.ResourceLinkComponent, { uri: belief.assertion.value })))))
            ];
        case ArgumentsApi_1.ArgumentsBeliefTypeFieldKind:
            return [
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Record"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null,
                            React.createElement(components_2.ResourceLinkComponent, { uri: belief.target.value, guessRepository: true })))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Field"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl.Static, null,
                            React.createElement(components_1.SemanticContextProvider, { repository: 'assets' },
                                React.createElement(components_2.ResourceLinkComponent, { uri: belief.field.iri }))))),
            ];
    }
}
exports.ExistingBeliefContentView = ExistingBeliefContentView;
