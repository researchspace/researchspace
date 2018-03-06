Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_slick_1 = require("react-slick");
var _ = require("lodash");
var assign = require("object-assign");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var utils_1 = require("platform/components/utils");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var SliderComponent = react_1.createFactory(react_slick_1.default);
require("./SemanticCarousel.scss");
var SemanticCarousel = (function (_super) {
    tslib_1.__extends(SemanticCarousel, _super);
    function SemanticCarousel(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.prepareConfigAndExecuteQuery = function (props, context) {
            return sparql_1.SparqlClient.select(props.query, { context: context.semanticContext }).onValue(function (res) { return _this.setState({ data: res, isLoading: false }); });
        };
        _this.state = {
            isLoading: true,
            noResults: false,
        };
        return _this;
    }
    SemanticCarousel.prototype.render = function () {
        return react_1.DOM.div({ className: 'semantic-carousel' }, this.state.isLoading ? react_1.createElement(spinner_1.Spinner) :
            !sparql_1.SparqlUtil.isSelectResultEmpty(this.state.data) ?
                this.getSliderComponent(this.state.data) :
                react_1.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } }));
    };
    SemanticCarousel.prototype.getSliderComponent = function (data) {
        var _this = this;
        var defaultSettings = {
            dots: true,
            infinite: true,
            speed: 500,
            slidesToShow: 1,
            lazyLoad: true,
            slidesToScroll: 1,
        };
        var settings = assign({}, defaultSettings, this.getCarouselOptions());
        var _data = utils_1.prepareResultData(data);
        var items = _.map(_data, function (tuple, i) {
            return react_1.DOM.div({ key: i }, react_1.createElement(template_1.TemplateItem, {
                template: {
                    source: _this.getTupleTemplate(),
                    options: tuple,
                },
                componentProps: {
                    className: 'semantic-carousel-item',
                },
            }));
        });
        return SliderComponent(settings, items);
    };
    SemanticCarousel.prototype.componentWillReceiveProps = function (nextProps, nextContext) {
        if (nextProps.query !== this.props.query) {
            this.prepareConfigAndExecuteQuery(nextProps, nextContext);
        }
    };
    SemanticCarousel.prototype.componentWillMount = function () {
        this.prepareConfigAndExecuteQuery(this.props, this.context);
    };
    SemanticCarousel.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return nextProps.query !== this.props.query || nextState !== this.state;
    };
    SemanticCarousel.prototype.getTupleTemplate = function () {
        if (_.has(this.props, 'layout')) {
            console.warn('layout property in semantic-carousel is deprecated, please use flat properties instead');
            return this.props['layout']['tupleTemplate'];
        }
        return this.props.tupleTemplate;
    };
    SemanticCarousel.prototype.getCarouselOptions = function () {
        if (_.has(this.props, 'layout')) {
            console.warn('layout property in semantic-carousel is deprecated, please use flat properties instead');
            return this.props['layout']['options'];
        }
        return this.props.options;
    };
    return SemanticCarousel;
}(components_1.Component));
exports.SemanticCarousel = SemanticCarousel;
exports.default = SemanticCarousel;
