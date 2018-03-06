Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var dnd_1 = require("platform/components/dnd");
var SemanticNarrativeResource_1 = require("./SemanticNarrativeResource");
var ResourceComponent = (function (_super) {
    tslib_1.__extends(ResourceComponent, _super);
    function ResourceComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ResourceComponent.prototype.render = function () {
        var editorProps = this.context.editorProps;
        var _a = this.props, focused = _a.focused, state = _a.state, readOnly = _a.readOnly, onChange = _a.onChange;
        var resourceIri = this.props.state.resourceIri;
        if (resourceIri) {
            return React.createElement(SemanticNarrativeResource_1.SemanticNarrativeResource, { focused: focused, state: state, readOnly: readOnly, editorProps: editorProps, onChange: function (state) { onChange(state); } });
        }
        return (React.createElement(dnd_1.Droppable, { query: 'ASK {}', onDrop: function (resourceIri) {
                onChange({ resourceIri: resourceIri, selectedTemplateKey: undefined });
            } },
            React.createElement("div", { className: ResourceComponent.className, style: { width: '100%', height: '200px', border: '1px dashed green' } }, resourceIri ? resourceIri.toString() : 'Drag and drop to select a resource here')));
    };
    return ResourceComponent;
}(react_1.Component));
ResourceComponent.className = 'ory-resource-component';
ResourceComponent.contextTypes = {
    editorProps: react_1.PropTypes.any,
};
exports.ResourceComponent = ResourceComponent;
exports.ResourcePlugin = {
    Component: ResourceComponent,
    IconComponent: React.createElement("span", { className: 'fa fa-clipboard', "aria-hidden": 'true' }),
    name: 'metaphactory/content/resource',
    version: '1.0.0',
    text: 'Clipboard Resource',
    isInlineable: true,
};
exports.NativeResourcePlugin = function (hover, monitor, component) { return ({
    Component: ResourceComponent,
    name: 'metaphactory/content/resource',
    version: '1.0.0',
    text: 'Clipboard Resource',
    isInlineable: true,
    createInitialState: function () {
        var data = monitor.getItem() || {};
        var resourceIri = Array.isArray(data.urls) && data.urls.length > 0
            ? rdf_1.Rdf.iri(data.urls[0]) : undefined;
        return { resourceIri: resourceIri };
    }
}); };
