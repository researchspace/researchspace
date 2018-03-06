Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var _ = require("lodash");
var components_1 = require("platform/api/components");
var ldp_1 = require("platform/api/services/ldp");
function isIriProps(props) {
    return _.has(props, 'iri');
}
function isSelectionProps(props) {
    return _.has(props, 'selection');
}
var ExportResourceComponent = (function (_super) {
    tslib_1.__extends(ExportResourceComponent, _super);
    function ExportResourceComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.checkProps(props);
        return _this;
    }
    ExportResourceComponent.prototype.componentWillReceiveProps = function (props) {
        this.checkProps(props);
    };
    ExportResourceComponent.prototype.checkProps = function (props) {
        if (isIriProps(props) === isSelectionProps(props)) {
            throw 'Property iri xor selection of mp-ldp-export-resource should be set';
        }
    };
    ExportResourceComponent.prototype.getLDPService = function () {
        var ldpContext = this.context.semanticContext && this.context.semanticContext.repository ?
            { repository: this.context.semanticContext.repository } : {};
        return new ldp_1.LdpService('', ldpContext);
    };
    ExportResourceComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var selection = isIriProps(this.props) ? [this.props.iri] : this.props.selection;
        var exportURL = this.getLDPService().getExportURL(selection);
        return react_1.cloneElement(child, assign({}, child.props, {
            disabled: isSelectionProps(this.props) && this.props.selection.length === 0,
            onClick: function () {
                window.open(exportURL, '_blank');
            },
        }));
    };
    return ExportResourceComponent;
}(components_1.Component));
exports.ExportResourceComponent = ExportResourceComponent;
exports.default = ExportResourceComponent;
