Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var classNames = require("classnames");
var components_1 = require("platform/api/components");
var Defaults_1 = require("platform/components/semantic/search/config/Defaults");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var Facet_1 = require("../facet/Facet");
var FacetStore_1 = require("../facet/FacetStore");
var SemanticSearchFacet = (function (_super) {
    tslib_1.__extends(SemanticSearchFacet, _super);
    function SemanticSearchFacet(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.toggleFilter = function () {
            return _this.setState(function (state) { return ({ showFacets: !state.showFacets }); });
        };
        _this.state = {
            facetData: null,
            actions: null,
            showFacets: props.openByDefault,
            updateFacetData: true,
            loadingFacetData: false,
            bigResultSet: false
        };
        return _this;
    }
    SemanticSearchFacet.prototype.componentWillReceiveProps = function (props, context) {
        var showFacets = this.state.showFacets;
        var canUpdateFacets = context.baseQuery.isJust && context.domain.isJust &&
            (showFacets || context.resultsStatus.loaded);
        var nextBaseQuery = context.baseQuery.getOrElse(null);
        var baseQueryChanged = !_.isEqual(this.currentBaseQuery, nextBaseQuery);
        if (!nextBaseQuery) {
            this.currentBaseQuery = null;
            this.setState({
                showFacets: props.openByDefault,
                facetData: null,
            });
        }
        else if (baseQueryChanged && canUpdateFacets) {
            this.currentBaseQuery = nextBaseQuery;
            this.setState({ updateFacetData: true });
        }
    };
    SemanticSearchFacet.prototype.shouldComponentUpdate = function (nextProps, nextState, nextContext) {
        if ((nextState.showFacets || nextContext.resultsStatus.loaded) &&
            nextState.updateFacetData && !nextState.loadingFacetData && this.currentBaseQuery) {
            this.createFacetStore(nextContext);
        }
        return true;
    };
    SemanticSearchFacet.prototype.createFacetStore = function (context) {
        var _this = this;
        var facetStore = new FacetStore_1.FacetStore({
            domain: context.domain.get(),
            baseConfig: context.baseConfig,
            baseQuery: this.currentBaseQuery,
            initialAst: context.facetStructure.getOrElse(undefined),
            searchProfileStore: context.searchProfileStore.get(),
            config: this.props,
        }, context);
        this.setState({
            loadingFacetData: true,
        });
        facetStore.getFacetData().observe({
            value: function (facetData) {
                _this.setState({
                    actions: facetStore.facetActions(),
                    facetData: facetData,
                    updateFacetData: false,
                    loadingFacetData: false,
                });
                _this.context.setFacetStructure(facetData.ast);
            },
        });
        facetStore.getFacetedQuery().onValue(function (query) { return _this.context.setFacetedQuery(query); });
    };
    SemanticSearchFacet.prototype.render = function () {
        if (this.context.baseQuery.isJust) {
            var facetIsShown = this.state.facetData && this.state.showFacets;
            return react_1.DOM.div({ className: 'semantic-facet-holder' }, this.state.facetData && this.state.showFacets ?
                Facet_1.default({
                    data: this.state.facetData,
                    actions: this.state.actions,
                    config: this.props
                }) : null, react_1.DOM.button({
                className: classNames({
                    'btn-xs': true,
                    'show-facet-button': true,
                    'show-facet-button__hide': facetIsShown,
                    'show-facet-button__show': !facetIsShown,
                }),
                onClick: this.toggleFilter,
            }, this.state.showFacets ? 'Hide Filter' : 'Show Filter'));
        }
        else {
            return null;
        }
    };
    return SemanticSearchFacet;
}(components_1.Component));
SemanticSearchFacet.contextTypes = tslib_1.__assign({}, SemanticSearchApi_1.FacetContextTypes, components_1.ContextTypes);
SemanticSearchFacet.defaultProps = {
    valueCategories: {},
    valueRelations: {},
    categories: {
        tupleTemplate: Defaults_1.DefaultFacetCategoriesTupleTemplate,
    },
    relations: {
        tupleTemplate: Defaults_1.DefaultFacetRelationTupleTemplate,
    },
    defaultValueQueries: {},
    defaultValueTemplate: Defaults_1.DefaultFacetValueTemplate,
    facetValuesThreshold: 10000,
};
exports.default = SemanticSearchFacet;
