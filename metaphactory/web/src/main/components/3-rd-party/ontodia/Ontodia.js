Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var ontodia_1 = require("ontodia");
var async_1 = require("platform/api/async");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var config_holder_1 = require("platform/api/services/config-holder");
var ldp_1 = require("platform/components/ldp");
var ldp_set_1 = require("platform/api/services/ldp-set");
var overlay_1 = require("platform/components/ui/overlay");
var notification_1 = require("platform/components/ui/notification");
var ontodia_data_1 = require("./ontodia-data");
var ontodia_configs_1 = require("./ontodia-configs");
require("jointjs/css/layout.css");
require("jointjs/css/themes/default.css");
require("intro.js/introjs.css");
var components_1 = require("platform/api/components");
var ENDPOINT_URL = '/sparql';
var Ontodia = (function (_super) {
    tslib_1.__extends(Ontodia, _super);
    function Ontodia(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.initWorkspace = function (workspace) {
            if (workspace) {
                var _a = _this.props, imageQuery_1 = _a.imageQuery, imageIris = _a.imageIris;
                _this.workspace = workspace;
                var config = ontodia_configs_1.getConfig(_this.props.settings, _this.props.providerSettings);
                config.customizeWorkspace(workspace);
                _this.dataProvider = config.getDataProvider({
                    endpointUrl: ENDPOINT_URL,
                    prepareImages: !imageQuery_1 ? undefined : function (elementsInfo) {
                        return ontodia_data_1.prepareImages(elementsInfo, imageQuery_1);
                    },
                    imagePropertyUris: imageIris,
                    queryMethod: ontodia_1.SparqlQueryMethod.POST,
                    acceptBlankNodes: true,
                });
                workspace.getModel().graph.on('action:iriClick', function (url) {
                    navigation_1.navigateToResource(rdf_1.Rdf.iri(url)).onValue(function () { });
                });
                _this.cancellation.map(Kefir.combine([
                    Kefir.fromPromise(_this.setLayout()),
                    _this.parsedMetadata,
                ])).observe({
                    error: function (configurationError) { return _this.setState({ configurationError: configurationError }); },
                });
            }
        };
        _this.onSaveDiagramPressed = function () {
            var diagramIri = _this.props.diagram;
            if (diagramIri) {
                var layout_1 = _this.workspace.getModel().exportLayout();
                var label_1 = _this.state.label;
                var context_1 = _this.context.semanticContext;
                _this.cancellation.map(_this.parsedMetadata.flatMap(function (metadata) {
                    return ontodia_data_1.updateDiagram(diagramIri, layout_1, label_1, metadata, context_1);
                })).observe({
                    value: function () { return notification_1.addNotification({
                        level: 'success',
                        message: "Saved diagram " + label_1,
                    }); },
                    error: function (error) { return notification_1.addNotification({
                        level: 'error',
                        message: "Error saving diagram " + label_1,
                    }, error); }
                });
            }
            else {
                _this.openSaveModal();
            }
        };
        _this.importModelLayout = function (layout) {
            var model = _this.workspace.getModel(), params = layout || {};
            return model.importLayout({
                dataProvider: _this.dataProvider,
                preloadedElements: params.preloadedElements || {},
                layoutData: params.layoutData,
                linkSettings: params.linkSettings,
            });
        };
        _this.openSaveModal = function () {
            var dialogRef = 'create-new-resource';
            var layout = _this.workspace.getModel().exportLayout();
            overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(ldp_1.CreateResourceDialog, {
                onSave: function (label) { return _this.onSaveModalSubmit(label, layout); },
                onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                show: true,
                title: 'Save Ontodia diagram',
                placeholder: 'Enter diagram name',
            }));
        };
        _this.state = {};
        _this.parsedMetadata = _this.parseMetadata();
        return _this;
    }
    Ontodia.prototype.render = function () {
        if (this.state.configurationError) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.configurationError });
        }
        var readonly = this.props.readonly;
        var props = {
            ref: this.initWorkspace,
            onSaveDiagram: readonly ? undefined : this.onSaveDiagramPressed,
            leftPanelInitiallyOpen: readonly ? false : undefined,
            rightPanelInitiallyOpen: readonly ? false : undefined,
            languages: [
                { code: 'en', label: 'English' },
                { code: 'de', label: 'German' },
                { code: 'ru', label: 'Russian' },
            ],
        };
        return react_1.createElement(ontodia_1.Workspace, props);
    };
    Ontodia.prototype.parseMetadata = function () {
        var metadata = this.props.metadata;
        if (metadata) {
            return this.cancellation.map(rdf_1.turtle.deserialize.turtleToTriples(this.props.metadata)
                .mapErrors(function (error) { return new async_1.WrappingError("Invalid metadata format", error); }));
        }
        else {
            return Kefir.constant([]);
        }
    };
    Ontodia.prototype.setLayout = function () {
        var _a = this.props, diagram = _a.diagram, query = _a.query, iri = _a.iri;
        if (diagram) {
            return this.setLayoutByDiagram(diagram);
        }
        else if (query) {
            return this.setLayoutBySparqlQuery(query);
        }
        else if (iri) {
            return this.setLayoutByIri(iri);
        }
        else {
            return this.importModelLayout();
        }
    };
    Ontodia.prototype.setLayoutBySparqlQuery = function (query) {
        var _this = this;
        var loadingLayout = ontodia_data_1.getRDFGraphBySparqlQuery(query).then(function (graph) {
            var layoutProvider = new ontodia_1.SparqlGraphBuilder(_this.dataProvider);
            return layoutProvider.getGraphFromRDFGraph(graph);
        });
        this.workspace.showWaitIndicatorWhile(loadingLayout);
        return loadingLayout.then(function (res) {
            return _this.importModelLayout({
                preloadedElements: res.preloadedElements,
                layoutData: res.layoutData,
            });
        }).then(function () {
            _this.workspace.forceLayout();
            _this.workspace.zoomToFit();
        });
    };
    Ontodia.prototype.setLayoutByDiagram = function (diagram) {
        var _this = this;
        var loadingLayout = ontodia_data_1.getLayoutByDiagram(diagram, this.context.semanticContext);
        this.workspace.showWaitIndicatorWhile(loadingLayout);
        return loadingLayout.then(function (res) {
            _this.setState({ label: res.label });
            return _this.importModelLayout({
                layoutData: res.layoutData,
                linkSettings: res.linkSettings,
            });
        });
    };
    Ontodia.prototype.setLayoutByIri = function (iri) {
        var _this = this;
        var layoutProvider = new ontodia_1.GraphBuilder(this.dataProvider);
        var buildingGraph = layoutProvider.createGraph({ elementIds: [iri], links: [] });
        this.workspace.showWaitIndicatorWhile(buildingGraph);
        return buildingGraph.then(function (res) { return _this.importModelLayout({
            preloadedElements: res.preloadedElements,
            layoutData: res.layoutData,
        }).then(function () {
            _this.workspace.forceLayout();
            _this.workspace.zoomToFit();
        }); });
    };
    Ontodia.prototype.onSaveModalSubmit = function (label, layout) {
        var _this = this;
        this.setState({ label: label });
        var context = this.context.semanticContext;
        return this.cancellation.map(this.parsedMetadata.flatMap(function (metadata) {
            return ontodia_data_1.saveDiagram(label, layout, metadata, context);
        })).flatMap(function (res) { return _this.props.addToDefaultSet ? ldp_set_1.addToDefaultSet(res, _this.props.id) : Kefir.constant(res); }).flatMap(function (diagramIri) {
            return navigation_1.navigateToResource(rdf_1.Rdf.iri(_this.props.navigateTo), { diagram: diagramIri.value });
        }).mapErrors(function (error) {
            notification_1.addNotification({ level: 'error', message: "Error saving diagram " + label }, error);
            return error;
        }).toProperty();
    };
    return Ontodia;
}(components_1.Component));
Ontodia.preferredThumbnails = config_holder_1.ConfigHolder.getUIConfig().preferredThumbnails.value.map(function (iri) { return rdf_1.Rdf.fullIri(iri).value; });
Ontodia.defaultProps = {
    navigateTo: 'http://www.metaphacts.com/resource/assets/OntodiaView',
    addToDefaultSet: false,
    imageIris: Ontodia.preferredThumbnails,
};
exports.Ontodia = Ontodia;
exports.default = Ontodia;
