Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var FacetValueComponent = (function (_super) {
    tslib_1.__extends(FacetValueComponent, _super);
    function FacetValueComponent() {
        var _this = _super.call(this) || this;
        _this.state = {
            isLoading: false,
        };
        return _this;
    }
    FacetValueComponent.prototype.componentWillReceiveProps = function (newProps) {
        this.setState({
            isLoading: false,
        });
    };
    FacetValueComponent.prototype.renderCheckboxLabel = function () {
        var kind = this.props.kind;
        var template = this.props.facetValue.tupleTemplate[kind];
        return react_1.createElement(template_1.TemplateItem, {
            template: {
                source: template,
                options: tslib_1.__assign({ highlight: this.props.highlight }, this.props.facetValue.entity.tuple),
            },
        });
    };
    FacetValueComponent.prototype.render = function () {
        return react_1.DOM.div({
            className: 'facet__relation__values__value checkbox',
            onClick: this.onValueClick.bind(this),
        }, react_1.DOM.label({}, react_1.DOM.input({
            type: 'checkbox',
            className: 'checkbox',
            defaultChecked: this.props.facetValue.selected,
        }), this.renderCheckboxLabel(), this.state.isLoading ? react_1.createElement(spinner_1.Spinner) : react_1.DOM.span({})));
    };
    FacetValueComponent.prototype.onValueClick = function (event) {
        event.stopPropagation();
        if (event.target['tagName'] === 'INPUT') {
            this.setState({
                isLoading: true,
            });
            if (this.props.facetValue.selected) {
                this.props.actions.deselectFacetValue(this.props.facetValue.entity);
            }
            else {
                this.props.actions.selectFacetValue(this.props.facetValue.entity);
            }
        }
    };
    return FacetValueComponent;
}(react_1.Component));
exports.FacetValueComponent = FacetValueComponent;
exports.FacetValue = react_1.createFactory(FacetValueComponent);
exports.default = exports.FacetValue;
