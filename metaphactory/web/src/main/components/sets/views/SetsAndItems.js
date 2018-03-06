Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_dom_1 = require("react-dom");
var ReactCSSTransitionGroup = require("react-addons-css-transition-group");
var reorderable_list_1 = require("platform/components/ui/reorderable-list");
var dnd_1 = require("platform/components/dnd");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var SetsModel_1 = require("../SetsModel");
var SetManagementApi_1 = require("../SetManagementApi");
var ESCAPE_KEY_CODE = 27;
var ENTER_KEY_CODE = 13;
var OpenedSetView = (function (_super) {
    tslib_1.__extends(OpenedSetView, _super);
    function OpenedSetView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OpenedSetView.prototype.getChildContext = function () {
        var _this = this;
        return {
            'mp-set-management--set-view': {
                getCurrentSet: function () { return _this.props.set.iri; },
            },
        };
    };
    OpenedSetView.prototype.render = function () {
        var baseClass = this.props.baseClass;
        return React.createElement("div", { className: baseClass + "__opened-set" },
            React.createElement(SetCaption, tslib_1.__assign({}, this.props, { className: baseClass + "__open-set", icon: React.createElement("span", { className: 'fa fa-folder-open' }) })),
            React.createElement(ItemsView, tslib_1.__assign({ key: 'opened-set-items' }, this.props)));
    };
    return OpenedSetView;
}(React.Component));
OpenedSetView.childContextTypes = SetManagementApi_1.SetViewContextTypes;
exports.OpenedSetView = OpenedSetView;
var SetWithItems = (function (_super) {
    tslib_1.__extends(SetWithItems, _super);
    function SetWithItems() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.handleOnClick = function (e) {
            var actionHolder = react_dom_1.findDOMNode(_this).querySelector('.set-management__item-actions');
            if (!(actionHolder && actionHolder.contains(e.target))) {
                _this.props.onOpen(_this.props.set.iri);
            }
        };
        return _this;
    }
    SetWithItems.prototype.getChildContext = function () {
        var _this = this;
        return {
            'mp-set-management--set-view': {
                getCurrentSet: function () { return _this.props.set.iri; },
            },
        };
    };
    SetWithItems.prototype.render = function () {
        var _a = this.props, _b = _a.showItems, showItems = _b === void 0 ? true : _b, otherProps = tslib_1.__rest(_a, ["showItems"]);
        var baseClass = otherProps.baseClass, set = otherProps.set, onEditCompleted = otherProps.onEditCompleted;
        return React.createElement("li", { className: baseClass + "__set" },
            React.createElement(SetCaption, tslib_1.__assign({}, otherProps, { className: baseClass + "__set-caption", set: set, onCaptionClick: this.handleOnClick, onEditCompleted: onEditCompleted, icon: React.createElement("span", { className: showItems ? 'fa fa-folder-open' : 'fa fa-folder' }) })),
            showItems ? React.createElement(ItemsView, tslib_1.__assign({}, otherProps)) : undefined);
    };
    return SetWithItems;
}(React.Component));
SetWithItems.childContextTypes = SetManagementApi_1.SetViewContextTypes;
exports.SetWithItems = SetWithItems;
var SetCaption = (function (_super) {
    tslib_1.__extends(SetCaption, _super);
    function SetCaption() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SetCaption.prototype.render = function () {
        var _a = this.props, baseClass = _a.baseClass, className = _a.className, set = _a.set, icon = _a.icon;
        var isEditing = Boolean(set && set.editing);
        var caption = (React.createElement("div", { className: className, onClick: isEditing ? undefined : this.props.onCaptionClick },
            React.createElement("div", { className: baseClass + "__set-icon" }, icon),
            this.renderName(set),
            (set && typeof set.itemCount === 'number')
                ? React.createElement("span", { className: baseClass + "__set-item-count badge" }, set.itemCount)
                : undefined));
        return this.wrapDraggable(!isEditing, caption);
    };
    SetCaption.prototype.renderName = function (set) {
        if (!set) {
            return React.createElement(spinner_1.Spinner, null);
        }
        else if (set.editing) {
            var onEditCompleted = this.props.onEditCompleted;
            return React.createElement(EditableLabel, { editing: set.editing, onEditCompleted: onEditCompleted });
        }
        else {
            var baseClass = this.props.baseClass;
            return (React.createElement(template_1.TemplateItem, { componentProps: { className: baseClass + "__set-template" }, template: {
                    source: this.props.template(set.kind, true),
                    options: tslib_1.__assign({}, set.metadata, { iri: set.iri, kind: set.kind, itemCount: set.itemCount }),
                } }));
        }
    };
    SetCaption.prototype.wrapDraggable = function (shouldWrap, node) {
        var _a = this.props, set = _a.set, onDragStart = _a.onDragStart, onDragEnd = _a.onDragEnd;
        if (!set) {
            return null;
        }
        return shouldWrap ? (React.createElement(dnd_1.Draggable, { iri: set.iri.value, onDragStart: onDragStart, onDragEnd: onDragEnd }, node)) : node;
    };
    return SetCaption;
}(React.Component));
var EditableLabel = (function (_super) {
    tslib_1.__extends(EditableLabel, _super);
    function EditableLabel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onKeyDownWhileEditing = function (e) {
            if (e.keyCode === ENTER_KEY_CODE) {
                e.preventDefault();
                _this.props.onEditCompleted(e.currentTarget.value);
            }
            else if (e.keyCode === ESCAPE_KEY_CODE) {
                e.preventDefault();
                _this.props.onEditCompleted(undefined);
            }
        };
        _this.onBlurWhileEditing = function (e) {
            _this.props.onEditCompleted(undefined);
        };
        return _this;
    }
    EditableLabel.prototype.render = function () {
        var _a = this.props, editing = _a.editing, onEditCompleted = _a.onEditCompleted, otherProps = tslib_1.__rest(_a, ["editing", "onEditCompleted"]);
        if (editing.type === SetsModel_1.EditType.ApplyingChanges
            || editing.type === SetsModel_1.EditType.Rename && editing.fetchingName) {
            return React.createElement(spinner_1.Spinner, { spinnerDelay: 0 });
        }
        return (React.createElement("input", tslib_1.__assign({}, otherProps, { type: 'text', autoFocus: true, defaultValue: editing.newName, ref: function (input) { return input ? input.setSelectionRange(0, input.value.length) : null; }, onKeyDown: this.onKeyDownWhileEditing, onClick: function (e) { return e.stopPropagation(); }, onBlur: this.onBlurWhileEditing })));
    };
    return EditableLabel;
}(React.Component));
exports.EditableLabel = EditableLabel;
var ItemsView = (function (_super) {
    tslib_1.__extends(ItemsView, _super);
    function ItemsView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ItemsView.prototype.getChildContext = function () {
        var _this = this;
        return {
            'mp-set-management--set-view': {
                getCurrentSet: function () { return _this.props.set.iri; },
            },
        };
    };
    ItemsView.prototype.render = function () {
        return React.createElement("div", { className: this.props.baseClass + "__items-view" }, this.renderItemsPane());
    };
    ItemsView.prototype.renderItemsPane = function () {
        var _this = this;
        var _a = this.props, set = _a.set, itemsOrdering = _a.itemsOrdering, onOrderChanged = _a.onOrderChanged;
        if (set && set.loadingError) {
            return [React.createElement(notification_1.ErrorNotification, { key: 'error', errorMessage: set.loadingError })];
        }
        var setItems = set ? set.items : undefined;
        var renderedItems = setItems ? setItems.map(function (item) {
            return React.createElement(ItemView, tslib_1.__assign({ key: item.iri.value, item: item }, _this.props));
        }) : undefined;
        return [
            (!set || set.isLoading) ? React.createElement(spinner_1.Spinner, { key: 'spinner' }) : null,
            renderedItems ? (itemsOrdering
                ? React.createElement(reorderable_list_1.ReorderableList, { key: 'items', className: this.props.baseClass + "__set-items", ordering: itemsOrdering, onOrderChanged: onOrderChanged }, renderedItems)
                : React.createElement(ReactCSSTransitionGroup, { key: 'items', component: 'ul', className: this.props.baseClass + "__set-items", transitionName: 'set-items-animation', transitionEnterTimeout: 800, transitionLeaveTimeout: 500 }, renderedItems)) : null,
        ];
    };
    return ItemsView;
}(React.Component));
ItemsView.childContextTypes = SetManagementApi_1.SetViewContextTypes;
exports.ItemsView = ItemsView;
var ItemView = (function (_super) {
    tslib_1.__extends(ItemView, _super);
    function ItemView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ItemView.prototype.getChildContext = function () {
        var _this = this;
        return {
            'mp-set-management--set-item-view': {
                getItem: function () { return _this.props.item.itemHolder; },
            },
        };
    };
    ItemView.prototype.render = function () {
        var _a = this.props, template = _a.template, item = _a.item, baseClass = _a.baseClass, onDragEnd = _a.onDragEnd, onDragStart = _a.onDragStart, highlightedTerm = _a.highlightedTerm;
        return (React.createElement(dnd_1.Draggable, { key: item.iri.value, iri: item.iri.value, onDragStart: onDragStart, onDragEnd: onDragEnd },
            React.createElement("li", { className: baseClass + "__set-item", key: item.iri.value },
                React.createElement(template_1.TemplateItem, { template: {
                        source: template(item.kind, false),
                        options: tslib_1.__assign({}, item.metadata, { iri: item.iri, itemHolder: item.itemHolder, highlight: highlightedTerm }),
                    } }))));
    };
    return ItemView;
}(React.Component));
ItemView.childContextTypes = SetManagementApi_1.SetItemViewContextTypes;
