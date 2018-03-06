Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var classnames = require("classnames");
var _ = require("lodash");
var ReactSelect = require("react-select");
var template_1 = require("platform/components/ui/template");
var CategorySelectorComponent = (function (_super) {
    tslib_1.__extends(CategorySelectorComponent, _super);
    function CategorySelectorComponent() {
        var _this = _super.call(this) || this;
        _this.updateDisabledItems = function () {
            var disabled = _.reduce(_this.refs, function (acc, ref, key) {
                acc[key] = _this.hasDisabledChild(react_dom_1.findDOMNode(ref));
                return acc;
            }, {});
            if (_.isEqual(disabled, _this.state.isDisabled) == false) {
                _this.setState({
                    isDisabled: disabled,
                });
            }
        };
        _this.state = {
            isDisabled: {},
        };
        return _this;
    }
    CategorySelectorComponent.prototype.componentDidMount = function () {
        _.delay(this.updateDisabledItems, 1000, 'later');
    };
    CategorySelectorComponent.prototype.componentDidUpdate = function () {
        _.delay(this.updateDisabledItems, 1000, 'later');
    };
    CategorySelectorComponent.prototype.render = function () {
        return this.props.mode === 'dropdown'
            ? this.renderCategoryDropdown()
            : this.renderCategoryButtons();
    };
    CategorySelectorComponent.prototype.renderCategoryButtons = function () {
        var _this = this;
        var fcButtons = this.props.entities.map(function (entity) {
            var isSelectedElement = _this.props.selectedElement.map(function (selected) { return entity.iri.value === selected.iri.value; }).getOrElse(false);
            return react_1.DOM.li({ key: entity.iri.value }, react_1.createElement(template_1.TemplateItem, {
                ref: entity.iri.value,
                componentProps: {
                    disabled: _this.state.isDisabled[entity.iri.value] == true,
                    className: classnames({
                        'btn': true,
                        'btn-default': true,
                        'category-item-holder': true,
                        'category-item-holder--active': isSelectedElement,
                    }),
                    title: entity.label,
                    'data-rdfa-about': entity.iri.value,
                    onClick: function (event) {
                        if (_this.hasDisabledChild(event.currentTarget) == false) {
                            event.currentTarget.blur();
                            _this.props.actions.onValueChange(entity);
                        }
                    },
                },
                template: {
                    source: _this.props.tupleTemplate,
                    options: entity.tuple,
                },
            }));
        });
        return react_1.DOM.ol({
            className: 'category-selector',
        }, fcButtons.toArray());
    };
    CategorySelectorComponent.prototype.renderCategoryDropdown = function () {
        var _this = this;
        var selectedCategory = this.props.selectedElement.map(function (category) {
            var selectedIri = category.iri.value;
            return _this.props.entities.find(function (c) { return c.iri.value === selectedIri; });
        }).getOrElse(null);
        return react_1.createElement(ReactSelect, {
            className: 'category-selector',
            placeholder: 'Select category',
            value: selectedCategory,
            options: this.props.entities.toArray(),
            optionRenderer: function (entity) {
                var isSelectedElement = selectedCategory &&
                    entity.iri.value === selectedCategory.iri.value;
                return react_1.createElement(template_1.TemplateItem, {
                    key: entity.iri.value,
                    ref: entity.iri.value,
                    template: {
                        source: _this.props.tupleTemplate,
                        options: entity.tuple,
                    },
                    componentProps: {
                        disabled: _this.state.isDisabled[entity.iri.value] == true,
                        className: classnames({
                            'btn': true,
                            'btn-default': true,
                            'category-item-holder': true,
                            'category-item-holder--active': isSelectedElement,
                        }),
                        title: entity.label,
                        'data-rdfa-about': entity.iri.value,
                    }
                });
            },
            onChange: function (selected) {
                if (selected && selected !== selectedCategory) {
                    _this.props.actions.onValueChange(selected);
                }
                else if (!selected && selectedCategory) {
                    _this.props.actions.onValueChange(selectedCategory);
                }
            },
        });
    };
    CategorySelectorComponent.prototype.hasDisabledChild = function (elem) {
        return _.some(elem.children, function (c) { return c['dataset']['disabled'] == 'true'; });
    };
    return CategorySelectorComponent;
}(react_1.Component));
exports.CategorySelectorComponent = CategorySelectorComponent;
exports.CategorySelector = react_1.createFactory(CategorySelectorComponent);
exports.default = exports.CategorySelector;
