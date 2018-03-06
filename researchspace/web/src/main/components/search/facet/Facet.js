Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var spinner_1 = require("platform/components/ui/spinner");
var CategorySelector_1 = require("../query-builder/CategorySelector");
var RelationFacet_1 = require("./RelationFacet");
require("./Facet.scss");
var FacetComponent = (function (_super) {
    tslib_1.__extends(FacetComponent, _super);
    function FacetComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.renderLoadingIndicator = function () {
            var loading = _this.props.data.relations.some(function (rel) { return _.isUndefined(rel.available); });
            return loading ? [
                react_1.DOM.div({}, react_1.DOM.em({}, 'Searching for relations ...')),
                react_1.DOM.div({}, react_1.createElement(spinner_1.Spinner)),
            ] : [];
        };
        _this.onCategoryChange = function (clas) {
            var isToggleOff = _this.props.data.viewState.category.map(function (category) { return category.iri.equals(clas.iri); }).getOrElse(false);
            if (isToggleOff) {
                _this.props.actions.deselectCategory();
            }
            else {
                _this.props.actions.selectCategory(clas);
            }
        };
        return _this;
    }
    FacetComponent.prototype.render = function () {
        return react_1.DOM.div({ className: 'facet' }, this.props.data.categories.size > 1 ?
            react_1.DOM.div({ className: 'facet__category-selector-holder' }, CategorySelector_1.default({
                mode: this.props.data.viewState.selectorMode,
                tupleTemplate: this.props.data.viewState.categoryTemplate,
                entities: this.props.data.categories,
                actions: {
                    onValueChange: this.onCategoryChange,
                },
                selectedElement: this.props.data.viewState.category,
            })) : null, this.renderRelations());
    };
    FacetComponent.prototype.renderRelations = function () {
        var _this = this;
        return react_1.DOM.div.apply(react_1.DOM, [{ className: 'facet-relations' }].concat(this.renderLoadingIndicator(), [this.props.data.relations.filter(function (rel) { return rel.available !== false; }).map(function (relationEntity) {
                return RelationFacet_1.default({
                    key: relationEntity.iri.value,
                    relation: relationEntity,
                    data: _this.props.data,
                    actions: _this.props.actions,
                    config: _this.props.config
                });
            }).toArray()]));
    };
    return FacetComponent;
}(react_1.Component));
exports.FacetComponent = FacetComponent;
exports.Facet = react_1.createFactory(FacetComponent);
exports.default = exports.Facet;
