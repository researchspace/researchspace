Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var assign = require("object-assign");
var inputs_1 = require("platform/components/ui/inputs");
var OLMapSelection_1 = require("./OLMapSelection");
var styles = require("./MapSelectionOverlay.scss");
var MapSelectionOverlay = (function (_super) {
    tslib_1.__extends(MapSelectionOverlay, _super);
    function MapSelectionOverlay(props) {
        var _this = _super.call(this) || this;
        _this.confirmSelection = function () {
            _this.props.onSelect(_this.state.selection);
        };
        _this.onAreaSelected = function (selectedArea) {
            _this.setState(assign({}, _this.state, { selection: selectedArea }));
        };
        _this.state = {
            selection: undefined,
            zoomToOptions: undefined,
        };
        return _this;
    }
    MapSelectionOverlay.prototype.showPlaceSelector = function () {
        var _this = this;
        return React.createElement(inputs_1.AutoCompletionInput, {
            query: this.props.suggestionConfig.query,
            templates: {},
            actions: {
                onSelected: function (binding) {
                    _this.setState(assign({}, _this.state, {
                        zoomToOptions: {
                            lat: Number(binding['lat'].value),
                            long: Number(binding['long'].value),
                            zoomLevel: 10
                        },
                    }));
                },
            },
            placeholder: 'Search for place',
        });
    };
    MapSelectionOverlay.prototype.render = function () {
        return React.createElement("div", { className: styles.mapSelection },
            React.createElement("div", { className: styles.search }, this.showPlaceSelector()),
            React.createElement(OLMapSelection_1.OLMapSelection, { onSelect: this.onAreaSelected, zoomTo: this.state.zoomToOptions }),
            React.createElement("div", { className: styles.actions },
                React.createElement("div", { className: 'form-group' },
                    React.createElement("div", { className: 'btn-group', role: 'group' },
                        React.createElement("button", { type: 'cancel', className: "btn btn-danger", onClick: this.props.onCancel }, "Cancel"),
                        React.createElement("button", { type: 'submit', className: "btn btn-primary", disabled: !this.state.selection, onClick: this.confirmSelection }, "Select")))));
    };
    return MapSelectionOverlay;
}(react_1.Component));
exports.MapSelectionOverlay = MapSelectionOverlay;
exports.default = MapSelectionOverlay;
