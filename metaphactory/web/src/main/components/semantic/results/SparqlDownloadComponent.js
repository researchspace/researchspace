Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var fileSaver = require("file-saver");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var SparqlDownloadComponent = (function (_super) {
    tslib_1.__extends(SparqlDownloadComponent, _super);
    function SparqlDownloadComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSave = function () {
            var results = [];
            sparql_1.SparqlClient.sendStreamSparqlQuery(_this.props.query, _this.props.header, { context: _this.context.semanticContext }).onValue(function (response) {
                results.push(response);
            }).onEnd(function () {
                var blob = new Blob(results, { type: _this.props.header });
                fileSaver.saveAs(blob, _this.props.filename || 'file.txt');
            });
        };
        return _this;
    }
    SparqlDownloadComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var props = {
            onClick: this.onSave,
        };
        return react_1.cloneElement(child, props);
    };
    return SparqlDownloadComponent;
}(components_1.Component));
exports.component = SparqlDownloadComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
