Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var components_1 = require("platform/api/components");
var sparql_1 = require("platform/api/sparql");
var SparqlDownloadComponent_1 = require("platform/components/semantic/results/SparqlDownloadComponent");
var Button = react_1.createFactory(ReactBootstrap.Button);
var ActionDownloadComponent = (function (_super) {
    tslib_1.__extends(ActionDownloadComponent, _super);
    function ActionDownloadComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {};
        return _this;
    }
    ActionDownloadComponent.prototype.componentDidMount = function () {
        this.parseQuery(this.props);
    };
    ActionDownloadComponent.prototype.componentWillReceiveProps = function (props) {
        this.parseQuery(props);
    };
    ActionDownloadComponent.prototype.parseQuery = function (props) {
        var header = props.header;
        var filename = props.filename;
        if (!header) {
            var parsedQuery = sparql_1.SparqlUtil.parseQuerySync(props.component.props.query);
            if (parsedQuery.type !== 'query') {
                throw 'query type is not supported, expected SELECT or CONSTRUCT';
            }
            if (parsedQuery.queryType === 'SELECT') {
                header = 'text/csv';
                filename = props.filename || 'file.csv';
            }
            else if (parsedQuery.queryType === 'CONSTRUCT') {
                header = 'text/turtle';
                filename = props.filename || 'file.ttl';
            }
        }
        this.setState({ header: header, filename: filename });
    };
    ActionDownloadComponent.prototype.render = function () {
        var query = this.props.component.props.query;
        var _a = this.state, header = _a.header, filename = _a.filename;
        var child = react_1.Children.count(this.props.children) === 1 ?
            react_1.Children.only(this.props.children) :
            Button({ title: 'Download data' }, react_1.DOM.i({ className: 'fa fa-download' }));
        return SparqlDownloadComponent_1.factory({ query: query, header: header, filename: filename }, child);
    };
    return ActionDownloadComponent;
}(components_1.Component));
exports.ActionDownloadComponent = ActionDownloadComponent;
exports.default = ActionDownloadComponent;
