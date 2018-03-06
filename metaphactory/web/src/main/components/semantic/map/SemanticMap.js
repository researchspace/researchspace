Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var _ = require("lodash");
var maybe = require("data.maybe");
var ol = require("openlayers");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
require("openlayers/css/ol.css");
require("./lib/ol3-popup.css");
require("./lib/ol3-popup.js");
var MAP_REF = 'metaphacts-map-widget';
var SemanticMap = (function (_super) {
    tslib_1.__extends(SemanticMap, _super);
    function SemanticMap(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.createGeometries = function (markersData) {
            return _.map(markersData, function (marker) {
                var f = new ol.Feature(marker);
                var geo = undefined;
                if (!_.isUndefined(marker['lat']) && !_.isUndefined(marker['lng'])) {
                    geo = new ol.geom.Point(_this.transformToMercator(parseFloat(marker['lng'].value), parseFloat(marker['lat'].value)));
                }
                else if (!_.isUndefined(marker['wkt']) && _.isUndefined(geo)) {
                    geo = _this.readWKT(marker['wkt'].value);
                }
                if (_.isUndefined(geo)) {
                    var msg = "Result of SPARQL Select query does have neither\n                    lat,lng nor wkt projection variable. ";
                    _this.setState({ errorMessage: maybe.Just(msg) });
                }
                else {
                    f.setGeometry(geo);
                    return f;
                }
            });
        };
        _this.addMarkersFromQuery = function () {
            if (_this.props.query) {
                var stream = sparql_1.SparqlClient.select(_this.props.query);
                stream.onValue(function (res) {
                    var m = _.map(res.results.bindings, function (v) {
                        return _.mapValues(v, function (x) { return x; });
                    });
                    if (sparql_1.SparqlUtil.isSelectResultEmpty(res)) {
                        _this.setState({
                            noResults: true,
                            errorMessage: maybe.Nothing(),
                            isLoading: false,
                        });
                    }
                    else {
                        _this.setState({
                            noResults: false,
                            errorMessage: maybe.Nothing(),
                            isLoading: false,
                        });
                        _this.markersLayer.getSource().clear();
                        _this.markersLayer.getSource().addFeatures(_this.createGeometries(m));
                        var view = _this.map.getView();
                        view.fit(_this.markersLayer.getSource().getExtent(), _this.map.getSize());
                        if (view.getZoom() > 15) {
                            view.setZoom(10);
                        }
                    }
                });
                stream.onError(function (error) { return _this.setState({
                    errorMessage: maybe.Just(error),
                    isLoading: false,
                }); });
            }
        };
        _this.createMap = function () {
            _this.renderMap(react_dom_1.findDOMNode(_this.refs[MAP_REF]), _this.props, {
                lng: parseFloat('0'),
                lat: parseFloat('0'),
            }, []);
        };
        _this.getMarkerFromMapAsElements = function () {
            if (!_.isUndefined(_this.markersLayer)) {
                var elementDiv = _this.refs['ref-map-widget-elements'];
                var source = _this.markersLayer.getSource();
                var features = source.getFeaturesInExtent(source.getExtent());
                var d_1 = react_dom_1.findDOMNode(elementDiv);
                var template_2 = _this.state.tupleTemplate;
                _.forEach(features, function (f) {
                    var html = SemanticMap.createPopupContent(f.getProperties(), template_2);
                    var doc = new DOMParser().parseFromString(html, 'text/html');
                    d_1.appendChild(doc.body.firstChild);
                });
            }
        };
        _this.compileTemplatesInConfig = function (config) {
            var defaultTemplate = "\n        <semantic-link class=\"map-resource-link\" data-uri=\"{{link.value}}\">\n        </semantic-link>\n        <p>{{description.value}}</p>\n    ";
            var template = maybe.fromNullable(_this.handleDeprecatedLayout(config)).chain(function (tupleTemplate) { return maybe.fromNullable(tupleTemplate); }).getOrElse(defaultTemplate);
            _this.appliedTemplateScope.compile(template).then(function (tupleTemplate) {
                _this.setState({
                    tupleTemplate: maybe.Just(tupleTemplate),
                    errorMessage: maybe.Nothing(),
                });
            }).catch(function (error) {
                _this.setState({ errorMessage: maybe.Just(error) });
            });
        };
        _this.state = {
            tupleTemplate: maybe.Nothing(),
            noResults: false,
            isLoading: true,
            errorMessage: maybe.Nothing(),
        };
        return _this;
    }
    SemanticMap.createPopupContent = function (props, tupleTemplate) {
        var defaultContent = '';
        if (_.isUndefined(props.link) === false) {
            defaultContent += "\n          <semantic-link uri=\"" + props.link + "\"></semantic-link>\n          <p>" + props.description + "</p>\n      ";
        }
        return tupleTemplate.map(function (template) { return template(props); }).getOrElse(defaultContent);
    };
    SemanticMap.prototype.componentDidMount = function () {
        this.createMap();
    };
    SemanticMap.prototype.componentWillReceiveProps = function (props) {
        this.addMarkersFromQuery();
    };
    SemanticMap.prototype.componentWillMount = function () {
        this.compileTemplatesInConfig(this.props);
    };
    SemanticMap.prototype.render = function () {
        if (!this.state.errorMessage.isNothing) {
            return react_1.DOM.div({ className: 'metaphacts-map-widget' }, react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.errorMessage.get() }));
        }
        else if (this.state.tupleTemplate === undefined) {
            return react_1.createElement(spinner_1.Spinner);
        }
        else if (this.state.noResults) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } });
        }
        return react_1.DOM.div({}, react_1.DOM.div({
            ref: MAP_REF,
            className: 'metaphacts-map-widget',
            style: {
                height: '100%',
                width: '100%',
                visibility: this.state.noResults ? 'hidden' : 'visible',
            },
        }, react_1.DOM.div({
            className: 'metaphacts-map-widget-elements',
            ref: 'ref-map-widget-elements',
            onClick: this.getMarkerFromMapAsElements.bind(this),
            style: { display: 'none' },
        })), this.state.isLoading ? react_1.createElement(spinner_1.Spinner) : null);
    };
    SemanticMap.prototype.initializeMarkerPopup = function (map) {
        var _this = this;
        var overlayOptions = {
            stopEvent: false,
        };
        var popup = new ol.Overlay.Popup(overlayOptions);
        map.addOverlay(popup);
        map.on('click', function (evt) {
            popup.hide();
            popup.setOffset([0, 0]);
            var feature = map.forEachFeatureAtPixel(evt.pixel, function (f, layer) {
                return f;
            });
            if (feature) {
                var coord = feature.getGeometry().getCoordinates();
                var props = feature.getProperties();
                var popupContent = SemanticMap.createPopupContent(props, _this.state.tupleTemplate);
                popup.setOffset([0, -22]);
                popup.show(coord, "<mp-template-item>" + popupContent + "</mp-template-item>");
            }
        });
    };
    SemanticMap.prototype.transformToMercator = function (lng, lat) {
        return ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
    };
    SemanticMap.prototype.readWKT = function (wkt) {
        var format = new ol.format.WKT();
        return format.readGeometry(wkt, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });
    };
    SemanticMap.prototype.renderMap = function (node, props, center, markers) {
        var _this = this;
        window.setTimeout(function () {
            var markersSource = new ol.source.Vector({
                features: _this.createGeometries(markers),
            });
            var markerStyle = new ol.style.Style({
                text: new ol.style.Text({
                    text: '\uf041',
                    font: 'normal 22px FontAwesome',
                    textBaseline: 'Bottom',
                    fill: new ol.style.Fill({
                        color: 'black',
                    }),
                }),
            });
            var markersLayer = new ol.layer.Vector({
                source: markersSource,
                style: markerStyle,
            });
            var map = new ol.Map({
                controls: ol.control.defaults({
                    attributionOptions: {
                        collapsible: false,
                    },
                }),
                interactions: ol.interaction.defaults({ mouseWheelZoom: false }),
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                    }),
                    markersLayer,
                ],
                target: node,
                view: new ol.View({
                    center: _this.transformToMercator(parseFloat(center.lng), parseFloat(center.lat)),
                    zoom: 1,
                }),
            });
            _this.addMarkersFromQuery();
            _this.markersLayer = markersLayer;
            _this.map = map;
            _this.initializeMarkerPopup(map);
            window.addEventListener('resize', function () {
                map.updateSize();
            });
        }, 1000);
    };
    SemanticMap.prototype.handleDeprecatedLayout = function (props) {
        if (_.has(props, 'layout')) {
            console.warn('layout property in semantic-map is deprecated, please use flat properties instead');
            return props['layout']['tupleTemplate'];
        }
        else {
            return props.tupleTemplate;
        }
    };
    return SemanticMap;
}(components_1.Component));
exports.SemanticMap = SemanticMap;
exports.default = SemanticMap;
