Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var _ = require("lodash");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var ldp_1 = require("platform/api/services/ldp");
var navigation_1 = require("platform/api/navigation");
var notification_1 = require("platform/components/ui/notification");
var inputs_1 = require("platform/components/ui/inputs");
require("../../scss/share-component.scss");
var visibility = {
    public: rdf_1.vocabularies.VocabPlatform.publicVisibility.value,
    private: rdf_1.vocabularies.VocabPlatform.privateVisibility.value,
    shared: rdf_1.vocabularies.VocabPlatform.sharedVisibility.value,
    group: rdf_1.vocabularies.VocabPlatform.groupVisibility.value,
};
var DEFAULT_GROUPS_QUERY = "\n  SELECT ?value ?label {\n    ?value a Platform:Group .\n    ?value rdfs:label ?label .\n  }\n";
var ShareComponent = (function (_super) {
    tslib_1.__extends(ShareComponent, _super);
    function ShareComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderGroupSelector = function () {
            return React.createElement(inputs_1.AutoCompletionInput, { className: 'visibility-group-selector', placeholder: 'select groups', value: _this.state.groups, query: DEFAULT_GROUPS_QUERY, defaultQuery: DEFAULT_GROUPS_QUERY, actions: { onSelected: _this.onGroupsSelected }, multi: true });
        };
        _this.isSelected = function (s) { return _this.state.visibility === s; };
        _this.onClick = function (evt) {
            var value = evt.target['value'];
            var stream = ldp_1.LdpService.setVisibility(navigation_1.getCurrentResource(), rdf_1.Rdf.iri(value), []);
            stream.onValue(function (r) {
                _this.setState({ visibility: value, groups: [] });
                _this.notifyVisibilityChange();
            });
            stream.onError(function (error) {
                _this.setState({ errorMessage: maybe.Just('error'), visibility: visibility.private });
            });
        };
        _this.selectGroups = function (iriString) {
            return sparql_1.SparqlClient.select("\n      SELECT ?value ?label WHERE {\n         <" + iriString + "> <" + rdf_1.vocabularies.VocabPlatform.visibleToGroups.value + "> ?value .\n         ?value rdfs:label ?label .\n      }\n    ").onValue(function (res) { return _this.setState({ groups: res.results.bindings }); });
        };
        _this.onGroupsSelected = function (bindings) {
            var groups = _.map(bindings, function (binding) { return binding.value; });
            var stream = ldp_1.LdpService.setVisibility(navigation_1.getCurrentResource(), rdf_1.Rdf.iri(_this.state.visibility), groups);
            stream.onValue(function (r) {
                _this.setState({ groups: bindings });
                _this.notifyVisibilityChange();
            });
        };
        _this.notifyVisibilityChange = function () {
            return notification_1.addNotification({
                message: 'Visibility of item has been changed',
                level: 'success',
                autoDismiss: 2,
            });
        };
        _this.state = {
            visibility: visibility.private,
            errorMessage: maybe.Nothing(),
            groups: [],
        };
        return _this;
    }
    ShareComponent.prototype.componentDidMount = function () {
        var _this = this;
        var iriString = this.props.iri || navigation_1.getCurrentResource().value;
        var query = sparql_1.SparqlClient.select("SELECT ?visibility WHERE {\n         OPTIONAL { <" + iriString + "> <" + rdf_1.vocabularies.VocabPlatform.visibility.value + "> ?vis }\n         BIND(COALESCE(?vis, <" + rdf_1.vocabularies.VocabPlatform.privateVisibility.value + ">) as ?visibility).\n      }");
        query
            .onValue(function (res) {
            var vis = res.results.bindings[0].visibility.value;
            _this.setState({ visibility: vis });
            if (vis === visibility.group) {
                _this.selectGroups(iriString);
            }
        })
            .onError(function (error) { return _this.setState({ visibility: visibility.private, errorMessage: maybe.Just(error) }); });
    };
    ShareComponent.prototype.render = function () {
        var _this = this;
        return React.createElement("div", { className: 'share-component' },
            React.createElement("fieldset", { id: 'visibility-input' }, _.keys(visibility).map(function (v) {
                return React.createElement("div", { className: 'radio' },
                    React.createElement("label", { className: 'control-label', key: 'visibility' + v },
                        React.createElement("input", { type: 'radio', name: 'visibility', value: visibility[v], onClick: _this.onClick, checked: _this.isSelected(visibility[v]) }),
                        _.upperFirst(v)),
                    visibility[v] === visibility.group && _this.isSelected(visibility.group) ? _this.renderGroupSelector() : null);
            })));
    };
    return ShareComponent;
}(react_1.Component));
exports.ShareComponent = ShareComponent;
exports.default = ShareComponent;
