Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var nlp = require("nlp_compromise");
var classNames = require("classnames");
var Model = require("platform/components/semantic/search/data/search/Model");
var ModelUtils_1 = require("platform/components/semantic/search/data/search/ModelUtils");
var styles = require("./SearchSummary.scss");
var SearchSummary = (function (_super) {
    tslib_1.__extends(SearchSummary, _super);
    function SearchSummary() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.domainText = function (domain) {
            var domainText = nlp.noun(domain.label).pluralize();
            return {
                className: styles.domain,
                text: domainText,
            };
        };
        _this.clausesText = function (clauses) {
            return _.dropRight(_(clauses).map(_this.clauseText).reduce(_this.reduceClauses, []), 1);
        };
        _this.reduceClauses = function (list, clause) {
            var disjuncts = _(clause.disjuncts).map(function (term) { return [term, _this.orSeparator()]; }).flatten().dropRight(1).value();
            return list.concat(clause.chunks, disjuncts, [_this.andSeparator()]);
        };
        _this.clauseText = function (clause) {
            return Model.matchConjunct({
                Relation: _this.relationConjunctText,
                Text: _this.textConjunctText,
            })(clause);
        };
        _this.textConjunctText = function (conjunct) {
            return ({
                chunks: [],
                disjuncts: _this.disjunctsText(conjunct.disjuncts),
            });
        };
        _this.relationConjunctText = function (conjunct) {
            var relationText = conjunct.relation.label;
            return {
                chunks: [{
                        className: styles.relation,
                        text: relationText,
                    }],
                disjuncts: _this.disjunctsText(conjunct.disjuncts),
            };
        };
        _this.disjunctsText = function (disjunct) {
            return _.map(disjunct, _this.disjunctText);
        };
        _this.disjunctText = function (disjunct) {
            if (disjunct.kind === Model.EntityDisjunctKinds.Search) {
                return {
                    className: styles[disjunct.kind],
                    text: disjunct.value.domain.label + ' where ' + SearchSummary.summaryToString(disjunct.value),
                };
            }
            else {
                return {
                    className: styles[disjunct.kind],
                    text: ModelUtils_1.disjunctToString(disjunct),
                };
            }
        };
        _this.orSeparator = function () {
            return ({
                className: styles.separator,
                text: 'or',
            });
        };
        _this.andSeparator = function () {
            return ({
                className: styles.separator,
                text: 'and',
            });
        };
        return _this;
    }
    SearchSummary.prototype.render = function () {
        return react_1.DOM.div({ className: 'search-summary' }, react_1.DOM.span({ className: styles.start }, this.props.search ? SearchSummary.VOCABULARY.SUMMARY_PREFIX : SearchSummary.VOCABULARY.EMPTY), this.props.search ? this.htmlSummary(this.props.search) : null);
    };
    SearchSummary.summaryToString = function (search) {
        var textAst = (new SearchSummary(null)).searchSummary(search);
        return _(textAst).map(function (statement) { return [statement.text, ' ']; }).flatten().dropRight(1).reduce(function (acc, x) { return acc + x; }, '');
    };
    SearchSummary.prototype.htmlSummary = function (search) {
        return this.searchSummary(search)
            .map(function (statement) {
            return react_1.DOM.span({ className: classNames(styles.word, statement.className) }, statement.text);
        });
    };
    SearchSummary.prototype.searchSummary = function (search) {
        return this.searchText(search);
    };
    SearchSummary.prototype.searchText = function (search) {
        return [this.domainText(search.domain)].concat(this.clausesText(search.conjuncts));
    };
    return SearchSummary;
}(react_1.Component));
SearchSummary.VOCABULARY = {
    EMPTY: 'What do you want to find?',
    SUMMARY_PREFIX: 'Find:',
    UNKNOWN_CLAUSE: 'unknow search clause type',
    RELATION_PLACEHOLDER: '... related to ...',
    PLACEHOLDER: '...',
};
exports.SearchSummary = SearchSummary;
exports.default = SearchSummary;
