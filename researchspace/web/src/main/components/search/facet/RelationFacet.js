Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var InfiniteComponent = require("react-infinite");
var classnames = require("classnames");
var nlp = require("nlp_compromise");
var _ = require("lodash");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var inputs_1 = require("platform/components/ui/inputs");
var F = require("platform/components/semantic/search/data/facet/Model");
var FacetValue_1 = require("./FacetValue");
var FacetSlider_1 = require("./slider/FacetSlider");
var Infinite = react_1.createFactory(InfiniteComponent);
var RelationFacetComponent = (function (_super) {
    tslib_1.__extends(RelationFacetComponent, _super);
    function RelationFacetComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderRelation = function () {
            return react_1.DOM.div({ className: 'facet__relation' }, react_1.DOM.div({
                className: 'facet__relation__header',
                onClick: _this.onRelationClick().bind(_this),
            }, react_1.DOM.i({
                className: classnames({
                    'facet__relation__header__icon--selected': _this.isSelectedRelation(),
                    'facet__relation__header__icon': !_this.isSelectedRelation(),
                }),
            }), react_1.createElement(template_1.TemplateItem, {
                template: {
                    source: _this.props.data.viewState.relationTemplate,
                    options: _this.props.relation.tuple,
                },
            }), _this.isSelectedRelation() && _this.props.data.viewState.values.loading ? react_1.createElement(spinner_1.Spinner) : react_1.DOM.span({})), _this.isSelectedRelation() && !_this.props.data.viewState.values.loading ?
                _this.renderRelationFacetBody(_this.props.data.viewState) : react_1.DOM.div({}));
        };
        _this.isSelectedRelation = function () {
            return _this.props.data.viewState.relation.map(function (res) { return res.iri.equals(_this.props.relation.iri); }).getOrElse(false);
        };
        _this.state = {};
        return _this;
    }
    RelationFacetComponent.prototype.render = function () {
        return this.props.relation.available === true ? this.renderRelation() : null;
    };
    RelationFacetComponent.prototype.renderRelationFacetBody = function (viewState) {
        var relationType = viewState.relationType, values = viewState.values;
        if (relationType === 'resource' || relationType === 'literal') {
            return this.renderFacetValues(values.values, relationType);
        }
        else if (relationType === 'numeric-range' || relationType === 'date-range') {
            return this.renderSlider(values.values, relationType);
        }
        return null;
    };
    RelationFacetComponent.prototype.renderFacetValues = function (facetValues, kind) {
        var _this = this;
        var rangeLabel = this.props.relation.hasRange.label;
        var filterString = this.state.filterString ? this.state.filterString : '';
        var showNoFacetValuesWarning = facetValues.length === 0
            && !this.props.data.viewState.values.loading;
        var showTooManyFacetValuesWarning = this.props.config.facetValuesThreshold > 0
            && facetValues.length > this.props.config.facetValuesThreshold;
        if (this.props.data.viewState.values.error) {
            return react_1.DOM.div({ className: 'facet__relation__values' }, react_1.DOM.em({}, 'An error has occurred! Probably, there are too many facet values for the selected relation. Please, try to refine your search.'));
        }
        else if (showNoFacetValuesWarning) {
            return react_1.DOM.div({ className: 'facet__relation__values' }, react_1.DOM.em({}, 'Values not found...'));
        }
        else {
            return react_1.DOM.div({ className: 'facet__relation__values' }, showTooManyFacetValuesWarning ? react_1.DOM.em({ className: 'facet__relation__warning' }, "Only first " + this.props.config.facetValuesThreshold + " facet values are shown! Please refine your search ") : null, react_1.createElement(inputs_1.ClearableInput, {
                type: 'text',
                className: 'facet__relation__values__filter',
                placeholder: "Search " + nlp.noun(rangeLabel).pluralize() + "...",
                value: filterString,
                onClear: function () { return _this.setState({ filterString: undefined }); },
                onChange: function (event) {
                    var value = event.target.value;
                    _this.setState({ filterString: value });
                },
            }), Infinite({
                elementHeight: 20,
                containerHeight: 250,
            }, facetValues.filter(function (facetValue) {
                var text = kind === 'resource' ? facetValue.label : facetValue.literal.value;
                return !filterString || text.toLowerCase().indexOf(filterString.toLowerCase()) >= 0;
            }).map(function (facetValue) { return FacetValue_1.default({
                key: kind === 'resource' ? facetValue.iri.value : facetValue.literal.value,
                kind: kind,
                facetValue: {
                    entity: facetValue,
                    tupleTemplate: _this.props.data.viewState.valuesTemplate,
                    selected: _this.isTermSelected(facetValue),
                },
                highlight: filterString,
                actions: {
                    selectFacetValue: _this.props.actions.selectFacetValue(_this.props.relation),
                    deselectFacetValue: _this.props.actions.deselectFacetValue(_this.props.relation),
                },
            }); })));
        }
    };
    RelationFacetComponent.prototype.renderSlider = function (facetValues, kind) {
        var _this = this;
        var value = maybe.fromNullable(_.find(this.props.data.ast.conjuncts, function (c) { return c.relation.iri.equals(_this.props.relation.iri); })).chain(function (conjunct) {
            if (_.isEmpty(conjunct.disjuncts)) {
                return maybe.Nothing();
            }
            else {
                return maybe.Just(_.head(conjunct.disjuncts).value);
            }
        });
        return FacetSlider_1.FacetSlider({
            kind: kind,
            data: facetValues,
            value: value,
            actions: {
                toggleFacetValue: this.props.actions.selectFacetValue(this.props.relation)
            }
        });
    };
    RelationFacetComponent.prototype.onRelationClick = function () {
        var _this = this;
        return function () {
            if (_this.isSelectedRelation()) {
                _this.props.actions.deselectRelation();
            }
            else {
                _this.props.actions.selectRelation(_this.props.relation);
            }
        };
    };
    RelationFacetComponent.prototype.isTermSelected = function (facetValueEntity) {
        return maybe.fromNullable(this.props.data.viewState.selectedValues.get(this.props.relation)).chain(function (values) { return maybe.fromNullable(values.find(function (value) { return F.partialValueEquals(value, facetValueEntity); })); }).map(function (_) { return true; }).getOrElse(false);
    };
    return RelationFacetComponent;
}(react_1.PureComponent));
exports.RelationFacetComponent = RelationFacetComponent;
exports.RelationFacet = react_1.createFactory(RelationFacetComponent);
exports.default = exports.RelationFacet;
