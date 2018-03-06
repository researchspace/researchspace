Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var PageViewer_1 = require("../../app/ts/page/PageViewer");
var alert_1 = require("platform/components/ui/alert");
var PageLoaderComponent = (function (_super) {
    tslib_1.__extends(PageLoaderComponent, _super);
    function PageLoaderComponent(props) {
        return _super.call(this, props) || this;
    }
    PageLoaderComponent.prototype.shouldComponentUpdate = function (nextProps) {
        return lodash_1.isEqual(this.props, nextProps);
    };
    PageLoaderComponent.prototype.render = function () {
        if (!this.props.iri || this.props.iri.length < 1) {
            return react_1.createElement(alert_1.Alert, {
                alert: alert_1.AlertType.DANGER,
                message: 'Page loader component requires an non empty iri parameter as input.',
            });
        }
        else {
            return PageViewer_1.default({
                iri: rdf_1.Rdf.iri(this.props.iri),
                context: navigation_1.getCurrentResource(),
                params: tslib_1.__assign({}, navigation_1.getCurrentUrl().search(true), navigation_1.NavigationUtils.extractParams(this.props)),
            });
        }
    };
    return PageLoaderComponent;
}(react_1.Component));
exports.component = PageLoaderComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
