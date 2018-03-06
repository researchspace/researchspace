Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var react_1 = require("react");
var Kefir = require("kefir");
var components_1 = require("platform/api/components");
var SelectionActionComponent_1 = require("platform/components/ui/selection/SelectionActionComponent");
var overlay_1 = require("platform/components/ui/overlay");
var OverlayDialog_1 = require("platform/components/ui/overlay/OverlayDialog");
var sparql_1 = require("platform/api/sparql");
var rdf_1 = require("platform/api/rdf");
exports.ACTION_DIALOG_REF = 'dialog-action';
var QUERY = "\n  SELECT DISTINCT $_iri WHERE {\n    $_iri a $_type.\n  }\n";
var TypedSelectionActionComponent = (function (_super) {
    tslib_1.__extends(TypedSelectionActionComponent, _super);
    function TypedSelectionActionComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.checkSelection = function (props) {
            if (!props.selection || _.isEmpty(props.selection) || !props.types) {
                return;
            }
            _this.executseCheck(props);
        };
        _this.executseCheck = function (props) {
            var iris = props.selection.map(function (iri) { return ({ _iri: rdf_1.Rdf.iri(iri) }); });
            var types = props.types.map(function (type) { return ({ _type: rdf_1.Rdf.iri(type) }); });
            sparql_1.SparqlClient
                .prepareQuery(QUERY, iris)
                .map(sparql_1.SparqlClient.prepareParsedQuery(types))
                .flatMap(function (query) { return Kefir.combine(props.repositories.map(function (repository) { return _this.executeCheckQuery(query, repository); })); })
                .map(_.flatten)
                .onValue(function (res) {
                var matches = _.intersectionWith(res, iris, function (b1, b2) { return b1['_iri'].equals(b2['_iri']); }).length === iris.length;
                _this.setState({ disabled: !matches });
            })
                .onError(function (err) {
                console.error(err);
            });
        };
        _this.executeCheckQuery = function (query, repository) {
            return sparql_1.SparqlClient.select(query, { context: { repository: repository } })
                .map(function (result) { return result.results.bindings; });
        };
        _this.onAction = function (selection) {
            overlay_1.getOverlaySystem().show(exports.ACTION_DIALOG_REF, _this.renderDialog(selection), _this.context);
        };
        _this.renderDialog = function (selection) {
            if (_this.props.renderDialog) {
                return React.createElement(OverlayDialog_1.OverlayDialog, { show: true, title: _this.props.title, type: 'lightbox', onHide: closeDialog }, _this.props.renderDialog(selection));
            }
            else if (_this.props.renderRawDialog) {
                var dialog = _this.props.renderRawDialog(selection);
                return react_1.cloneElement(dialog, { onHide: closeDialog });
            }
            else {
                console.error("SelectionActionComponent wasn't provided with dialog");
            }
        };
        _this.state = {
            disabled: false,
        };
        return _this;
    }
    TypedSelectionActionComponent.prototype.componentDidMount = function () {
        this.checkSelection(this.props);
    };
    TypedSelectionActionComponent.prototype.componentWillReceiveProps = function (nextProps) {
        if (!_.isEqual(nextProps.selection, this.props.selection)) {
            this.checkSelection(nextProps);
        }
    };
    TypedSelectionActionComponent.prototype.render = function () {
        var disabled = this.state.disabled ||
            this.props.isDisabled(this.props.selection);
        return React.createElement(SelectionActionComponent_1.default, { disabled: disabled, selection: this.props.selection, closeMenu: this.props.closeMenu, onAction: this.onAction, title: this.props.menuTitle });
    };
    return TypedSelectionActionComponent;
}(components_1.Component));
TypedSelectionActionComponent.defaultProps = {
    repositories: ['default'],
};
exports.default = TypedSelectionActionComponent;
function closeDialog() {
    overlay_1.getOverlaySystem().hide(exports.ACTION_DIALOG_REF);
}
exports.closeDialog = closeDialog;
