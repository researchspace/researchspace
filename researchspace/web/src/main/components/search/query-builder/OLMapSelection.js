Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_dom_1 = require("react-dom");
require("openlayers/css/ol.css");
var ol = require("openlayers");
var _ = require("lodash");
var classNames = require("classnames");
var styles = require("./OLMapSelection.scss");
var SelectType;
(function (SelectType) {
    SelectType[SelectType["Box"] = 0] = "Box";
    SelectType[SelectType["Circle"] = 1] = "Circle";
})(SelectType = exports.SelectType || (exports.SelectType = {}));
var MAP_REF = 'metaphacts-map-selection';
var OLMapSelection = (function (_super) {
    tslib_1.__extends(OLMapSelection, _super);
    function OLMapSelection(props) {
        var _this = _super.call(this, props) || this;
        _this.geometryFunction = function (coordinates, geometry) {
            if (!geometry) {
                geometry = new ol.geom.Polygon(null);
            }
            var start = coordinates[0];
            var end = coordinates[1];
            geometry.setCoordinates([
                [start, [start[0], end[1]], end, [end[0], start[1]], start],
            ]);
            return geometry;
        };
        _this.state = {
            selectionTool: SelectType.Box,
        };
        return _this;
    }
    OLMapSelection.prototype.componentDidMount = function () {
        var _this = this;
        this.vectorSource = new ol.source.Vector({ wrapX: false });
        var vectorStyle = new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
            stroke: new ol.style.Stroke({
                color: '#ffcc33',
                width: 2,
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: '#ffcc33',
                }),
            }),
        });
        var vector_draw = new ol.layer.Vector({
            source: this.vectorSource,
            style: vectorStyle,
        });
        this.view = new ol.View({
            center: ol.proj.fromLonLat([0, 0], undefined),
            zoom: 3,
        });
        this.map = new ol.Map({
            target: react_dom_1.findDOMNode(this.refs[MAP_REF]),
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                }), vector_draw,
            ],
            controls: ol.control.defaults({
                attributionOptions: ({
                    collapsible: false,
                }),
            }),
            view: this.view,
        });
        this.updateCurrentDraw();
        this.vectorSource.on('change', function (e) {
            if (_this.vectorSource.getFeatures().length > 0) {
                _this.updateSelection();
            }
        });
    };
    OLMapSelection.prototype.componentWillReceiveProps = function (props) {
        if (props.zoomTo) {
            this.view.setCenter(ol.proj.transform([props.zoomTo.long, props.zoomTo.lat], 'EPSG:4326', 'EPSG:3857'));
            this.view.setZoom(props.zoomTo.zoomLevel);
        }
    };
    OLMapSelection.prototype.transformToWGS84 = function (metacor) {
        var wgs84 = ol.proj.transform(metacor, 'EPSG:3857', 'EPSG:4326');
        return wgs84;
    };
    OLMapSelection.prototype.wrapLongitudeOL = function (wgs84) {
        var long = wgs84[0], lat = wgs84[1];
        return [this.wrapLong(long), lat];
    };
    OLMapSelection.prototype.wrapLongitude = function (wgs84) {
        var lat = wgs84.lat, long = wgs84.long;
        return { lat: lat, long: this.wrapLong(long) };
    };
    OLMapSelection.prototype.wrapLong = function (long) {
        while (long > 180) {
            long = long - 360;
        }
        while (long < -180) {
            long = long + 360;
        }
        return long;
    };
    OLMapSelection.prototype.updateSelection = function () {
        var feature = this.vectorSource.getFeatures()[0];
        var selectedArea;
        switch (this.state.selectionTool) {
            case SelectType.Box:
                var olCoords = feature.getGeometry().getCoordinates()[0];
                var coords = _.map(olCoords, this.transformToWGS84);
                var firstPoint = { lat: coords[0][1], long: coords[0][0] };
                var secondPoint = { lat: coords[2][1], long: coords[2][0] };
                var southWest = {
                    lat: _.minBy([firstPoint, secondPoint], function (point) { return point.lat; }).lat,
                    long: _.minBy([firstPoint, secondPoint], function (point) { return point.long; }).long,
                };
                var northEast = {
                    lat: _.maxBy([firstPoint, secondPoint], function (point) { return point.lat; }).lat,
                    long: _.maxBy([firstPoint, secondPoint], function (point) { return point.long; }).long,
                };
                if (northEast.long - southWest.long >= 360) {
                    northEast.long = 180;
                    southWest.long = -180;
                }
                selectedArea = { type: SelectType.Box, box: {
                        southWest: this.wrapLongitude(southWest),
                        northEast: this.wrapLongitude(northEast),
                    } };
                break;
            case SelectType.Circle: {
                var circle = feature.getGeometry();
                var olCenter = circle.getCenter();
                var olRadius = circle.getRadius();
                var edgeCoordinate = this.transformToWGS84([olCenter[0] + olRadius, olCenter[1]]);
                var wgs84Sphere = new ol.Sphere(6378137);
                var center = this.transformToWGS84(olCenter);
                var radius = wgs84Sphere.haversineDistance(center, edgeCoordinate);
                var wrappedCenter = this.wrapLongitudeOL(center);
                selectedArea = { type: SelectType.Circle, circle: {
                        center: { lat: wrappedCenter[1], long: wrappedCenter[0] },
                        distance: radius / 1000,
                    } };
                break;
            }
        }
        this.props.onSelect(selectedArea);
    };
    OLMapSelection.prototype.updateCurrentDraw = function () {
        var _this = this;
        if (this.currentDraw) {
            this.map.removeInteraction(this.currentDraw);
        }
        this.currentDraw = new ol.interaction.Draw({
            source: this.vectorSource,
            type: this.state.selectionTool === SelectType.Box ? 'LineString' : 'Circle',
            geometryFunction: (this.state.selectionTool === SelectType.Box ? this.geometryFunction : undefined),
            maxPoints: 2,
            wrapX: false,
        });
        this.currentDraw.on('drawstart', function (event) { return _this.vectorSource.clear(); });
        this.map.addInteraction(this.currentDraw);
    };
    OLMapSelection.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevState.selectionTool !== this.state.selectionTool) {
            this.updateCurrentDraw();
        }
    };
    OLMapSelection.prototype.setSelectionTool = function (tool) {
        this.setState(_.assign({}, this.state, { selectionTool: tool }));
    };
    OLMapSelection.prototype.render = function () {
        var _this = this;
        var selectionTool = this.state.selectionTool;
        return React.createElement("div", { className: styles.body },
            React.createElement("div", { className: styles.tools },
                React.createElement("div", { className: styles.btnsWrap, role: 'group' },
                    React.createElement("button", { onClick: function () { return _this.setSelectionTool(SelectType.Box); }, className: classNames(styles.toolsBtnSquare, (_a = {}, _a[styles.btnActive] = selectionTool === SelectType.Box, _a)) }),
                    React.createElement("button", { onClick: function () { return _this.setSelectionTool(SelectType.Circle); }, className: classNames(styles.toolsBtnCircle, (_b = {}, _b[styles.btnActive] = selectionTool === SelectType.Circle, _b)) }))),
            React.createElement("div", { className: styles.map, ref: MAP_REF }));
        var _a, _b;
    };
    return OLMapSelection;
}(React.Component));
exports.OLMapSelection = OLMapSelection;
exports.default = OLMapSelection;
