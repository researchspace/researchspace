Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var navigation_1 = require("platform/api/navigation");
var components_1 = require("platform/api/components");
var inputs_1 = require("platform/components/ui/inputs");
require("./SimpleSearch.scss");
var SimpleSearch = (function (_super) {
    tslib_1.__extends(SimpleSearch, _super);
    function SimpleSearch(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderAutosuggestion = function () {
            var _a = _this.backwardCompatibleProps(_this.props), minSearchTermLength = _a.minSearchTermLength, resourceBindingName = _a.resourceBindingName, query = _a.query, placeholder = _a.placeholder, searchTermVariable = _a.searchTermVariable;
            var autoSuggestionProps = {
                placeholder: placeholder,
                query: query,
                minimumInput: minSearchTermLength,
                valueBindingName: resourceBindingName,
                searchTermVariable: searchTermVariable,
                actions: {
                    onSelected: function (value) {
                        navigation_1.navigateToResource(value[resourceBindingName]).onValue(function (x) { return x; });
                    },
                },
                templates: {
                    suggestion: _this.props.template,
                },
            };
            return react_1.createElement(inputs_1.AutoCompletionInput, _.omitBy(autoSuggestionProps, _.isUndefined));
        };
        return _this;
    }
    SimpleSearch.prototype.render = function () {
        return react_1.DOM.div({
            className: 'search-widget',
        }, this.renderAutosuggestion());
    };
    SimpleSearch.prototype.backwardCompatibleProps = function (props) {
        if (props.inputPlaceholder) {
            props.placeholder = props.inputPlaceholder;
        }
        if (props.resourceSelection) {
            props.resourceBindingName = props.resourceSelection.resourceBindingName;
            props.template = props.resourceSelection.template;
        }
        return props;
    };
    return SimpleSearch;
}(components_1.Component));
SimpleSearch.defaultProps = {
    placeholder: 'type to search, minimum 3 symbols ...',
    searchTermVariable: '__token__',
    minSearchTermLength: 3,
    resourceBindingName: 'resource',
    template: '<mp-label iri="{{resource.value}}"></mp-label>'
};
exports.SimpleSearch = SimpleSearch;
exports.default = SimpleSearch;
