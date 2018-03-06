Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var ArgumentsApi_1 = require("./ArgumentsApi");
var Belief = (function (_super) {
    tslib_1.__extends(Belief, _super);
    function Belief(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.dropdownStyle = function (belief) {
            switch (belief.belief.value) {
                case 'Agree': return 'info';
                case 'Disagree': return 'warning';
                case 'No Opinion': return 'default';
            }
        };
        _this.onBeliefChange = function (belief) { return function (eventKey, event) {
            return _this.setState(function (state) {
                var newBelief = _.clone(belief);
                newBelief.belief.value = eventKey;
                _this.context.changeBelief(newBelief);
                return { belief: newBelief };
            });
        }; };
        _this.onRemoveBelief = function (belief) {
            _this.context.removeBelief(belief);
        };
        _this.state = {
            belief: context.getBeliefValue(props.forValue, props.isCanonical),
        };
        return _this;
    }
    Belief.prototype.componentWillReceiveProps = function (props, context) {
        this.setState({
            belief: context.getBeliefValue(props.forValue, props.isCanonical),
        });
    };
    Belief.prototype.render = function () {
        var _this = this;
        var belief = this.state.belief;
        var id = "belief-selection-" + belief.targetValue;
        var menuItems = [
            React.createElement(react_bootstrap_1.MenuItem, { eventKey: 'Agree' }, "Agree"),
            React.createElement(react_bootstrap_1.MenuItem, { eventKey: 'Disagree' }, "Disagree"),
            React.createElement(react_bootstrap_1.MenuItem, { eventKey: 'No Opinion' }, "No Opinion"),
        ].filter(function (menuItem) { return menuItem.props.eventKey !== belief.belief; });
        return React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pullRight' },
            React.createElement(react_bootstrap_1.DropdownButton, { title: belief.belief.value, id: id, onSelect: this.onBeliefChange(belief), bsStyle: this.dropdownStyle(belief), bsSize: 'small', style: { minWidth: 100 } }, menuItems),
            this.props.isCanonical ? null : React.createElement(react_bootstrap_1.Button, { style: { marginLeft: 10 }, onClick: function () { return _this.onRemoveBelief(belief); }, bsSize: 'small' },
                React.createElement("i", { className: 'fa fa-times' })));
    };
    return Belief;
}(React.Component));
Belief.contextTypes = ArgumentsApi_1.ArgumentsContextTypes;
exports.Belief = Belief;
exports.default = Belief;
