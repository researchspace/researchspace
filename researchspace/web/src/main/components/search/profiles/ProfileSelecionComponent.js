Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactSelectComponent = require("react-select");
var _ = require("lodash");
var ReactSelect = react_1.createFactory(ReactSelectComponent);
var ProfileSelectionComponent = (function (_super) {
    tslib_1.__extends(ProfileSelectionComponent, _super);
    function ProfileSelectionComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            options: [],
            selectedValues: [],
        };
        return _this;
    }
    ProfileSelectionComponent.prototype.componentWillMount = function () {
        this.prepareSelectData(this.props);
    };
    ProfileSelectionComponent.prototype.componentWillReceiveProps = function (props) {
        this.prepareSelectData(props);
    };
    ProfileSelectionComponent.prototype.render = function () {
        return ReactSelect({
            className: 'result-selector__multi-select',
            multi: true,
            options: this.state.options,
            value: this.state.selectedValues,
            onChange: this.onChange.bind(this),
            disabled: this.props.disabled,
            placeholder: 'Select relationship profile to use. Default: all FCs and FRs',
        });
    };
    ProfileSelectionComponent.prototype.onChange = function (strVal, options) {
        var values = _.map(options, function (v) { return v.value; });
        var selectedProfiles = this.props.profiles.filter(function (p) { return _.includes(values, p.iri.value); });
        this.props.onChange(selectedProfiles);
    };
    ProfileSelectionComponent.prototype.prepareSelectData = function (props) {
        var options = props.profiles.map(function (e) {
            return {
                value: e.iri.value,
                label: e.label,
            };
        }).toJS();
        var selectedValues = props.selectedProfiles.map(function (e) { return e.iri.value; }).toJS();
        this.setState({
            options: options,
            selectedValues: selectedValues,
        });
    };
    return ProfileSelectionComponent;
}(react_1.Component));
exports.ProfileSelectionComponent = ProfileSelectionComponent;
exports.ProfileSelection = react_1.createFactory(ProfileSelectionComponent);
exports.default = exports.ProfileSelection;
