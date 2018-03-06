Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var components_1 = require("platform/api/components");
var sparql_1 = require("platform/api/sparql");
var dnd_1 = require("platform/components/dnd");
var AbstractAutoCompletionInput_1 = require("./AbstractAutoCompletionInput");
var SEARCH_INPUT_VARIABLE = '__token__';
var AutoCompletionInput = (function (_super) {
    tslib_1.__extends(AutoCompletionInput, _super);
    function AutoCompletionInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.executeQuery = function (query) {
            return function (token, tokenVariable) {
                var parsedQuery = typeof query === 'string' ?
                    _this.replaceTokenAndParseQuery(query, tokenVariable, token) :
                    query;
                var luceneQuery = sparql_1.SparqlUtil.makeLuceneQuery(token);
                var queryWithToken = sparql_1.SparqlClient.setBindings(parsedQuery, (_a = {}, _a[SEARCH_INPUT_VARIABLE] = luceneQuery, _a));
                var context = _this.context.semanticContext;
                return sparql_1.SparqlClient.select(queryWithToken, { context: context }).map(function (res) { return res.results.bindings; });
                var _a;
            };
        };
        _this.replaceTokenAndParseQuery = function (queryString, tokenVariable, token) {
            var q = queryString;
            if (queryString.indexOf(SEARCH_INPUT_VARIABLE) === -1) {
                console.warn('Please use new $__token__ variable in autocomplete search.');
                q = queryString.replace(new RegExp('\\\?' + tokenVariable), token);
            }
            return sparql_1.SparqlUtil.parseQuerySync(q);
        };
        return _this;
    }
    AutoCompletionInput.prototype.render = function () {
        var _this = this;
        var result = react_1.createElement(AbstractAutoCompletionInput_1.AbstractAutoCompletionInput, assign({
            ref: function (comp) { _this.autoCompletion = comp; },
        }, this.props, {
            queryFn: this.executeQuery(this.props.query),
            defaultQueryFn: this.props.defaultQuery
                ? this.executeQuery(this.props.defaultQuery)
                : undefined,
            templates: this.props.templates || undefined,
            actions: {
                onSelected: this.props.actions.onSelected,
            },
        }));
        if (this.props.droppable) {
            return react_1.createElement(dnd_1.Droppable, {
                query: this.props.droppable.query,
                dropStyles: this.props.droppable.styles,
                dropComponents: this.props.droppable.components,
                onDrop: function (drop) {
                    _this.autoCompletion.setValue(drop);
                },
            }, result);
        }
        else {
            return result;
        }
    };
    AutoCompletionInput.prototype.getValue = function () {
        return this.autoCompletion.getValue();
    };
    AutoCompletionInput.prototype.focus = function () {
        return null;
    };
    return AutoCompletionInput;
}(components_1.Component));
exports.AutoCompletionInput = AutoCompletionInput;
