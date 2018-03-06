Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var bem = require("bem-cn");
var row = react_1.createFactory(react_bootstrap_1.Row);
var col = react_1.createFactory(react_bootstrap_1.Col);
exports.CLASS_NAME = 'field-editor';
var block = bem(exports.CLASS_NAME);
var FieldEditorRow = (function (_super) {
    tslib_1.__extends(FieldEditorRow, _super);
    function FieldEditorRow() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.toggle = function (_a) {
            var expand = _a.expand;
            if (_this.props.expanded === expand) {
                return;
            }
            if (expand && _this.props.onExpand) {
                _this.props.onExpand();
            }
            else if (!expand && _this.props.onCollapse) {
                _this.props.onCollapse();
            }
        };
        return _this;
    }
    FieldEditorRow.prototype.componentDidMount = function () {
        if (this.props.expandOnMount) {
            this.toggle({ expand: true });
        }
    };
    FieldEditorRow.prototype.componentWillReceiveProps = function (nextProps) {
        if (!this.props.expandOnMount && nextProps.expandOnMount) {
            this.toggle({ expand: true });
        }
    };
    FieldEditorRow.prototype.render = function () {
        var _this = this;
        var _a = this.props, onCollapse = _a.onCollapse, expanded = _a.expanded, label = _a.label, error = _a.error;
        var children = this.props.element || this.props.children;
        var canBeCollapsed = expanded && onCollapse;
        return row({ className: block('row').toString() }, col({ md: 3, onClick: function () { return _this.toggle({ expand: true }); } }, react_1.DOM.span({}, label)), col({ md: canBeCollapsed ? 8 : 9 }, row({}, expanded ? children : react_1.DOM.i({
            className: block('expand').toString(),
            onClick: function () { return _this.toggle({ expand: true }); },
        }, "Click to add an optional " + label + ".")), error
            ? row({ className: block('error').toString() }, error.message)
            : null), col({ md: 1, style: { display: canBeCollapsed ? undefined : 'none' } }, react_1.createElement(react_bootstrap_1.Button, {
            className: block('collapse').toString(),
            bsSize: 'sm',
            onClick: function () { return _this.toggle({ expand: false }); },
        }, react_1.DOM.span({ className: 'fa fa-times' }))));
    };
    return FieldEditorRow;
}(react_1.Component));
exports.FieldEditorRow = FieldEditorRow;
exports.default = react_1.createFactory(FieldEditorRow);
