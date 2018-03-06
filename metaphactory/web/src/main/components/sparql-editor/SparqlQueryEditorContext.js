Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var data_maybe_1 = require("data.maybe");
exports.ContextTypes = {
    queryEditorContext: react_1.PropTypes.object,
};
var SparqlQueryEditorContext = (function (_super) {
    tslib_1.__extends(SparqlQueryEditorContext, _super);
    function SparqlQueryEditorContext(props) {
        var _this = _super.call(this, props) || this;
        _this.query = data_maybe_1.Nothing();
        _this.queryPool = Kefir.pool();
        _this.queryPool.plug(Kefir.constant(data_maybe_1.Nothing()));
        return _this;
    }
    SparqlQueryEditorContext.prototype.getChildContext = function () {
        var _this = this;
        var queryEditorContext = {
            getQuery: function () { return _this.query; },
            setQuery: function (query, options) {
                if (options === void 0) { options = {}; }
                _this.query = data_maybe_1.Just(query);
                if (!options.silent) {
                    _this.queryPool.plug(Kefir.constant(_this.query));
                }
            },
            queryChanges: this.queryPool
                .flatMapLatest(function (query) { return Kefir.constant(query); })
                .toProperty()
                .changes(),
        };
        return { queryEditorContext: queryEditorContext };
    };
    SparqlQueryEditorContext.prototype.render = function () {
        return react_1.Children.only(this.props.children);
    };
    return SparqlQueryEditorContext;
}(react_1.Component));
SparqlQueryEditorContext.childContextTypes = exports.ContextTypes;
exports.SparqlQueryEditorContext = SparqlQueryEditorContext;
exports.default = SparqlQueryEditorContext;
