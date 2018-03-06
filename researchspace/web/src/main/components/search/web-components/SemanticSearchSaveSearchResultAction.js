Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var react_1 = require("react");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var ldp_set_1 = require("platform/api/services/ldp-set");
var overlay_1 = require("platform/components/ui/overlay");
var sets_1 = require("platform/components/sets");
var ldp_query_1 = require("platform/api/services/ldp-query");
var search_1 = require("platform/components/semantic/search");
var Serialization_1 = require("platform/components/semantic/search/data/search/Serialization");
var SaveSearchResultAction = (function (_super) {
    tslib_1.__extends(SaveSearchResultAction, _super);
    function SaveSearchResultAction(props) {
        var _this = _super.call(this, props) || this;
        _this.dialogRef = 'save-search-dialog';
        _this.onSave = function () {
            overlay_1.getOverlaySystem().show(_this.dialogRef, react_1.createElement(sets_1.SaveSetDialog, {
                onSave: _this.saveAsNewSearch.bind(_this),
                onHide: function () { return overlay_1.getOverlaySystem().hide(_this.dialogRef); },
                maxSetSize: maybe.Nothing(),
                title: 'Save search',
                placeholder: 'Search name',
            }));
        };
        _this.saveAsNewSearch = function (name) {
            return !_this.context.resultQuery.isNothing ?
                ldp_query_1.QueryService().addItem({
                    value: sparql_1.SparqlUtil.serializeQuery(_this.context.resultQuery.get()),
                    queryType: 'SELECT',
                    type: 'query',
                    label: name,
                    structure: Serialization_1.serializeSearch(_this.context.baseQueryStructure.getOrElse(undefined), _this.context.facetStructure.getOrElse(undefined))
                }).flatMap(function (res) { return _this.props.addToDefaultSet ?
                    ldp_set_1.addToDefaultSet(res, _this.props.id) : Kefir.constant(res); }).onValue(function (value) {
                    overlay_1.getOverlaySystem().hide(_this.dialogRef);
                }) : null;
        };
        return _this;
    }
    SaveSearchResultAction.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var props = {
            onClick: this.onSave,
        };
        return react_1.cloneElement(child, props);
    };
    return SaveSearchResultAction;
}(react_1.Component));
SaveSearchResultAction.contextTypes = search_1.ResultContextTypes;
SaveSearchResultAction.defaultProps = {
    addToDefaultSet: false,
};
exports.component = SaveSearchResultAction;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
