Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var maybe = require("data.maybe");
var ReactSelect = require("react-select");
var security_1 = require("platform/api/services/security");
var spinner_1 = require("platform/components/ui/spinner");
var D = React.DOM;
var RoleMultiSelectorComponent = (function (_super) {
    tslib_1.__extends(RoleMultiSelectorComponent, _super);
    function RoleMultiSelectorComponent() {
        var _this = _super.call(this) || this;
        _this.onChangeRoleSelection = function (roles) {
            var newRoles = _.map(roles, 'value').join(',');
            _this.setState({ isLoading: false, roleString: maybe.Just(newRoles) });
            if (!_.isUndefined(_this.props.onChangeCallback)) {
                _this.props.onChangeCallback(_this.props.inputName, newRoles);
            }
        };
        _this.state = {
            isLoading: true,
            roleString: maybe.Nothing(),
            backendRoles: maybe.Nothing(),
        };
        return _this;
    }
    RoleMultiSelectorComponent.prototype.render = function () {
        if (this.state.isLoading || this.state.backendRoles.isNothing) {
            return React.createElement(spinner_1.Spinner);
        }
        return D.div({}, this.renderSelector());
    };
    RoleMultiSelectorComponent.prototype.renderSelector = function () {
        var data = new Array();
        _.map(this.state.backendRoles.get(), function (role) { return data.push({ value: role.roleName, label: role.roleName }); });
        var selectOptions = {
            value: this.state.roleString.map(function (r) { return r; }).getOrElse(this.props.initialRoles.map(function (r) { return r; }).getOrElse('')),
            className: 'dataset-selector__multi-select',
            name: this.props.inputName,
            multi: true,
            options: data,
            clearable: true,
            allowCreate: false,
            autoload: true,
            clearAllText: 'Remove all',
            clearValueText: 'Remove role',
            delimiter: ',',
            disabled: false,
            ignoreCase: true,
            matchPos: 'any',
            matchProp: 'any',
            noResultsText: 'No roles found',
            placeholder: 'Select roles',
            onChange: this.onChangeRoleSelection,
        };
        return React.createElement(ReactSelect, selectOptions);
    };
    RoleMultiSelectorComponent.prototype.componentWillMount = function () {
        var _this = this;
        security_1.Util.getRoleDefinitions().onValue(function (roles) {
            return _this.setState({
                isLoading: false,
                backendRoles: maybe.Just(roles),
            });
        });
    };
    RoleMultiSelectorComponent.prototype.componentWillReceiveProps = function (nextProps) {
        this.setState({
            isLoading: false,
            roleString: maybe.Just(nextProps.initialRoles.map(function (r) { return r; }).getOrElse('')),
        });
    };
    return RoleMultiSelectorComponent;
}(React.Component));
var RoleMultiSelector = React.createFactory(RoleMultiSelectorComponent);
exports.default = RoleMultiSelector;
