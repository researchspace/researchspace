Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var events_1 = require("platform/api/events");
var sets_1 = require("platform/components/sets");
var overlay_1 = require("platform/components/ui/overlay");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var DIALOG_REF = 'save-as-set-dialog';
var SaveSetResultAction = (function (_super) {
    tslib_1.__extends(SaveSetResultAction, _super);
    function SaveSetResultAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSave = function () {
            overlay_1.getOverlaySystem().show(DIALOG_REF, react_1.createElement(sets_1.SaveSetDialog, {
                onSave: _this.saveInNewSet.bind(_this),
                onHide: function () { return overlay_1.getOverlaySystem().hide(DIALOG_REF); },
                maxSetSize: maybe.Nothing(),
            }));
        };
        _this.saveInNewSet = function (name) {
            var resultQuery = _this.context.resultQuery;
            return resultQuery.cata({
                Nothing: function () { return null; },
                Just: function (query) { return sparql_1.SparqlClient.select(query).onValue(function (resultSet) {
                    var projectionVariable = query.variables[0];
                    if (resultQuery.isNothing) {
                        return;
                    }
                    sets_1.createNewSetFromItems(_this.props.id, name, resultSet.results.bindings.map(function (bindingSet) { return bindingSet[projectionVariable.substring(1)]; })).onValue(function () {
                        return overlay_1.getOverlaySystem().hide(DIALOG_REF);
                    });
                }); },
            });
        };
        return _this;
    }
    SaveSetResultAction.prototype.render = function () {
        return react_1.cloneElement(react_1.Children.only(this.props.children), {
            onClick: this.onSave,
        });
    };
    return SaveSetResultAction;
}(react_1.Component));
SaveSetResultAction.contextTypes = tslib_1.__assign({}, SemanticSearchApi_1.ResultContextTypes, events_1.GlobalEventsContextTypes);
exports.component = SaveSetResultAction;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
