Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/navigation/components");
var LabelsService = require("platform/api/services/resource-label");
var RdfValueDisplay = (function (_super) {
    tslib_1.__extends(RdfValueDisplay, _super);
    function RdfValueDisplay(props) {
        var _this = _super.call(this, props) || this;
        _this.setLabel = function (label) {
            _this.setState({ label: label });
        };
        _this.state = {
            label: '',
        };
        return _this;
    }
    RdfValueDisplay.prototype.componentDidMount = function () {
        this.getLabelForIri(this.props.data);
    };
    RdfValueDisplay.prototype.componentWillReceiveProps = function (newProps) {
        if (!newProps.data.equals(this.props.data) || newProps.showLabel !== this.props.showLabel) {
            this.getLabelForIri(newProps.data);
        }
    };
    RdfValueDisplay.prototype.componentWillUnmount = function () {
        if (this.labelsProperty) {
            this.labelsProperty.offValue(this.setLabel);
        }
    };
    RdfValueDisplay.prototype.render = function () {
        var _this = this;
        var displayValue = this.props.data.cata(function (iri) { return react_1.createElement(components_1.ResourceLink, {
            className: _this.props.className,
            'data-rdfa-about': iri.value,
            resource: iri,
            title: _this.state.label,
        }, _this.state.label); }, function (bnode) { return bnode.value; }, function (literal) { return literal.value; });
        return react_1.DOM.span({ className: this.props.className }, displayValue);
    };
    RdfValueDisplay.prototype.getLabelForIri = function (node) {
        if (node instanceof rdf_1.Rdf.Iri) {
            this.setState({ label: node.value });
            if (this.props.showLabel === false) {
                return;
            }
            else {
                this.labelsProperty = LabelsService.getLabel(node);
                this.labelsProperty.onValue(this.setLabel);
            }
        }
    };
    return RdfValueDisplay;
}(react_1.Component));
exports.RdfValueDisplay = RdfValueDisplay;
