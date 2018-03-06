Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var highlight_1 = require("platform/components/ui/highlight");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var LabelsService = require("platform/api/services/resource-label");
var ResourceLabel = (function (_super) {
    tslib_1.__extends(ResourceLabel, _super);
    function ResourceLabel(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.fetchLabel = function (iri) {
            _this.subscription = LabelsService.getLabel(iri, _this.context).observe({
                value: function (label) { return _this.setState({ label: label, error: undefined }); },
                error: function (error) { return _this.setState({ label: undefined, error: error }); },
            });
        };
        _this.state = {};
        return _this;
    }
    ResourceLabel.prototype.componentDidMount = function () {
        this.fetchLabel(rdf_1.Rdf.iri(this.props.iri));
    };
    ResourceLabel.prototype.componentWillReceiveProps = function (nextProps) {
        var iri = this.props.iri;
        if (nextProps.iri !== iri) {
            this.subscription.unsubscribe();
            this.fetchLabel(rdf_1.Rdf.iri(nextProps.iri));
        }
    };
    ResourceLabel.prototype.componentWillUnmount = function () {
        this.subscription.unsubscribe();
    };
    ResourceLabel.prototype.render = function () {
        var _a = this.props, className = _a.className, style = _a.style, highlight = _a.highlight, highlightProps = _a.highlightProps;
        var _b = this.state, label = _b.label, error = _b.error;
        if (error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: error });
        }
        return typeof label === 'string'
            ? react_1.createElement(highlight_1.HighlightComponent, { className: className, style: style, highlight: highlight, highlightProps: highlightProps }, label)
            : react_1.createElement(spinner_1.Spinner);
    };
    return ResourceLabel;
}(components_1.Component));
exports.ResourceLabel = ResourceLabel;
exports.default = ResourceLabel;
