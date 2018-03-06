Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var ReactBootstrap = require("react-bootstrap");
var classNames = require("classnames");
var maybe = require("data.maybe");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var DragAndDropApi_1 = require("./DragAndDropApi");
var OverlayTrigger = react_1.createFactory(ReactBootstrap.OverlayTrigger);
var Popover = react_1.createFactory(ReactBootstrap.Popover);
var Droppable = (function (_super) {
    tslib_1.__extends(Droppable, _super);
    function Droppable(props) {
        var _this = _super.call(this, props) || this;
        _this.setHandlers = function (target) {
            var child = react_1.Children.only(_this.props.children);
            if (target) {
                _this.target = react_dom_1.findDOMNode(target);
                window.addEventListener('mp-dragstart', _this.onDragStart);
                window.addEventListener('mp-dragend', _this.onDragEnd);
                _this.target.addEventListener('dragenter', _this.onDragEnter);
                _this.target.addEventListener('dragover', _this.onDragOver);
                _this.target.addEventListener('dragleave', _this.onDragLeave);
                _this.target.addEventListener('drop', _this.onDrop);
            }
            else if (_this.target) {
                window.removeEventListener('mp-dragstart', _this.onDragStart);
                window.removeEventListener('mp-dragend', _this.onDragEnd);
                _this.target.removeEventListener('dragenter', _this.onDragEnter);
                _this.target.removeEventListener('dragover', _this.onDragOver);
                _this.target.removeEventListener('dragleave', _this.onDragLeave);
                _this.target.removeEventListener('drop', _this.onDrop);
                _this.target = null;
            }
            if (child.ref && typeof child.ref === 'function') {
                child.ref(target);
            }
        };
        _this.onDragStart = function (e) {
            var dragged = rdf_1.Rdf.iri(e.detail.iri);
            if (_this.props.shouldReactToDrag && !_this.props.shouldReactToDrag(dragged)) {
                return;
            }
            _this.setState({ isSourceDragged: true });
            if (_this.props.query) {
                sparql_1.SparqlClient.prepareQuery(_this.props.query, [{ 'value': dragged }])
                    .flatMap(function (query) { return sparql_1.SparqlClient.ask(query, { context: { repository: _this.props.repository } }); })
                    .onValue(function (res) {
                    _this.setState({ isDropEnabledKnown: true, isDropEnabled: res });
                });
            }
            else {
                _this.setState({ isDropEnabled: true });
            }
        };
        _this.onDragEnter = function (e) {
            if (_this.state.isSourceDragged && _this.isEventInsideRect(e, _this.target)) {
                _this.setState({ isHover: true });
            }
        };
        _this.onDragLeave = function (e) {
            if (_this.state.isSourceDragged && !_this.isEventInsideRect(e, _this.target)) {
                _this.setState({ isHover: false });
            }
        };
        _this.onDragOver = function (e) {
            if (!_this.state.isSourceDragged) {
                return;
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            if (!_this.state.isDropEnabled) {
                e.dataTransfer.dropEffect = 'none';
            }
            return false;
        };
        _this.onDrop = function (e) {
            e.preventDefault();
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (!_this.state.isSourceDragged) {
                return;
            }
            if (_this.state.isDropEnabled) {
                var iriStr = void 0;
                try {
                    iriStr = e.dataTransfer.getData(DragAndDropApi_1.DRAG_AND_DROP_FORMAT);
                }
                catch (ex) {
                    iriStr = e.dataTransfer.getData(DragAndDropApi_1.DRAG_AND_DROP_FORMAT_IE);
                }
                var iri = maybe.fromNullable(iriStr).map(rdf_1.Rdf.iri);
                _this.setState({ iri: iri });
                if (_this.props.onDrop && !iri.isNothing) {
                    _this.props.onDrop(iri.get());
                }
            }
            return false;
        };
        _this.onDragEnd = function (e) {
            _this.setState({
                isSourceDragged: false,
                isDropEnabledKnown: false,
                isDropEnabled: false,
                isHover: false,
            });
        };
        _this.showDisabledHover = function (state) {
            return state.isDropEnabledKnown && !state.isDropEnabled && state.isHover;
        };
        _this.state = {
            iri: maybe.Nothing(),
            isSourceDragged: false,
            isDropEnabledKnown: false,
            isDropEnabled: false,
            isHover: false,
        };
        return _this;
    }
    Droppable.prototype.getChildContext = function () {
        return {
            droppableApi: {
                drop: this.state.iri,
            },
        };
    };
    Droppable.prototype.componentWillMount = function () {
        var children = this.props.children;
        if (typeof children === 'string') {
            throw Error("The child element couldn't be a text node");
        }
        if (!children) {
            throw Error("The child element doesn't exists");
        }
    };
    Droppable.prototype.isEventInsideRect = function (event, target) {
        var rect = target.getBoundingClientRect();
        var dists = [
            event.clientX - rect.left, rect.right - event.clientX,
            event.clientY - rect.top, rect.bottom - event.clientY,
        ];
        return dists[0] > 0 && dists[1] > 0 && dists[2] > 0 && dists[3] > 0;
    };
    Droppable.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (this.props.dropComponents && this.props.dropComponents.disabledHover) {
            if (!this.showDisabledHover(this.state) && this.showDisabledHover(nextState)) {
                this.refs.trigger.show();
            }
            else if (this.showDisabledHover(this.state) && !this.showDisabledHover(nextState)) {
                this.refs.trigger.hide();
            }
        }
        return true;
    };
    Droppable.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var dropStyles = this.props.dropStyles;
        var _a = this.state, isSourceDragged = _a.isSourceDragged, isDropEnabledKnown = _a.isDropEnabledKnown, isDropEnabled = _a.isDropEnabled, isHover = _a.isHover;
        var style = {};
        _.extend(style, child.props.style || {});
        if (isDropEnabledKnown && isSourceDragged && dropStyles) {
            var enabledStyle = dropStyles.enabled, enabledHoverStyle = dropStyles.enabledHover, disabledStyle = dropStyles.disabled, disabledHoverStyle = dropStyles.disabledHover;
            _.extend(style, isDropEnabled && enabledStyle ? enabledStyle : {});
            _.extend(style, isDropEnabled && isHover && enabledHoverStyle ? enabledHoverStyle : {});
            _.extend(style, !isDropEnabled && disabledStyle ? disabledStyle : {});
            _.extend(style, !isDropEnabled && isHover && disabledHoverStyle ? disabledHoverStyle : {});
        }
        var className = classNames(child.props.className, {
            'mp-droppable-enabled': isDropEnabledKnown && isSourceDragged && isDropEnabled,
            'mp-droppable-disabled': isDropEnabledKnown && isSourceDragged && !isDropEnabled,
            'mp-droppable-hover': isDropEnabledKnown && isSourceDragged && isHover,
        });
        var result = react_1.cloneElement(child, { ref: this.setHandlers, key: 'wrapped-component', className: className, style: style });
        if (this.props.dropComponents && this.props.dropComponents.disabledHover) {
            return OverlayTrigger({
                trigger: [],
                ref: 'trigger',
                placement: 'top',
                overlay: Popover({ id: 'help' }, react_1.cloneElement(this.props.dropComponents.disabledHover)),
                defaultOverlayShown: false,
            }, result);
        }
        else {
            return result;
        }
    };
    return Droppable;
}(react_1.Component));
Droppable.childContextTypes = DragAndDropApi_1.DroppableContextTypes;
exports.Droppable = Droppable;
