Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var moment = require("moment");
var classnames = require("classnames");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var sparql_1 = require("platform/api/sparql");
var rdf_graph_store_1 = require("platform/api/services/rdf-graph-store");
require("./GraphActionLink.scss");
var GraphActionLink = (function (_super) {
    tslib_1.__extends(GraphActionLink, _super);
    function GraphActionLink() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            if (_this.props.action === 'DELETE') {
                rdf_graph_store_1.RDFGraphStoreService.deleteGraph(rdf_1.Rdf.iri(_this.props.graphuri))
                    .onValue(function (_) { return navigation_1.refresh(); })
                    .onError(function (error) {
                    alert(error);
                });
            }
            else if (_this.props.action === 'GET') {
                var acceptHeader = sparql_1.SparqlUtil.getMimeType(_this.props.fileEnding);
                var ending = _this.props.fileEnding && lodash_1.endsWith(_this.props.graphuri, _this.props.fileEnding)
                    ? ''
                    : '.' + _this.props.fileEnding;
                var fileName = lodash_1.startsWith(_this.props.graphuri, 'file:///')
                    ? _this.props.graphuri.replace('file:///', '') + ending
                    : 'graph-export-' + moment().format('YYYY-MM-DDTHH-m-s') + '.' + ending;
                rdf_graph_store_1.RDFGraphStoreService.downloadGraph(rdf_1.Rdf.iri(_this.props.graphuri), acceptHeader, fileName).onValue(function (v) { });
            }
        };
        return _this;
    }
    GraphActionLink.prototype.render = function () {
        return react_1.DOM.span({
            className: classnames(this.props.className, 'mp-rdf-graph-action'),
            onClick: this.onClick,
        }, this.props.children);
    };
    return GraphActionLink;
}(react_1.Component));
exports.GraphActionLink = GraphActionLink;
exports.default = GraphActionLink;
