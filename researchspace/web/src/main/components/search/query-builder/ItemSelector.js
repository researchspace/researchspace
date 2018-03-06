Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var classnames = require("classnames");
var _ = require("lodash");
var Maybe = require("data.maybe");
var ReactSelect = require("react-select");
var template_1 = require("platform/components/ui/template");
var styles = require("./ItemSelector.scss");
var StackSelector = (function (_super) {
    tslib_1.__extends(StackSelector, _super);
    function StackSelector(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.focusItem = function (resource) {
            _this.setState({ focusedOption: Maybe.Just(resource) });
        };
        _this.handleKeyDown = function (event) {
            switch (event.keyCode) {
                case 13:
                    _this.state.focusedOption.map(_this.props.actions.selectResource);
                    break;
                case 38:
                    _this.focusPreviousOption();
                    break;
                case 40:
                    _this.focusNextOption();
                    break;
                case 9:
                    _this.focusNextOption();
                    break;
            }
            event.preventDefault();
        };
        _this.focusNextOption = function () {
            _this.setState(function (state) { return ({
                focusedOption: state.focusedOption.map(function (option) {
                    var optionsSeq = _this.props.resources.keySeq();
                    var focusedIndex = optionsSeq.indexOf(option.iri);
                    var newIndex = focusedIndex + 1;
                    var newKey = optionsSeq.size === newIndex
                        ? optionsSeq.first() : optionsSeq.get(newIndex);
                    return _this.props.resources.get(newKey);
                }),
            }); });
        };
        _this.focusPreviousOption = function () {
            _this.setState(function (state) { return ({
                focusedOption: state.focusedOption.map(function (option) {
                    var optionsSeq = _this.props.resources.keySeq();
                    var focusedIndex = optionsSeq.indexOf(option.iri);
                    var newIndex = focusedIndex - 1;
                    var newKey = optionsSeq.size === 0
                        ? optionsSeq.get(optionsSeq.size - 1) : optionsSeq.get(newIndex);
                    return _this.props.resources.get(newKey);
                }),
            }); });
        };
        _this.state = {
            focusedOption: Maybe.Nothing(),
        };
        return _this;
    }
    StackSelector.prototype.componentDidMount = function () {
        this.setState({ focusedOption: Maybe.fromNullable(this.props.resources.first()) });
    };
    StackSelector.prototype.componentDidUpdate = function () {
        var _this = this;
        this.state.focusedOption.map(function (option) { return _this.refs[option.iri.value].focus(); });
    };
    StackSelector.prototype.render = function () {
        var _this = this;
        var _a = this.props, tupleTemplate = _a.tupleTemplate, className = _a.className, resources = _a.resources, actions = _a.actions, itemClassName = _a.itemClassName, label = _a.label;
        var fcButtons = resources.map(function (resource) {
            return React.createElement("li", { key: resource.iri.value, ref: resource.iri.value, className: classnames('btn', styles.itemHolder, itemClassName), tabIndex: 0, "aria-label": resource.label, role: 'option', onMouseOver: function () { return _this.focusItem(resource); }, onClick: function (event) { return _this.props.actions.selectResource(resource); } }, renderResource(tupleTemplate, resource, actions.selectResource));
        });
        return React.createElement("ul", { role: 'listbox', tabIndex: 0, "aria-label": label, onKeyDown: this.handleKeyDown, className: classnames(styles.itemSelector, className) }, fcButtons.toArray());
    };
    return StackSelector;
}(react_1.Component));
var DropdownSelector = (function (_super) {
    tslib_1.__extends(DropdownSelector, _super);
    function DropdownSelector() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSelectMounted = function (select) {
            if (select) {
                var node = react_dom_1.findDOMNode(select);
                node.setAttribute('aria-label', _this.props.label);
            }
        };
        return _this;
    }
    DropdownSelector.prototype.render = function () {
        var _a = this.props, tupleTemplate = _a.tupleTemplate, className = _a.className, resources = _a.resources, actions = _a.actions, itemClassName = _a.itemClassName;
        return (React.createElement(ReactSelect, { ref: this.onSelectMounted, className: classnames(styles.itemSelector, styles.dropdown, className), autofocus: true, openOnFocus: true, value: null, options: resources.toArray(), optionRenderer: function (resource) { return renderResource(tupleTemplate, resource, actions.selectResource, itemClassName); }, onChange: function (resource) { return actions.selectResource(resource); } }));
    };
    return DropdownSelector;
}(react_1.Component));
function renderResource(template, resource, onClick, className) {
    var options = _.assign({}, resource.tuple, resource);
    return React.createElement(template_1.TemplateItem, {
        template: {
            source: template,
            options: options,
        },
        componentProps: {
            className: className
        },
    });
}
exports.renderResource = renderResource;
var ItemSelector = (function (_super) {
    tslib_1.__extends(ItemSelector, _super);
    function ItemSelector() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ItemSelector.prototype.render = function () {
        return this.props.mode === 'dropdown'
            ? React.createElement(DropdownSelector, tslib_1.__assign({}, this.props))
            : React.createElement(StackSelector, tslib_1.__assign({}, this.props));
    };
    return ItemSelector;
}(react_1.Component));
exports.ItemSelector = ItemSelector;
exports.default = ItemSelector;
