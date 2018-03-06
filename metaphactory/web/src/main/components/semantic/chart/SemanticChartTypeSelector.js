Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var components_1 = require("platform/api/components");
var ComponentToolbarApi_1 = require("platform/components/persistence/ComponentToolbarApi");
var CLASS_NAME = 'semantic-chart';
var SemanticChartTypeSelector = (function (_super) {
    tslib_1.__extends(SemanticChartTypeSelector, _super);
    function SemanticChartTypeSelector(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.selectChartType = function (selectedType) {
            _this.setState({ selectedType: selectedType });
            _this.context.overrideProps({ type: selectedType });
        };
        _this.state = {
            selectedType: props.default || _.head(props.types),
        };
        return _this;
    }
    SemanticChartTypeSelector.prototype.componentDidMount = function () {
        this.selectChartType(this.state.selectedType);
    };
    SemanticChartTypeSelector.prototype.render = function () {
        return this.renderTypeSelector();
    };
    SemanticChartTypeSelector.prototype.renderTypeSelector = function () {
        var _this = this;
        return React.createElement(react_bootstrap_1.ButtonGroup, { style: this.props.style, className: CLASS_NAME + "__types" }, this.props.types.map(function (chartType) {
            return React.createElement(react_bootstrap_1.Button, { className: CLASS_NAME + "__type-button chart-type-" + chartType, key: chartType, active: _this.state.selectedType === chartType, onClick: function () { return _this.selectChartType(chartType); } },
                React.createElement("span", { className: CLASS_NAME + "__type-icon" }),
                React.createElement("span", { className: CLASS_NAME + "__type-label" }, chartType));
        }));
    };
    return SemanticChartTypeSelector;
}(components_1.Component));
SemanticChartTypeSelector.contextTypes = ComponentToolbarApi_1.ComponentToolbarContextTypes;
SemanticChartTypeSelector.defaultProps = {
    types: ['line', 'bar', 'radar', 'pie', 'donut'],
};
exports.SemanticChartTypeSelector = SemanticChartTypeSelector;
exports.default = SemanticChartTypeSelector;
