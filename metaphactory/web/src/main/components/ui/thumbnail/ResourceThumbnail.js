Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var resource_thumbnail_1 = require("platform/api/services/resource-thumbnail");
var NoResourceThumbnail_1 = require("./NoResourceThumbnail");
var ResourceThumbnail = (function (_super) {
    tslib_1.__extends(ResourceThumbnail, _super);
    function ResourceThumbnail(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.findComponent = function (children, component) {
            var element = _.find(children, function (child) { return child.type === component; });
            return element;
        };
        _this.state = {};
        return _this;
    }
    ResourceThumbnail.prototype.componentDidMount = function () {
        this.fetchThumbnailUrl(rdf_1.Rdf.iri(this.props.iri));
    };
    ResourceThumbnail.prototype.componentWillReceiveProps = function (nextProps) {
        var iri = this.props.iri;
        if (nextProps.iri !== iri) {
            this.subscription.unsubscribe();
            this.fetchThumbnailUrl(rdf_1.Rdf.iri(nextProps.iri));
        }
    };
    ResourceThumbnail.prototype.componentWillUnmount = function () {
        this.subscription.unsubscribe();
    };
    ResourceThumbnail.prototype.fetchThumbnailUrl = function (resourceIri) {
        var _this = this;
        this.subscription =
            resource_thumbnail_1.getThumbnail(resourceIri, this.context)
                .observe({
                value: function (imageUri) { return _this.setState({ imageUri: imageUri, error: undefined }); },
                error: function (error) { return _this.setState({ imageUri: undefined, error: error }); },
            });
    };
    ResourceThumbnail.prototype.render = function () {
        var className = "resource-thumbnail " + (this.props.className || '');
        if (this.state.imageUri !== undefined) {
            var imageSrc = typeof this.state.imageUri === 'string'
                ? this.state.imageUri : this.props.noImageUri;
            if (typeof imageSrc !== 'string') {
                var fallbackComponent = this.findComponent(react_1.Children.toArray(this.props.children), NoResourceThumbnail_1.NoResourceThumbnail);
                if (fallbackComponent) {
                    return fallbackComponent;
                }
            }
            return react_1.DOM.img({ className: className, src: imageSrc, style: this.props.style });
        }
        else if (this.state.error !== undefined) {
            return react_1.createElement(notification_1.ErrorNotification, { className: className, errorMessage: this.state.error });
        }
        else {
            return react_1.createElement(spinner_1.Spinner, { className: className });
        }
    };
    return ResourceThumbnail;
}(components_1.Component));
exports.ResourceThumbnail = ResourceThumbnail;
exports.default = ResourceThumbnail;
