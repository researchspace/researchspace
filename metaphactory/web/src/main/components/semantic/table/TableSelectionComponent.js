Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var react_1 = require("react");
var SemanticTableSelectionComponent = (function (_super) {
    tslib_1.__extends(SemanticTableSelectionComponent, _super);
    function SemanticTableSelectionComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.toggleSelection = function () {
            _this.context.semanticTableEvents.toggleRowSelection(_this.context.semanticTableRowData);
        };
        return _this;
    }
    SemanticTableSelectionComponent.prototype.render = function () {
        var selected = this.context.semanticTableSelected.has(this.context.semanticTableRowData);
        return react_1.DOM.input(lodash_1.assign({
            type: 'checkbox',
            checked: selected,
            onChange: this.toggleSelection,
        }, this.props));
    };
    return SemanticTableSelectionComponent;
}(react_1.Component));
SemanticTableSelectionComponent.contextTypes = {
    semanticTableEvents: react_1.PropTypes.any.isRequired,
    semanticTableRowData: react_1.PropTypes.any.isRequired,
    semanticTableSelected: react_1.PropTypes.any.isRequired,
};
exports.default = SemanticTableSelectionComponent;
