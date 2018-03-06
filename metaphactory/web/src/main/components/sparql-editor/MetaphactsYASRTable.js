Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var Either = require("data.either");
var maybe = require("data.maybe");
var bindingsToCsv = require("yasgui-yasr/src/bindingsToCsv.js");
var classnames = require("classnames");
var sparql_1 = require("platform/api/sparql");
var table_1 = require("platform/components/semantic/table");
function table(jsonResult) {
    return (function (_super) {
        tslib_1.__extends(class_1, _super);
        function class_1(props, context) {
            var _this = _super.call(this, props, context) || this;
            _this.toggleLabel = function () {
                _this.setState(function (prevState, props) { return ({ showLabels: prevState.showLabels ? false : true }); });
            };
            _this.state = { showLabels: false };
            return _this;
        }
        class_1.prototype.render = function () {
            var table = react_1.createElement(table_1.Table, {
                key: 'sparql-endpoint-result-table',
                data: Either.Right(sparql_1.SparqlClient.sparqlJsonToSelectResult(jsonResult)),
                numberOfDisplayedRows: maybe.Nothing(),
                layout: maybe.Just({
                    options: { resultsPerPage: 10 },
                    tupleTemplate: maybe.Nothing(),
                    showLabels: this.state.showLabels,
                }),
            });
            var buttonLabel = this.state.showLabels ? 'Fetch Labels: ON' : 'Fetch Labels: OFF';
            var className = this.state.showLabels ? 'btn-success' : 'btn-danger';
            return react_1.DOM.div({}, [
                react_1.DOM.button({
                    key: 'sparql-endpoint-label-toogle-button',
                    className: classnames('pull-right btn', className),
                    onClick: this.toggleLabel,
                }, buttonLabel),
                table,
            ]);
        };
        return class_1;
    }(react_1.Component));
}
function MetaphactsYASRTable(yasr) {
    return {
        name: 'Table',
        draw: function () {
            react_dom_1.render(react_1.createElement(table(yasr.results.getAsJson())), yasr['resultsContainer'][0]);
        },
        canHandleResults: function () {
            return yasr.results
                && yasr.results.getVariables
                && yasr.results.getVariables()
                && yasr.results.getVariables().length > 0;
        },
        getPriority: function () {
            return 10;
        },
        getDownloadInfo: function () {
            if (!yasr.results) {
                return null;
            }
            else {
                return {
                    getContent: function () {
                        return bindingsToCsv(yasr.results.getAsJson());
                    },
                    filename: 'queryResults.csv',
                    contentType: 'text/csv',
                    buttonTitle: 'Download as CSV',
                };
            }
        },
    };
}
exports.MetaphactsYASRTable = MetaphactsYASRTable;
