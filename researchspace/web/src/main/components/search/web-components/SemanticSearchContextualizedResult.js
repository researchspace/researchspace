Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var ReactSelect = require("react-select");
var _ = require("lodash");
var Maybe = require("data.maybe");
var react_bootstrap_1 = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var template_1 = require("platform/components/ui/template");
var SearchConfig_1 = require("platform/components/semantic/search/config/SearchConfig");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var styles = require("./SemanticSearchContextualizedResult.scss");
var SemanticSearchContextualizedResult = (function (_super) {
    tslib_1.__extends(SemanticSearchContextualizedResult, _super);
    function SemanticSearchContextualizedResult(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.getBindings = function () {
            return _this.state.relation.map(function (relation) {
                return (_a = {}, _a[SearchConfig_1.RESULT_VARIABLES.CONTEXT_RELATION_VAR] = relation.iri, _a);
                var _a;
            }).getOrElse({});
        };
        _this.initialState = function (profileStore, ranges) {
            var relations = _.uniq(_.flatten(ranges.map(function (range) { return _this.getAvailableRelations(profileStore, range); })));
            return {
                relations: relations,
                relation: _.isEmpty(relations) ? Maybe.Nothing() : Maybe.Just(_.head(relations)),
            };
        };
        _this.getAvailableRelations = function (profileStore, range) {
            var rangeCategory = Maybe.fromNullable(profileStore.categories.get(range));
            return profileStore.relationsFor({
                domain: _this.context.domain,
                range: rangeCategory,
            }).valueSeq().toJS();
        };
        _this.contextSelector = function (profileStore) {
            var relationsOptions = _.map(_this.state.relations, function (relation) { return ({ value: relation, label: relation.label }); });
            return React.createElement(ReactSelect, { className: styles.contextSelector, options: relationsOptions, clearable: false, value: _this.state.relation.getOrElse(undefined), optionRenderer: _this.customSuggestionRenderer(_this.props.tupleTemplate), valueRenderer: _this.customValueRenderer(_this.props.tupleTemplate), onChange: _this.selectRelation, placeholder: 'Select Context' });
        };
        _this.selectRelation = function (option) {
            return _this.setState({ relation: Maybe.Just(option.value) });
        };
        _this.customValueRenderer = function (template) { return function (option) {
            return React.createElement(template_1.TemplateItem, {
                template: {
                    source: template,
                    options: option,
                },
            });
        }; };
        _this.customSuggestionRenderer = function (template) { return function (option) {
            return React.createElement(template_1.TemplateItem, {
                template: {
                    source: template,
                    options: option.value,
                },
            });
        }; };
        var initialState = context.searchProfileStore.map(function (profileStore) { return _this.initialState(profileStore, props.ranges.map(rdf_1.Rdf.iri)); }).getOrElse({
            relation: Maybe.Nothing(),
            relations: [],
        });
        _this.state = initialState;
        return _this;
    }
    SemanticSearchContextualizedResult.prototype.getChildContext = function () {
        return _.assign({}, this.context, {
            bindings: this.getBindings(),
        });
    };
    SemanticSearchContextualizedResult.prototype.render = function () {
        return React.createElement("div", { className: styles.holder },
            React.createElement(react_bootstrap_1.FormGroup, { className: styles.selectorGroup },
                React.createElement(react_bootstrap_1.ControlLabel, null, "Visualization Context"),
                this.context.searchProfileStore.map(this.contextSelector).getOrElse(React.createElement("span", null))),
            React.Children.only(this.props.children));
    };
    return SemanticSearchContextualizedResult;
}(React.Component));
SemanticSearchContextualizedResult.contextTypes = SemanticSearchApi_1.ResultContextTypes;
SemanticSearchContextualizedResult.childContextTypes = SemanticSearchApi_1.ResultContextTypes;
SemanticSearchContextualizedResult.defaultProps = {
    tupleTemplate: "\n        <span title=\"{{label}}\" style=\"display: flex; align-items: center; height: 40px;\">\n          {{label}}\n          {{#ifCond hasRange.thumbnail.length '>' 0}}\n          <img style=\"margin-left: auto; width: 30px; margin-right: 10px\"\n               src=\"{{hasRange.thumbnail}}\"/>\n          {{else}}\n            <span style=\"margin-left: 10px\">  [{{hasRange.label}}]</span>\n          {{/ifCond}}\n        </span>\n    ",
};
exports.default = SemanticSearchContextualizedResult;
