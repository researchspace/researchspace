Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var maybe = require("data.maybe");
var Kefir = require("kefir");
var PageService = require("platform/api/services/page");
var navigation_1 = require("platform/api/navigation");
var components_1 = require("platform/api/components");
var module_loader_1 = require("platform/api/module-loader");
var notification_1 = require("platform/components/ui/notification");
var utils_1 = require("platform/components/utils");
var PageViewerComponent = (function (_super) {
    tslib_1.__extends(PageViewerComponent, _super);
    function PageViewerComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.loadPage = function (props) {
            _this.setState({ loading: true });
            _this.loadAndParseTemplate(props.iri, props.context, props.params).onValue(function (content) {
                return _this.setState({
                    pageContent: content,
                    loading: false,
                });
            }).onError(function (err) {
                _this.setState({
                    loading: false,
                    errorMessage: maybe.Just(err),
                });
            });
        };
        _this.state = {
            loading: true,
            errorMessage: maybe.Nothing(),
        };
        return _this;
    }
    PageViewerComponent.prototype.componentDidMount = function () {
        var _this = this;
        this.loadPage(this.props);
        navigation_1.listen({
            eventType: 'NAVIGATED',
            callback: function (event) {
                if (event.action === 'REFRESH') {
                    _this.loadPage(_this.props);
                }
            },
        });
    };
    PageViewerComponent.prototype.componentDidUpdate = function () {
        window.scroll(0, 0);
    };
    PageViewerComponent.prototype.componentWillReceiveProps = function (nextProps) {
        if (lodash_1.isEqual(this.props, nextProps) === false) {
            this.loadPage(nextProps);
        }
    };
    PageViewerComponent.prototype.render = function () {
        if (this.state.errorMessage.isJust) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.errorMessage.get() });
        }
        return react_1.createElement(components_1.SemanticContextProvider, { repository: navigation_1.getCurrentRepository() }, react_1.DOM.div({
            id: 'template-content',
        }, this.state.loading ? react_1.createElement(utils_1.LoadingBackdrop) : null, this.state.pageContent));
    };
    PageViewerComponent.prototype.loadAndParseTemplate = function (pageIri, pageContextIri, params) {
        return PageService.PageService.loadRenderedTemplate(pageIri, pageContextIri, params).flatMap(function (page) {
            return Kefir.fromPromise(module_loader_1.ModuleRegistry.parseHtmlToReact("\n              <div>\n                " + page.templateHtml + "\n              </div>\n            ").then(function (res) { return res.props.children; }));
        }).toProperty();
    };
    return PageViewerComponent;
}(react_1.Component));
exports.PageViewerComponent = PageViewerComponent;
exports.PageViewer = react_1.createFactory(PageViewerComponent);
exports.default = exports.PageViewer;
