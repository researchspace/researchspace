Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var Either = require("data.either");
var maybe = require("data.maybe");
var async_1 = require("platform/api/async");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var Table_1 = require("./Table");
function isRowConfig(config) {
    return _.has(config, 'tupleTemplate');
}
var SemanticTable = (function (_super) {
    tslib_1.__extends(SemanticTable, _super);
    function SemanticTable(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.querying = _this.cancellation.derive();
        _this.TABLE_REF = 'table';
        _this.prepareConfigAndExecuteQuery = function (props, context) {
            _this.setState({
                isLoading: true,
            });
            _this.querying = _this.cancellation.deriveAndCancel(_this.querying);
            var loading = _this.querying.map(sparql_1.SparqlClient.select(props.query, { context: context.semanticContext })).onValue(function (res) { return _this.setState({ data: res, isLoading: false }); });
            if (_this.props.id) {
                _this.context.GLOBAL_EVENTS.trigger({
                    eventType: events_1.BuiltInEvents.ComponentLoading,
                    source: _this.props.id,
                    data: loading,
                });
            }
        };
        _this.state = {
            isLoading: true,
        };
        return _this;
    }
    SemanticTable.prototype.getSelected = function () {
        return this.refs[this.TABLE_REF].getSelected();
    };
    SemanticTable.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return nextState.isLoading !== this.state.isLoading || !_.isEqual(nextProps, this.props);
    };
    SemanticTable.prototype.componentWillReceiveProps = function (nextProps, context) {
        if (nextProps.query !== this.props.query) {
            this.prepareConfigAndExecuteQuery(nextProps, context);
        }
    };
    SemanticTable.prototype.componentDidMount = function () {
        this.prepareConfigAndExecuteQuery(this.props, this.context);
    };
    SemanticTable.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticTable.prototype.render = function () {
        return react_1.DOM.div({ className: 'semantic-table-holder' }, this.state.isLoading ? react_1.createElement(spinner_1.Spinner) :
            this.state.data && !sparql_1.SparqlUtil.isSelectResultEmpty(this.state.data) ?
                this.renderTable() : react_1.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } }));
    };
    SemanticTable.prototype.renderTable = function () {
        var layout = {
            tupleTemplate: maybe.fromNullable(isRowConfig(this.props) ? this.props.tupleTemplate : null),
            options: this.props.options,
        };
        layout = this.handleDeprecatedLayout(layout);
        var _a = this.props, currentPage = _a.currentPage, onControlledPropChange = _a.onControlledPropChange, otherProps = tslib_1.__rest(_a, ["currentPage", "onControlledPropChange"]);
        var controlledProps = {
            currentPage: currentPage,
            onPageChange: onControlledPropChange
                ? function (page) { return onControlledPropChange({ currentPage: page }); } : undefined,
        };
        return react_1.createElement(Table_1.Table, tslib_1.__assign({}, otherProps, controlledProps, { layout: maybe.fromNullable(layout), tupleTemplate: this.handleDeprecatedLayout(layout), numberOfDisplayedRows: maybe.fromNullable(this.props.numberOfDisplayedRows), data: Either.Right(this.state.data), ref: this.TABLE_REF }));
    };
    SemanticTable.prototype.handleDeprecatedLayout = function (layout) {
        if (_.has(this.props, 'layout')) {
            console.warn('layout property in semantic-table is deprecated, please use flat properties instead');
            layout.tupleTemplate = maybe.fromNullable(this.props['layout']['tupleTemplate']);
            layout.options = this.props['layout']['options'];
        }
        return layout;
    };
    return SemanticTable;
}(components_1.Component));
SemanticTable.propTypes = tslib_1.__assign({}, components_1.Component.propTypes, { onControlledPropChange: react_1.PropTypes.func });
exports.SemanticTable = SemanticTable;
exports.default = SemanticTable;
